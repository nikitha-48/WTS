import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils.text import slugify
from tasks.models import Task

class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_email = self.scope['user'].email if self.scope['user'].is_authenticated else None
        # Convert email to valid group name: user@example.com → user-examplecom
        self.user_slug = slugify(self.user_email) if self.user_email else 'anonymous'
        self.room_group_name = f'tasks_{self.user_slug}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"✅ User {self.user_email} connected to {self.room_group_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"❌ User {self.user_email} disconnected")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'get_my_tasks':
                tasks = await self.get_user_tasks()
                await self.send(text_data=json.dumps({
                    'type': 'task_list',
                    'tasks': tasks
                }))

            elif action == 'task_assigned':
                assigned_email = data.get("assignedToEmail")
                assigned_slug = slugify(assigned_email)  # Convert to valid group name
                
                await self.channel_layer.group_send(
                    f'tasks_{assigned_slug}',
                    {
                        'type': 'task_notification',
                        'message': f"New task assigned: {data.get('title')}",
                        'task': data
                    }
                )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def task_notification(self, event):
        """Send task notification to specific user"""
        await self.send(text_data=json.dumps({
            'type': 'task_notification',
            'message': event['message'],
            'task': event.get('task')
        }))

    async def task_status_update(self, event):
        """Broadcast task status update"""
        await self.send(text_data=json.dumps({
            'type': 'task_status_update',
            'taskId': event['taskId'],
            'status': event['status']
        }))

    @sync_to_async
    def get_user_tasks(self):
        tasks = Task.objects.filter(
            assigned_to_email=self.user_email
        ).values(
            'id', 'title', 'description', 'status', 'dueDate', 'created_at'
        )
        return list(tasks)