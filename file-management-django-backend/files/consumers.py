# files/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

from files.models import File


class FileConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = "files_group"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()
        print("✅ Client connected to files WebSocket")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)
        print("❌ Client disconnected from files WebSocket")

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "get_files":
                files = await self.get_all_files()
                await self.send(
                    text_data=json.dumps(
                        {"type": "file_list", "files": files}
                    )
                )
                return

            if action == "file_uploaded":
                await self.channel_layer.group_send(
                    self.GROUP_NAME,
                    {
                        "type": "file_notification",
                        "message": f"New file uploaded: {data.get('fileName')}",
                        "file": data,
                    },
                )
                return

            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": f"Unknown action: {action}"}
                )
            )

        except Exception as e:
            await self.send(text_data=json.dumps({"type": "error", "message": str(e)}))

    async def file_notification(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "file_notification",
                    "message": event.get("message", ""),
                    "file": event.get("file"),
                }
            )
        )

    async def file_status_update(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "file_status_update",
                    "fileId": event.get("fileId"),
                    "status": event.get("status"),
                    "adminNote": event.get("adminNote", "") or "",
                }
            )
        )

    @sync_to_async
    def get_all_files(self):
        qs = (
            File.objects.select_related("user")
            .all()
            .order_by("-created_at")
        )

        result = []
        for f in qs:
            user = getattr(f, "user", None)
            full_name = ""
            if user is not None:
                full_name = (
                    f"{user.first_name or ''} {user.last_name or ''}".strip()
                    or user.username
                )
            result.append(
                {
                    "id": str(f.id),
                    "originalName": f.original_name,
                    "size": f.size,
                    "mimeType": f.mime_type,
                    "url": f.url,
                    "status": f.status,
                    "userName": full_name,
                    "userEmail": getattr(user, "email", "") if user is not None else "",
                    "userId": getattr(user, "id", None) if user is not None else None,
                    "createdAt": f.created_at.isoformat() if f.created_at else None,
                    "description": f.description or "",
                    "adminNote": f.admin_note or "",
                }
            )
        return result
