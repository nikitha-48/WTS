import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from accounts.models import CustomUser


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header[7:]

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = CustomUser.objects.get(id=payload['id'])

            # Deny access if admin has not approved the account yet
            if not user.is_approved:
                raise AuthenticationFailed('Account not yet approved by admin.')

            # Deny access if account was deactivated after approval
            if not user.is_active:
                raise AuthenticationFailed('Account has been deactivated.')

            return (user, token)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, CustomUser.DoesNotExist):
            raise AuthenticationFailed('Invalid or expired token')