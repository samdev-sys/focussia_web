"""Fase 1: pruebas automáticas de permisos (rol × endpoint).

Cubre workspaces, invitaciones, delegaciones y recursos con scope de workspace
(KanbanTask, Recordatorio, MatrixItem, Factura). Roles: owner, admin, member,
viewer y no miembro.
"""
from datetime import timedelta
import secrets

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    Workspace, WorkspaceMember, Invitation, Delegation, AccionKanban,
    KanbanTask, Recordatorio, MatrixItem, Factura,
)

User = get_user_model()
FUTURE = timezone.now() + timedelta(days=30)
PAST = timezone.now() - timedelta(days=1)


def make_user(username, email=None):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@example.com',
        password='ClaveSegura123!',
    )


class WorkspaceBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_user('owner')
        self.admin = make_user('admin')
        self.member = make_user('member')
        self.viewer = make_user('viewer')
        self.outsider = make_user('outsider')
        self.ws = Workspace.objects.create(owner=self.owner, name='WS', description='')
        WorkspaceMember.objects.create(workspace=self.ws, user=self.owner, role='owner')
        WorkspaceMember.objects.create(workspace=self.ws, user=self.admin, role='admin')
        WorkspaceMember.objects.create(workspace=self.ws, user=self.member, role='member')
        WorkspaceMember.objects.create(workspace=self.ws, user=self.viewer, role='viewer')

    def as_user(self, user):
        self.client.force_authenticate(user=user)
        return self.client


class WorkspaceEndpointPermsTests(WorkspaceBase):
    """Workspaces: listar, ver, invitar, remover, cambiar rol, members-for-delegation."""

    def test_list_only_includes_member_workspaces(self):
        other = Workspace.objects.create(owner=self.outsider, name='Other')
        WorkspaceMember.objects.create(workspace=other, user=self.outsider, role='owner')
        res = self.as_user(self.member).get('/api/workspaces/')
        self.assertEqual(res.status_code, 200)
        ids = {w['id'] for w in res.data} if isinstance(res.data, list) else {
            w['id'] for w in res.data.get('results', [])}
        self.assertIn(self.ws.id, ids)
        self.assertNotIn(other.id, ids)

    def test_non_member_cannot_retrieve_workspace(self):
        res = self.as_user(self.outsider).get(f'/api/workspaces/{self.ws.id}/')
        self.assertIn(res.status_code, (403, 404))

    def test_each_member_can_retrieve_workspace(self):
        for user in (self.owner, self.admin, self.member, self.viewer):
            res = self.as_user(user).get(f'/api/workspaces/{self.ws.id}/')
            self.assertEqual(res.status_code, 200, f'{user.username}: {res.data}')

    def test_invite_owner_and_admin_allowed_member_viewer_denied(self):
        ok_cases = [(self.owner, 200), (self.admin, 200)]
        denied = [(self.member, 403), (self.viewer, 403), (self.outsider, 404)]
        for i, (user, expected) in enumerate(ok_cases + denied):
            email = f'invite{i}@example.com'
            res = self.as_user(user).post(
                f'/api/workspaces/{self.ws.id}/invite/',
                {'email': email, 'role': 'member'}, format='json')
            self.assertEqual(res.status_code, expected, f'{user.username}: {res.data}')

    def test_invite_rejects_owner_role(self):
        res = self.as_user(self.owner).post(
            f'/api/workspaces/{self.ws.id}/invite/',
            {'email': 'x@example.com', 'role': 'owner'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_only_owner_can_invite_admin(self):
        res = self.as_user(self.admin).post(
            f'/api/workspaces/{self.ws.id}/invite/',
            {'email': 'newadmin@example.com', 'role': 'admin'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_remove_member_requires_admin_owner(self):
        target = make_user('target')
        WorkspaceMember.objects.create(workspace=self.ws, user=target, role='member')
        res = self.as_user(self.member).post(
            f'/api/workspaces/{self.ws.id}/remove_member/',
            {'user_id': target.id}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.admin).post(
            f'/api/workspaces/{self.ws.id}/remove_member/',
            {'user_id': target.id}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_update_member_role_rejects_owner_and_invalid(self):
        res = self.as_user(self.owner).post(
            f'/api/workspaces/{self.ws.id}/update_member_role/',
            {'user_id': self.member.id, 'role': 'owner'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.as_user(self.owner).post(
            f'/api/workspaces/{self.ws.id}/update_member_role/',
            {'user_id': self.member.id, 'role': 'supergod'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_update_member_role_permissions(self):
        res = self.as_user(self.viewer).post(
            f'/api/workspaces/{self.ws.id}/update_member_role/',
            {'user_id': self.member.id, 'role': 'admin'}, format='json')
        self.assertIn(res.status_code, (403, 404))
        res = self.as_user(self.admin).post(
            f'/api/workspaces/{self.ws.id}/update_member_role/',
            {'user_id': self.member.id, 'role': 'admin'}, format='json')
        self.assertEqual(res.status_code, 403)  # solo owner asigna admin
        res = self.as_user(self.owner).post(
            f'/api/workspaces/{self.ws.id}/update_member_role/',
            {'user_id': self.member.id, 'role': 'admin'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_members_for_delegation_requires_membership(self):
        res = self.as_user(self.outsider).get(
            f'/api/workspaces/{self.ws.id}/members-for-delegation/')
        self.assertIn(res.status_code, (403, 404))
        res = self.as_user(self.member).get(
            f'/api/workspaces/{self.ws.id}/members-for-delegation/')
        self.assertEqual(res.status_code, 200)


class InvitationPermsTests(WorkspaceBase):
    def _invite(self, email, invited_by=None):
        return Invitation.objects.create(
            workspace=self.ws,
            email=email,
            role='member',
            token=secrets.token_urlsafe(32),
            status='pending',
            invited_by=invited_by or self.owner,
            expires_at=timezone.now() + timedelta(hours=48),
        )

    def test_invitation_list_scoped_to_user_email(self):
        mine = self._invite(self.member.email)
        self._invite('other@example.com')
        res = self.as_user(self.member).get('/api/invitations/')
        self.assertEqual(res.status_code, 200)
        items = res.data if isinstance(res.data, list) else res.data.get('results', [])
        ids = {i['id'] for i in items}
        self.assertIn(mine.id, ids)
        self.assertTrue(all(i['email'] == self.member.email for i in items))

    def test_accept_decline_only_for_invited_email(self):
        invitee = make_user('invitee', 'invitee@example.com')
        inv = self._invite(invitee.email)
        res = self.as_user(self.member).post(
            '/api/workspaces/accept_invitation/', {'token': inv.token}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(invitee).post(
            '/api/workspaces/accept_invitation/', {'token': inv.token}, format='json')
        self.assertEqual(res.status_code, 200)
        invitee2 = make_user('invitee2', 'invitee2@example.com')
        inv2 = self._invite(invitee2.email)
        res = self.as_user(self.member).post(
            '/api/workspaces/decline_invitation/', {'token': inv2.token}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(invitee2).post(
            '/api/workspaces/decline_invitation/', {'token': inv2.token}, format='json')
        self.assertEqual(res.status_code, 200)


class DelegationPermsTests(WorkspaceBase):
    def _make_task(self, user):
        return AccionKanban.objects.create(
            user=user, texto_accion='Tarea delegable',
            estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
            origen=AccionKanban.OrigenChoices.MANUAL,
        )

    def _make_delegation(self, delegator, delegate_email, delegate=None):
        task = self._make_task(delegator)
        return Delegation.objects.create(
            task=task, delegator=delegator, delegate=delegate,
            delegate_email=delegate_email, message='',
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(hours=72),
        )

    def test_list_only_sent_or_received(self):
        d1 = self._make_delegation(self.member, self.viewer.email, self.viewer)
        self._make_delegation(self.outsider, 'x@example.com')
        res = self.as_user(self.member).get('/api/delegations/')
        self.assertEqual(res.status_code, 200)
        sent_ids = {d['id'] for d in res.data.get('sent', [])}
        self.assertIn(d1.id, sent_ids)
        all_ids = {d['id'] for d in res.data.get('sent', []) + res.data.get('received', [])}
        self.assertEqual(all_ids, {d1.id})

    def test_delegate_can_accept_reject_complete_delegator_cannot(self):
        d = self._make_delegation(self.member, self.viewer.email, self.viewer)
        res = self.as_user(self.member).post(
            f'/api/delegations/{d.token}/', {'action': 'accept'}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.viewer).post(
            f'/api/delegations/{d.token}/', {'action': 'accept'}, format='json')
        self.assertEqual(res.status_code, 200)
        d.task.refresh_from_db()
        self.assertEqual(d.task.assigned_to_id, self.viewer.id)
        d2 = self._make_delegation(self.member, self.viewer.email, self.viewer)
        res = self.as_user(self.viewer).post(
            f'/api/delegations/{d2.token}/', {'action': 'reject'}, format='json')
        self.assertEqual(res.status_code, 200)
        d3 = self._make_delegation(self.member, self.viewer.email, self.viewer)
        d3.status = 'accepted'
        d3.save(update_fields=['status'])
        res = self.as_user(self.viewer).post(
            f'/api/delegations/{d3.token}/', {'action': 'complete'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_only_delegator_can_cancel(self):
        d = self._make_delegation(self.member, self.viewer.email, self.viewer)
        res = self.as_user(self.viewer).post(
            f'/api/delegations/{d.token}/', {'action': 'cancel'}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.member).post(
            f'/api/delegations/{d.token}/', {'action': 'cancel'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_outsider_cannot_act_or_read(self):
        d = self._make_delegation(self.member, self.viewer.email, self.viewer)
        res = self.as_user(self.outsider).post(
            f'/api/delegations/{d.token}/', {'action': 'accept'}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.outsider).get(f'/api/delegations/by-token/{d.token}/')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.outsider).get(f'/api/delegations/{d.token}/')
        self.assertEqual(res.status_code, 403)

    def test_participants_can_read_by_token(self):
        d = self._make_delegation(self.member, self.viewer.email, self.viewer)
        for user in (self.member, self.viewer):
            res = self.as_user(user).get(f'/api/delegations/by-token/{d.token}/')
            self.assertEqual(res.status_code, 200, f'{user.username}: {res.data}')


class ScopedResourcePermsTests(WorkspaceBase):
    """Rol × endpoint para KanbanTask, Recordatorio, MatrixItem, Factura."""

    def _create_item(self, user, endpoint, payload):
        return self.as_user(user).post(endpoint, payload, format='json')

    def _assert_role_matrix(self, endpoint, create_payload, update_payload, other_item):
        """other_item: elemento del workspace propiedad de OTRO miembro."""
        ws = {'workspace': self.ws.id}
        # No miembro: no ve ni puede crear en workspace.
        res = self.as_user(self.outsider).get(f'{endpoint}?workspace={self.ws.id}')
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.outsider).get(f'{endpoint}{other_item.id}/')
        self.assertIn(res.status_code, (403, 404))
        res = self._create_item(self.outsider, endpoint, {**create_payload, **ws})
        self.assertEqual(res.status_code, 403)

        # Viewer: puede leer, no puede crear/editar/borrar.
        res = self.as_user(self.viewer).get(f'{endpoint}?workspace={self.ws.id}')
        self.assertEqual(res.status_code, 200)
        self.assertIn(other_item.id, self._ids(res.data))
        res = self._create_item(self.viewer, endpoint, {**create_payload, **ws})
        self.assertEqual(res.status_code, 403)
        res = self.as_user(self.viewer).patch(
            f'{endpoint}{other_item.id}/', update_payload, format='json')
        self.assertEqual(res.status_code, 403)

        # Member: puede leer y crear; edita solo lo suyo.
        res = self._create_item(self.member, endpoint, {**create_payload, **ws})
        self.assertEqual(res.status_code, 201, res.data)
        own_id = res.data['id']
        res = self.as_user(self.member).patch(
            f'{endpoint}{own_id}/', update_payload, format='json')
        if res.status_code != 200:
            self.fail(f'{endpoint} own_id={own_id} member={self.member.id} ws={self.ws.id} body={getattr(res,"data",res.content)}')
        res = self.as_user(self.member).patch(
            f'{endpoint}{other_item.id}/', update_payload, format='json')
        self.assertEqual(res.status_code, 403)

        # Admin/owner: pueden leer y crear; owner puede gestionar contenido ajeno.
        res = self._create_item(self.admin, endpoint, {**create_payload, **ws})
        self.assertEqual(res.status_code, 201, res.data)
        res = self.as_user(self.owner).patch(
            f'{endpoint}{other_item.id}/', update_payload, format='json')
        self.assertEqual(res.status_code, 200, res.data)

    def _ids(self, data):
        items = data if isinstance(data, list) else data.get('results', [])
        return {i['id'] for i in items}

    def test_kanban_task_role_matrix(self):
        item = KanbanTask.objects.create(
            user=self.admin, titulo='KT', columna='Backlog', workspace=self.ws)
        self._assert_role_matrix(
            '/api/kanban-tasks/',
            {'titulo': 'Nuevo', 'columna': 'Backlog'},
            {'titulo': 'Editado'},
            item,
        )

    def test_recordatorio_role_matrix(self):
        item = Recordatorio.objects.create(
            user=self.admin, titulo='R', categoria='Otro',
            fecha_hora=FUTURE, workspace=self.ws)
        self._assert_role_matrix(
            '/api/recordatorios/',
            {'titulo': 'Nuevo', 'categoria': 'Otro', 'fecha_hora': FUTURE.isoformat()},
            {'titulo': 'Editado'},
            item,
        )

    def test_matrix_item_role_matrix(self):
        item = MatrixItem.objects.create(
            user=self.admin, task='M', quadrant='do', workspace=self.ws)
        self._assert_role_matrix(
            '/api/matrix-items/',
            {'task': 'Nuevo', 'quadrant': 'do'},
            {'task': 'Editado'},
            item,
        )

    def test_factura_role_matrix(self):
        item = Factura.objects.create(
            user=self.admin, nombre='F', monto='10.00',
            fecha_vencimiento=FUTURE.date(), workspace=self.ws)
        self._assert_role_matrix(
            '/api/facturas/',
            {'nombre': 'Nueva', 'monto': '5.00', 'fecha_vencimiento': FUTURE.date().isoformat()},
            {'nombre': 'Editada'},
            item,
        )

    def test_personal_items_remain_private(self):
        mine = KanbanTask.objects.create(user=self.member, titulo='Privada')
        theirs = KanbanTask.objects.create(user=self.outsider, titulo='Ajena')
        res = self.as_user(self.member).get('/api/kanban-tasks/')
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res.data)
        self.assertIn(mine.id, ids)
        self.assertNotIn(theirs.id, ids)
        res = self.as_user(self.member).get(f'/api/kanban-tasks/{theirs.id}/')
        self.assertIn(res.status_code, (403, 404))

    def test_cannot_create_in_unjoined_workspace(self):
        res = self.as_user(self.outsider).post(
            '/api/kanban-tasks/',
            {'titulo': 'X', 'columna': 'Backlog', 'workspace': self.ws.id},
            format='json')
        self.assertEqual(res.status_code, 403)
