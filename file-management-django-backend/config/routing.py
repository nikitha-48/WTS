from django.urls import re_path
from files.consumers import FileConsumer
from tasks.consumers import TaskConsumer

websocket_urlpatterns = [
    re_path(r"ws/files/$", FileConsumer.as_asgi()),
    re_path(r"ws/tasks/$", TaskConsumer.as_asgi()),
]