from django.conf import settings
from django.utils import timezone

ACCOUNT_LOCKOUT_MINUTES = 15


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Frame-Options'] = 'DENY'
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Permitted-Cross-Domain-Policies'] = 'none'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Cross-Origin-Opener-Policy'] = 'same-origin'
        response['Cross-Origin-Resource-Policy'] = 'same-origin'
        response['X-DNS-Prefetch-Control'] = 'off'

        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            response['Permissions-Policy'] = (
                'camera=(), microphone=(), geolocation=(self "https://api.open-meteo.com"), interest-cohort=()'
            )
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https://api.open-meteo.com https://nominatim.openstreetmap.org; "
                "frame-ancestors 'none'"
            )
        else:
            response['X-Robots-Tag'] = 'noindex, nofollow'

        return response


class LastActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            now = timezone.now()
            if user.last_activity is None or (now - user.last_activity).seconds > 300:
                UserModel = user.__class__
                UserModel.objects.filter(id=user.id).update(last_activity=now)
        return response


class AccountLockoutMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            if request.user.locked_until and request.user.locked_until > timezone.now():
                from django.http import JsonResponse
                return JsonResponse(
                    {'error': 'Cuenta bloqueada temporalmente. Intenta más tarde.'},
                    status=423,
                )
            if request.user.locked_until and request.user.locked_until <= timezone.now():
                request.user.locked_until = None
                request.user.failed_login_attempts = 0
                request.user.save(update_fields=['locked_until', 'failed_login_attempts'])
        return self.get_response(request)
