from django.conf import settings


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Frame-Options'] = 'DENY'
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Permitted-Cross-Domain-Policies'] = 'none'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Use same-origin-allow-popups to allow OAuth popups/postMessage (Google/GSI)
        path = getattr(request, 'path', '') or ''
        if path.startswith('/api/auth/') or path.startswith('/auth/'):
            response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        else:
            response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        response['Cross-Origin-Resource-Policy'] = 'cross-origin'
        response['X-DNS-Prefetch-Control'] = 'off'

        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            response['Permissions-Policy'] = (
                'camera=(), microphone=(), geolocation=(self "https://api.open-meteo.com" "https://nominatim.openstreetmap.org"), interest-cohort=()'
            )
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "img-src 'self' data: blob: https:; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "connect-src 'self' https://api.open-meteo.com https://nominatim.openstreetmap.org https://accounts.google.com https://oauth2.googleapis.com; "
                "frame-src 'self' https://accounts.google.com; "
                "frame-ancestors 'none'; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "upgrade-insecure-requests"
            )
        else:
            response['X-Robots-Tag'] = 'noindex, nofollow'

        return response



