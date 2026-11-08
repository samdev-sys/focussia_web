from rest_framework import permissions

from .models import Workspace, WorkspaceMember


WORKSPACE_READ_ROLES = {'viewer', 'member', 'admin', 'owner'}
WORKSPACE_WRITE_ROLES = {'member', 'admin', 'owner'}
WORKSPACE_MANAGE_ROLES = {'admin', 'owner'}


def get_workspace_member(user, workspace):
    """Retorna la membresía activa del usuario en el workspace, o None."""
    if not user or not getattr(user, 'is_authenticated', False) or not workspace:
        return None
    ws_id = getattr(workspace, 'id', workspace)
    return WorkspaceMember.objects.filter(user=user, workspace_id=ws_id).first()


def get_workspace_role(user, workspace):
    member = get_workspace_member(user, workspace)
    return member.role if member else None


def resolve_workspace_id(request, view=None, obj=None):
    """Obtiene workspace_id desde el objeto, query params o datos de la petición."""
    if obj is not None:
        ws = getattr(obj, 'workspace_id', None)
        if ws is not None:
            return ws
        ws = getattr(obj, 'workspace', None)
        if ws is not None:
            return getattr(ws, 'id', ws)
    data = getattr(request, 'data', None) or {}
    for key in ('workspace', 'workspace_id'):
        if key in data and data[key] not in (None, '', 'null'):
            try:
                return int(data[key])
            except (TypeError, ValueError):
                return data[key]
    for src in (getattr(request, 'query_params', None), getattr(request, 'GET', None)):
        if src and 'workspace' in src and src['workspace'] not in ('', 'null', 'None'):
            try:
                return int(src['workspace'])
            except (TypeError, ValueError):
                return src['workspace']
    return None


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


class HasWorkspaceRole(permissions.BasePermission):
    """Permiso central por rol de workspace.

    - viewer: solo lectura.
    - member: crea y edita lo suyo (obj.user == request.user).
    - admin/owner: gestionan miembros/configuración del workspace y tienen
      permisos de escritura dentro del workspace.

    Para recursos personales (workspace nulo), exige propiedad del usuario.
    """

    message = 'No tienes permisos para realizar esta acción en el workspace.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        ws_id = resolve_workspace_id(request, view=view)
        if ws_id is None:
            # Sin contexto de workspace: acceso personal autenticado; la propiedad
            # del objeto se valida a nivel queryset/objeto.
            if request.method in permissions.SAFE_METHODS:
                return True
            # Crear personal: permitido para usuarios autenticados.
            return True
        member = WorkspaceMember.objects.filter(
            user=request.user, workspace_id=ws_id).first()
        if not member:
            self.message = 'No eres miembro de este workspace.'
            return False
        if request.method in permissions.SAFE_METHODS:
            return member.role in WORKSPACE_READ_ROLES
        return member.role in WORKSPACE_WRITE_ROLES

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        ws_id = getattr(obj, 'workspace_id', None)
        if ws_id is None:
            # Recurso personal: solo el dueño.
            owner_id = getattr(obj, 'user_id', None)
            if owner_id is None:
                owner = getattr(obj, 'user', None)
                owner_id = getattr(owner, 'id', None)
            return owner_id == request.user.id

        member = WorkspaceMember.objects.filter(
            user=request.user, workspace_id=ws_id).first()
        if not member:
            return False
        if request.method in permissions.SAFE_METHODS:
            return member.role in WORKSPACE_READ_ROLES
        if member.role == 'viewer':
            return False
        # member edita lo suyo; admin/owner pueden gestionar dentro del workspace.
        if member.role in WORKSPACE_MANAGE_ROLES:
            return True
        owner_id = getattr(obj, 'user_id', None)
        if owner_id is None:
            owner = getattr(obj, 'user', None)
            owner_id = getattr(owner, 'id', None)
        return owner_id == request.user.id


class CanManageWorkspace(permissions.BasePermission):
    """Restringe acciones de gestión de workspace a admin/owner."""

    message = 'Se requiere rol de administrador u owner del workspace.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        workspace = obj if isinstance(obj, Workspace) else getattr(obj, 'workspace', None)
        role = get_workspace_role(request.user, workspace)
        return role in WORKSPACE_MANAGE_ROLES
