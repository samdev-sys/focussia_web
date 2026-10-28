import logging
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)
User = get_user_model()


def _set_jwt_cookies(response, user):
    refresh = RefreshToken.for_user(user)
    secure = not settings.DEBUG
    samesite = 'None' if not settings.DEBUG else 'Lax'
    response.set_cookie(
        'access_token', str(refresh.access_token),
        httponly=True, secure=secure, samesite=samesite,
        max_age=86400,
    )
    response.set_cookie(
        'refresh_token', str(refresh),
        httponly=True, secure=secure, samesite=samesite,
        max_age=604800,
    )
    return response


def _get_or_create_social_user(email, full_name, avatar_url, provider):
    user = User.objects.filter(email=email).first()
    if user:
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            user.save(update_fields=['avatar_url'])
        return user

    username = email.split('@')[0]
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    first_name = full_name.split()[0] if full_name else ''
    last_name = ' '.join(full_name.split()[1:]) if full_name and len(full_name.split()) > 1 else ''

    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
    )
    return user


# ─── GOOGLE ────────────────────────────────────────────────────────────

def _verify_google_token(id_token):
    resp = requests.get(
        'https://oauth2.googleapis.com/tokeninfo',
        params={'id_token': id_token},
        timeout=10,
    )
    if resp.status_code != 200:
        return None
    data = resp.json()
    if 'email' not in data:
        return None
    return {
        'email': data['email'],
        'full_name': data.get('name', ''),
        'avatar_url': data.get('picture', ''),
        'provider': 'google',
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    id_token = request.data.get('id_token')
    if not id_token:
        return Response({'error': 'id_token requerido'}, status=status.HTTP_400_BAD_REQUEST)

    user_info = _verify_google_token(id_token)
    if not user_info:
        return Response({'error': 'Token de Google inválido'}, status=status.HTTP_401_UNAUTHORIZED)

    user = _get_or_create_social_user(
        email=user_info['email'],
        full_name=user_info['full_name'],
        avatar_url=user_info['avatar_url'],
        provider='google',
    )

    response = Response({
        'user_id': user.id,
        'email': user.email,
        'username': user.username,
        'full_name': user.get_full_name(),
        'avatar_url': user.avatar_url,
    }, status=status.HTTP_200_OK)
    _set_jwt_cookies(response, user)
    return response


# ─── MICROSOFT / OUTLOOK ───────────────────────────────────────────────

def _verify_microsoft_token(access_token):
    resp = requests.get(
        'https://graph.microsoft.com/v1.0/me',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=10,
    )
    if resp.status_code != 200:
        return None
    data = resp.json()
    email = data.get('mail') or data.get('userPrincipalName')
    if not email:
        return None
    full_name = data.get('displayName', '')
    avatar_url = ''
    photo_resp = requests.get(
        'https://graph.microsoft.com/v1.0/me/photo/$value',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=10,
    )
    if photo_resp.status_code == 200:
        import base64
        avatar_url = f"data:image/jpeg;base64,{base64.b64encode(photo_resp.content).decode()}"
    return {
        'email': email,
        'full_name': full_name,
        'avatar_url': avatar_url,
        'provider': 'microsoft',
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def microsoft_login(request):
    access_token = request.data.get('access_token')
    if not access_token:
        return Response({'error': 'access_token requerido'}, status=status.HTTP_400_BAD_REQUEST)

    user_info = _verify_microsoft_token(access_token)
    if not user_info:
        return Response({'error': 'Token de Microsoft inválido'}, status=status.HTTP_401_UNAUTHORIZED)

    user = _get_or_create_social_user(
        email=user_info['email'],
        full_name=user_info['full_name'],
        avatar_url=user_info['avatar_url'],
        provider='microsoft',
    )

    response = Response({
        'user_id': user.id,
        'email': user.email,
        'username': user.username,
        'full_name': user.get_full_name(),
        'avatar_url': user.avatar_url,
    }, status=status.HTTP_200_OK)
    _set_jwt_cookies(response, user)
    return response
