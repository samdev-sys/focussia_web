from rest_framework import permissions


class IsContentAdmin(permissions.BasePermission):
    """Permiso del panel de contenido.

    Equivale a `IsAdminUser` de DRF (mira `user.is_staff`), pero con un mensaje
    en español y una nota explícita: este permiso protege el contenido global
    que el administrador publica para todas las personas usuarias.
    """

    message = 'Necesitás permisos de administrador para gestionar el contenido.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)

    def has_object_permission(self, request, view, obj):
        # El contenido es global: si puede entrar al panel, puede editarlo.
        return self.has_permission(request, view)
