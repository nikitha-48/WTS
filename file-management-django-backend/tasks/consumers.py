import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils.text import slugify
from tasks.models import Task


class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        self.user_email = user.email if user and user.is_authenticated else None
        self.user_slug = slugify(self.user_email) if self.user_email else 'anonymous'
        self.room_group_name = f'tasks_{self.user_slug}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"✅ User {self.user_email} connected to {self.room_group_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"❌ User {self.user_email} disconnected")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'get_my_tasks':
                tasks = await self.get_user_tasks()
                await self.send(text_data=json.dumps({
                    'type': 'task_list',
                    'tasks': tasks,
                }))

            elif action == 'task_assigned':
                assigned_email = data.get("assignedToEmail") or ""
                assigned_slug = slugify(assigned_email)
                await self.channel_layer.group_send(
                    f'tasks_{assigned_slug}',
                    {
                        'type': 'task_notification',
                        'message': f"New task assigned: {data.get('title')}",
                        'task': data,
                    }
                )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e),
            }))

    async def task_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'task_notification',
            'message': event['message'],
            'task': event.get('task'),
        }))

    async def task_status_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'task_status_update',
            'taskId': event['taskId'],
            'status': event['status'],
        }))

    @sync_to_async
    def get_user_tasks(self):
        if not self.user_email:
            return []
        tasks = Task.objects.filter(
            assigned_to_email=self.user_email,
        ).order_by('-created_at')
        return [
            {
                'id': str(t.id),
                'title': t.title,
                'description': t.description or '',
                'status': t.status,
                'assignedToEmail': t.assigned_to_email,
                'adminFile': t.admin_file.url if getattr(t, 'admin_file', None) else None,
                'dueDate': t.due_date.isoformat() if t.due_date else None,
                'createdAt': t.created_at.isoformat() if t.created_at else None,
            }
            for t in tasks
        ]
