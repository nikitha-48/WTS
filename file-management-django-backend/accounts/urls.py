from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import UserViewSet, AdminViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'admins', AdminViewSet, basename='admin')

urlpatterns = [
    path('', include(router.urls)),
]