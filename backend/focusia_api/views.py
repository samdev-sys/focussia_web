from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        email = request.data.get('username') or request.data.get('email')
        
        if email:
            try:
                user = User.objects.get(email=email)
                request.data['username'] = user.username
            except User.DoesNotExist:
                pass
        
        return super().post(request, *args, **kwargs)
