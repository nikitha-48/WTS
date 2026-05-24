# files/views.py
import os

from django.conf import settings
from django.core.files.storage import default_storage
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework import serializers as drf_serializers
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import cloudinary
import cloudinary.uploader

from .models import File
from .serializers import FileSerializer


# ── Cloudinary helpers ────────────────────────────────────────────────────
PLACEHOLDER_CLOUDINARY_VALUES = {
    "", None, "your_cloudinary_name", "your_api_key", "your_api_secret"
}


def _cloudinary_configured() -> bool:
    """Returns True only if real Cloudinary credentials are present."""
    cfg = cloudinary.config()
    return (
        getattr(cfg, "cloud_name", None) not in PLACEHOLDER_CLOUDINARY_VALUES
        and getattr(cfg, "api_key", None) not in PLACEHOLDER_CLOUDINARY_VALUES
        and getattr(cfg, "api_secret", None) not in PLACEHOLDER_CLOUDINARY_VALUES
    )


def _store_uploaded_file(uploaded):
    """
    Store an InMemoryUploadedFile / TemporaryUploadedFile.

    Returns a dict with: url, cloudinary_id, file_name, mime_type, size.
    Uses Cloudinary when configured, otherwise falls back to MEDIA_ROOT.
    """
    if _cloudinary_configured():
        result = cloudinary.uploader.upload(
            uploaded,
            folder="employee-files",
            resource_type="auto",
        )
        return {
            "url": result.get("secure_url") or result.get("url") or "",
            "cloudinary_id": result.get("public_id") or "",
            "file_name": result.get("original_filename") or uploaded.name,
            "mime_type": uploaded.content_type or "",
            "size": uploaded.size or 0,
        }

    # Local fallback — write to MEDIA_ROOT/employee-files/<name>
    rel_path = default_storage.save(
        os.path.join("employee-files", uploaded.name), uploaded
    )
    media_url = settings.MEDIA_URL.rstrip("/") + "/" + rel_path.replace("\\", "/")
    return {
        "url": media_url,
        "cloudinary_id": f"local::{rel_path}",
        "file_name": os.path.basename(rel_path),
        "mime_type": uploaded.content_type or "",
        "size": uploaded.size or 0,
    }


# ── WebSocket broadcast helpers ───────────────────────────────────────────
def _group_send(event: dict):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)("files_group", event)


def notify_new_file(file_instance: File):
    _group_send(
        {
            "type": "file_notification",
            "message": f"New file: {file_instance.original_name}",
            "file": _file_to_payload(file_instance),
        }
    )


def notify_file_status_update(file_instance: File):
    _group_send(
        {
            "type": "file_status_update",
            "fileId": str(file_instance.id),
            "status": file_instance.status,
            "adminNote": getattr(file_instance, "admin_note", "") or "",
        }
    )


def _file_to_payload(file_instance: File) -> dict:
    user = getattr(file_instance, "user", None)
    full_name = ""
    if user is not None:
        full_name = (
            f"{user.first_name or ''} {user.last_name or ''}".strip()
            or user.username
        )
    return {
        "id": str(file_instance.id),
        "originalName": file_instance.original_name,
        "description": file_instance.description or "",
        "size": file_instance.size,
        "mimeType": file_instance.mime_type,
        "url": file_instance.url,
        "status": file_instance.status,
        "adminNote": file_instance.admin_note or "",
        "userName": full_name,
        "userEmail": getattr(user, "email", "") if user is not None else "",
        "userId": getattr(user, "id", None) if user is not None else None,
        "createdAt": file_instance.created_at.isoformat()
        if getattr(file_instance, "created_at", None)
        else None,
    }


# ── ViewSet ───────────────────────────────────────────────────────────────
class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.select_related("user").all().order_by("-created_at")
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        upload = self.request.FILES.get("file")
        if upload is None:
            raise drf_serializers.ValidationError({"file": "A file is required."})

        stored = _store_uploaded_file(upload)
        original_name = self.request.data.get("original_name") or upload.name

        file_instance = serializer.save(
            user=self.request.user,
            original_name=original_name,
            file_name=stored["file_name"],
            mime_type=stored["mime_type"],
            size=stored["size"],
            url=stored["url"],
            cloudinary_id=stored["cloudinary_id"],
        )
        notify_new_file(file_instance)

    def perform_update(self, serializer):
        file_instance = serializer.save()
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
        if hasattr(file_instance, "reviewed_by"):
            file_instance.reviewed_by = request.user
        if hasattr(file_instance, "reviewed_at"):
            from django.utils import timezone
            file_instance.reviewed_at = timezone.now()

        file_instance.save()

        notify_file_status_update(file_instance)
        return Response(FileSerializer(file_instance).data, status=status.HTTP_200_OK)
