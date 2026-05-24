from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.text import slugify

from accounts.models import CustomUser
from .models import Task
from .serializers import TaskSerializer


def _task_payload(task: Task) -> dict:
    return {
        'id': str(task.id),
        'title': task.title,
        'description': task.description or '',
        'assignedToEmail': task.assigned_to_email,
        'status': task.status,
        'adminFile': task.admin_file.url if getattr(task, 'admin_file', None) else None,
        'dueDate': task.due_date.isoformat() if task.due_date else None,
        'createdAt': task.created_at.isoformat() if task.created_at else None,
    }


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by("-created_at")
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        """Set assigned_by_user from request, resolve assigned_to_user by email."""
        assigned_email = (serializer.validated_data.get("assigned_to_email") or "").strip().lower()

        assigned_to_user = None
        if assigned_email:
            assigned_to_user = CustomUser.objects.filter(email__iexact=assigned_email).first()

        task = serializer.save(
            assigned_by_user=self.request.user,
            assigned_to_user=assigned_to_user,
        )

        assigned_slug = slugify(assigned_email) if assigned_email else "anonymous"
        async_to_sync(get_channel_layer().group_send)(
            f'tasks_{assigned_slug}',
            {
                'type': 'task_notification',
                'message': f"New task: {task.title}",
                'task': _task_payload(task),
            }
        )

    @action(detail=True, methods=["patch"], url_path="update_status")
    def update_status(self, request, pk=None):
        """
        PATCH /tasks/{id}/update_status/
        Body: { "status": "in_progress" | "done" | "pending" }
        """
        task = self.get_object()
        new_status = request.data.get("status")

        if not new_status:
            return Response({"detail": "status is required"}, status=400)

        task.status = new_status
        if new_status == "done":
            from django.utils import timezone
            task.completed_at = timezone.now()
        task.save()

        assigned_slug = slugify(task.assigned_to_email) if task.assigned_to_email else "anonymous"
        async_to_sync(get_channel_layer().group_send)(
            f'tasks_{assigned_slug}',
            {
                'type': 'task_status_update',
                'taskId': str(task.id),
                'status': task.status,
            }
        )

        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)
