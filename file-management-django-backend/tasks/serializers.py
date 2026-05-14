from rest_framework import serializers
from tasks.models import Task
from accounts.serializers import UserSerializer

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_user = UserSerializer(read_only=True)
    assigned_by_user = UserSerializer(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assigned_to_email', 'assigned_to_user',
            'assigned_by_user', 'status', 'admin_file', 'due_date', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'assigned_to_user', 'assigned_by_user', 'created_at', 'updated_at']