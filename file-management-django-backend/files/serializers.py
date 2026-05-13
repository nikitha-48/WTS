from rest_framework import serializers
from files.models import File
from accounts.serializers import UserSerializer

class FileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reviewer = UserSerializer(read_only=True, source='reviewed_by')
    
    class Meta:
        model = File
        fields = [
            'id', 'original_name', 'file_name', 'mime_type', 'size', 'url',
            'cloudinary_id', 'description', 'user', 'status', 'admin_note',
            'reviewed_at', 'reviewer', 'shared', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_name', 'cloudinary_id', 'url', 'created_at', 'updated_at']