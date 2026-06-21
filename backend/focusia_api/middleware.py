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



