import uuid
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from accounts.models import CustomUser


# ── Helpers ──────────────────────────────────────────────────────────────
def _split_name(name: str):
    name = (name or '').strip()
    if not name:
        return '', ''
    parts = name.split(maxsplit=1)
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], parts[1]


def _username_from_email(email: str) -> str:
    base = (email or '').split('@', 1)[0].strip().lower() or 'user'
    candidate = base
    while CustomUser.objects.filter(username=candidate).exists():
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
    return candidate


# ── Serializers ──────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    """Public user shape consumed by the frontend dashboards."""

    name = serializers.SerializerMethodField()
    isApproved = serializers.BooleanField(source='is_approved', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name', 'name',
            'role', 'department', 'profile_picture',
            'isActive', 'isApproved',
            'createdAt',
        ]
        read_only_fields = ['id', 'username', 'createdAt']

    def get_name(self, obj):
        full = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return full or obj.username


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Accepts a single 'name' field plus an email/password from the UI."""

    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        validators=[validate_password],
    )

    class Meta:
        model = CustomUser
        fields = ['email', 'name', 'password', 'department']

    def validate_email(self, value):
        normalized_email = (value or '').strip().lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Email already exists.")
        if not normalized_email.endswith('@sskatt.com'):
            raise serializers.ValidationError("Only company emails (@sskatt.com) are allowed.")
        return normalized_email

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        first, last = _split_name(name)
        email = validated_data['email']

        # Employees start inactive and unapproved — admin must approve them.
        user = CustomUser.objects.create_user(  # type: ignore[call-arg]
            username=_username_from_email(email),
            email=email,
            first_name=first,
            last_name=last,
            password=validated_data['password'],
            role='employee',
            department=validated_data.get('department', 'General') or 'General',
            is_active=False,
            is_approved=False,
        )
        return user


class AdminRegistrationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        validators=[validate_password],
    )

    class Meta:
        model = CustomUser
        fields = ['email', 'name', 'password', 'department']

    def validate_email(self, value):
        normalized_email = (value or '').strip().lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Email already exists.")
        if not normalized_email.endswith('@sskatt.com'):
            raise serializers.ValidationError("Only company emails (@sskatt.com) are allowed.")
        return normalized_email

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        first, last = _split_name(name)
        email = validated_data['email']

        user = CustomUser.objects.create_user(  # type: ignore[call-arg]
            username=_username_from_email(email),
            email=email,
            first_name=first,
            last_name=last,
            password=validated_data['password'],
            role='admin',
            department=validated_data.get('department', 'General') or 'General',
            is_staff=True,
            is_superuser=True,
            is_active=True,
            is_approved=True,
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
