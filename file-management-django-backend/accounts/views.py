from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import authenticate
from accounts.models import CustomUser
from accounts.serializers import (
    UserSerializer, UserRegistrationSerializer,
    AdminRegistrationSerializer, UserLoginSerializer
)
from accounts.utils import create_jwt_token


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get only employee users (all statuses)"""
        return CustomUser.objects.filter(role='employee')

    # ── Register ────────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Register a new employee — account starts inactive until admin approves."""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    'message': (
                        'Registration successful! Your account is pending admin approval. '
                        'You will be able to log in once an admin activates your account.'
                    ),
                    'status': 'pending_approval',
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Login ────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """Login user — blocked if account is pending approval."""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user_obj = CustomUser.objects.get(email=serializer.validated_data['email'])
            except CustomUser.DoesNotExist:
                return Response(
                    {'message': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Check approval before attempting password auth
            if not user_obj.is_approved:
                return Response(
                    {
                        'message': 'Your account is pending admin approval. '
                                   'Please wait until an admin activates your account.',
                        'status': 'pending_approval',
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            user = authenticate(
                username=user_obj.username,
                password=serializer.validated_data['password'],
            )
            if user and user.is_active:
                token = create_jwt_token(user)
                return Response(
                    {
                        'message': 'Login successful',
                        'token': token,
                        'user': UserSerializer(user).data,
                    },
                    status=status.HTTP_200_OK,
                )
            elif user and not user.is_active:
                return Response(
                    {'message': 'User account has been deactivated. Contact your admin.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            return Response(
                {'message': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Me ───────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current logged-in user info"""
        return Response(UserSerializer(request.user).data)

    # ── Admin: approve a pending user ────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def approve_user(self, request, pk=None):
        """Admin approves a pending employee — sets is_approved + is_active to True."""
        user = self.get_object()
        if user.role != 'employee':
            return Response(
                {'message': 'Only employee accounts can be approved'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_approved = True
        user.is_active = True
        user.save()
        return Response(
            {
                'message': f'User {user.username} ({user.email}) has been approved.',
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    # ── Admin: deactivate a user ─────────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def deactivate_user(self, request, pk=None):
        """Admin deactivates a user (they can no longer log in)."""
        user = self.get_object()
        user.is_active = False
        user.is_approved = False
        user.save()
        return Response(
            {'message': f'User {user.username} deactivated'},
            status=status.HTTP_200_OK,
        )

    # ── Admin: reactivate a user ─────────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def activate_user(self, request, pk=None):
        """Admin reactivates a previously deactivated user."""
        user = self.get_object()
        user.is_active = True
        user.is_approved = True
        user.save()
        return Response(
            {'message': f'User {user.username} reactivated'},
            status=status.HTTP_200_OK,
        )

    # ── Admin: delete a user ─────────────────────────────────────────────────
    @action(detail=True, methods=['delete'], permission_classes=[IsAdminUser])
    def delete_user(self, request, pk=None):
        """Admin deletes an employee user permanently."""
        user = self.get_object()
        if user.role != 'employee':
            return Response(
                {'message': 'Can only delete employee users'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username, email = user.username, user.email
        user.delete()
        return Response(
            {'message': f'User {username} ({email}) deleted successfully'},
            status=status.HTTP_200_OK,
        )


class AdminViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.filter(role='admin')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    # ── Register admin ───────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def register_admin(self, request):
        """Only existing admins can create new admin accounts."""
        serializer = AdminRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = create_jwt_token(user)
            return Response(
                {
                    'message': 'Admin registered successfully',
                    'token': token,
                    'admin': UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Admin login ──────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def admin_login(self, request):
        """Admin login with email and password."""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user_obj = CustomUser.objects.get(
                    email=serializer.validated_data['email'],
                    role='admin',
                )
            except CustomUser.DoesNotExist:
                return Response(
                    {'message': 'Invalid admin credentials'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            user = authenticate(
                username=user_obj.username,
                password=serializer.validated_data['password'],
            )
            if user and user.is_active:
                token = create_jwt_token(user)
                return Response(
                    {
                        'message': 'Admin login successful',
                        'token': token,
                        'admin': UserSerializer(user).data,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {'message': 'Invalid admin credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── All employees (active + pending) ────────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def all_users(self, request):
        """Return all employee users (approved, pending, deactivated) for admin view."""
        users = CustomUser.objects.filter(role='employee').order_by('-created_at')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    # ── Pending employees only ───────────────────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def pending_users(self, request):
        """Return employees awaiting admin approval."""
        users = CustomUser.objects.filter(role='employee', is_approved=False).order_by('-created_at')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    # ── All admins ───────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def all_admins(self, request):
        """Return all admin users."""
        admins = CustomUser.objects.filter(role='admin')
        serializer = UserSerializer(admins, many=True)
        return Response(serializer.data)

    # ── Delete admin ─────────────────────────────────────────────────────────
    @action(detail=True, methods=['delete'], permission_classes=[IsAdminUser])
    def delete_admin(self, request, pk=None):
        """Admin can delete another admin (not themselves)."""
        admin = self.get_object()
        if admin == request.user:
            return Response(
                {'message': 'Cannot delete your own admin account'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username, email = admin.username, admin.email
        admin.delete()
        return Response(
            {'message': f'Admin {username} ({email}) deleted successfully'},
            status=status.HTTP_200_OK,
        )