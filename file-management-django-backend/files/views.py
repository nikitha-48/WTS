# files/views.py
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import File
from .serializers import FileSerializer


def _group_send(event: dict):
    """
    Safe group_send: if channel layer isn't available it won't crash.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)("files_group", event)


def notify_new_file(file_instance: File):
    _group_send(
        {
            "type": "file_notification",  # calls file_notification() in consumer
            "message": f"New file: {file_instance.original_name}",
            "file": {
                "id": str(file_instance.id),
                "originalName": file_instance.original_name,
                "status": file_instance.status,
                "userName": getattr(file_instance.user, "first_name", ""),
                "userEmail": getattr(file_instance.user, "email", ""),
                "createdAt": file_instance.created_at.isoformat()
                if getattr(file_instance, "created_at", None)
                else None,
                "description": getattr(file_instance, "description", ""),
            },
        }
    )


def notify_file_status_update(file_instance: File):
    _group_send(
        {
            "type": "file_status_update",  # calls file_status_update() in consumer
            "fileId": str(file_instance.id),
            "status": file_instance.status,
            "adminNote": getattr(file_instance, "admin_note", "") or "",
        }
    )


class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.select_related("user").all().order_by("-created_at")
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        file_instance = serializer.save(user=self.request.user)
        notify_new_file(file_instance)

    def perform_update(self, serializer):
        file_instance = serializer.save()
        # Optional: broadcast full file update
        notify_new_file(file_instance)

    @action(detail=True, methods=["patch"], url_path="update_status")
    def update_status(self, request, pk=None):
        """
        PATCH /files/{id}/update_status/
        Body: { "status": "approved", "adminNote": "..." }
        """
        file_instance = self.get_object()
        new_status = request.data.get("status")
        admin_note = request.data.get("adminNote", None)

        if not new_status:
            return Response({"detail": "status is required"}, status=400)

        file_instance.status = new_status
        if admin_note is not None and hasattr(file_instance, "admin_note"):
            file_instance.admin_note = admin_note

        file_instance.save()

        notify_file_status_update(file_instance)
        return Response(FileSerializer(file_instance).data, status=status.HTTP_200_OK)