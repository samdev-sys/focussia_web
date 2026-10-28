import base64
import json
import logging
import urllib.request
import urllib.error
from django.conf import settings

logger = logging.getLogger(__name__)


def _vapid_key():
    """Reconstruye la llave privada desde el DER en base64 del .env."""
    raw = (getattr(settings, 'VAPID_PRIVATE_KEY_B64', '') or '').strip()
    if not raw:
        return None
    try:
        from cryptography.hazmat.primitives import serialization
        der = base64.urlsafe_b64decode(raw + '=' * (-len(raw) % 4))
        return serialization.load_der_private_key(der, password=None)
    except Exception as e:
        logger.error(f'VAPID key inválida: {e}')
        return None


class PushService:
    """Envío Web Push (VAPID) a los dispositivos suscritos del usuario."""

    @classmethod
    def _sender(cls):
        from pywebpush import WebPusher
        key = _vapid_key()
        if key is None:
            return None
        return WebPusher(
            vapid_private_key=key,
            vapid_claims={'sub': getattr(settings, 'VAPID_CLAIM_SUB', 'mailto:focusia@example.com')},
        )

    @classmethod
    def enviar(cls, user, titulo: str, mensaje: str) -> dict:
        from ..models import PushSubscription
        subs = list(PushSubscription.objects.filter(user=user))
        if not subs:
            return {'success': False, 'error': 'Sin suscripciones push'}
        sender = cls._sender()
        if sender is None:
            return {'success': False, 'error': 'VAPID no configurado'}
        payload = json.dumps({'title': titulo, 'body': mensaje}, ensure_ascii=False)
        ok, errores = 0, []
        for sub in subs:
            try:
                sender.send(
                    data=payload,
                    subscription_info={
                        'endpoint': sub.endpoint,
                        'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                    },
                    headers={'TTL': '86400', 'Urgency': 'normal'},
                    timeout=15,
                )
                ok += 1
            except Exception as e:
                status = getattr(getattr(e, 'response', None), 'status_code', None)
                logger.warning(f'Push falló {sub.endpoint[:60]}: {e}')
                if status in (404, 410):
                    sub.delete()
                errores.append(str(e))
        return {'success': ok > 0, 'enviados': ok, 'errores': errores}


class MetaWhatsAppService:
    """Proveedor oficial Meta WhatsApp Cloud API (conmutable con Twilio)."""

    @classmethod
    def enviar_mensaje(cls, telefono: str, mensaje: str) -> dict:
        token = getattr(settings, 'META_WHATSAPP_TOKEN', '') or ''
        phone_id = getattr(settings, 'META_WHATSAPP_PHONE_ID', '') or ''
        if not token or not phone_id:
            return {'success': False, 'error': 'Meta WhatsApp no configurado'}
        numero = telefono.strip().lstrip('+')
        if telefono.strip().startswith('whatsapp:'):
            numero = telefono.strip().split(':', 1)[1].lstrip('+')
        body = json.dumps({
            'messaging_product': 'whatsapp',
            'to': numero,
            'type': 'text',
            'text': {'body': mensaje},
        }).encode('utf-8')
        req = urllib.request.Request(
            f'https://graph.facebook.com/v21.0/{phone_id}/messages',
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}',
            },
            method='POST',
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                wm_id = (result.get('messages') or [{}])[0].get('id')
                logger.info(f'Meta WhatsApp enviado a {numero}: {wm_id}')
                return {'success': True, 'id': wm_id}
        except urllib.error.HTTPError as e:
            detalle = e.read().decode('utf-8', errors='replace')[:500]
            logger.error(f'Meta WhatsApp error {e.code}: {detalle}')
            return {'success': False, 'error': f'Meta {e.code}: {detalle}'}
        except Exception as e:
            logger.error(f'Meta WhatsApp error: {e}')
            return {'success': False, 'error': str(e)}
