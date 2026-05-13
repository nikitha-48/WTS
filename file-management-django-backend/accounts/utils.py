import jwt  # type: ignore[import-untyped]
from django.conf import settings
from datetime import datetime, timedelta


def create_jwt_token(user):  # type: ignore[no-untyped-def]
    payload = {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(days=7),  # type: ignore[attr-defined]
        'iat': datetime.utcnow(),                       # type: ignore[attr-defined]
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token