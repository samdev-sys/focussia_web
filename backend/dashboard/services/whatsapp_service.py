import json
import logging
import urllib.request
import urllib.error
from urllib.parse import urlencode
from django.conf import settings

logger = logging.getLogger(__name__)


def _normalizar(telefono: str) -> str:
    telefono = (telefono or '').strip()
    if telefono.startswith('whatsapp:'):
        return telefono
    return f'whatsapp:+{telefono.lstrip("+")}'


def _enviar_twilio(telefono: str, mensaje: str) -> dict:
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '') or ''
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '') or ''
    sender = getattr(settings, 'TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
    if not sid or not token:
        logger.info(f'[DEV] WhatsApp a {telefono}: {mensaje}')
        return {'success': True, 'dev': True, 'mensaje': mensaje}
    auth = f'{sid}:{token}'
    data = urlencode({'From': sender, 'To': telefono, 'Body': mensaje}).encode('utf-8')
    url = f'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json'
    req = urllib.request.Request(
        url, data=data,
        headers={
            'Authorization': f'Basic {__import__("base64").b64encode(auth.encode()).decode()}',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            logger.info(f'WhatsApp sent to {telefono}: sid={result.get("sid")}')
            return {'success': True, 'sid': result.get('sid')}
    except Exception as e:
        logger.error(f'WhatsApp error: {e}')
        return {'success': False, 'error': str(e)}


class WhatsAppService:
    """Envío WhatsApp con proveedor conmutable: log|twilio|meta."""

    @classmethod
    def enviar_mensaje(cls, telefono: str, mensaje: str) -> dict:
        if not (telefono or '').strip():
            return {'success': False, 'error': 'Teléfono no configurado'}
        provider = (getattr(settings, 'WHATSAPP_PROVIDER', 'log') or 'log').lower()
        if provider == 'meta':
            from .push_service import MetaWhatsAppService
            return MetaWhatsAppService.enviar_mensaje(telefono, mensaje)
        if provider == 'twilio':
            return _enviar_twilio(_normalizar(telefono), mensaje)
        logger.info(f'[DEV] WhatsApp a {telefono}: {mensaje}')
        return {'success': True, 'dev': True, 'mensaje': mensaje}
