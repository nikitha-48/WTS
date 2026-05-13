from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import UserViewSet
from files.views import FileViewSet
from tasks.views import TaskViewSet

router = DefaultRouter()
router.register(r'auth', UserViewSet, basename='user')
router.register(r'files', FileViewSet, basename='file')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]