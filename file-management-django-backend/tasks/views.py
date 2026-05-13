from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.text import slugify

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by("-created_at")
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Called after validation, before saving"""
        task = serializer.save()
        
        # Convert email to valid group name
        assigned_email = serializer.validated_data.get("assigned_to_email")
        assigned_slug = slugify(assigned_email)
        
        # Send notification after creating task
        async_to_sync(get_channel_layer().group_send)(
            f'tasks_{assigned_slug}',
            {
                'type': 'task_notification',
                'message': f"New task: {serializer.validated_data['title']}",
                'task': {
                    'id': str(task.id),
                    'title': task.title,
                    'assignedToEmail': task.assigned_to_email,
                    'status': task.status,
                    'createdAt': task.created_at.isoformat()
                }
            }
        )

    @action(detail=True, methods=["patch"], url_path="update_status")
    def update_status(self, request, pk=None):
        """
        PATCH /tasks/{id}/update_status/
        Body: { "status": "completed" }
        """
        task = self.get_object()
        new_status = request.data.get("status")

        if not new_status:
            return Response({"detail": "status is required"}, status=400)

        task.status = new_status
        task.save()

        # Convert email to valid group name
        assigned_slug = slugify(task.assigned_to_email)

        # Send notification after updating status
        async_to_sync(get_channel_layer().group_send)(
            f'tasks_{assigned_slug}',
            {
                'type': 'task_status_update',
                'taskId': str(task.id),
                'status': task.status
            }
        )

        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)