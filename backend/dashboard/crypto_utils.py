import os
import base64
from django.conf import settings

ALGORITHM = 'aes-256-gcm'
KEY_LENGTH = 32
NONCE_LENGTH = 12
TAG_LENGTH = 16


def _get_encryption_key() -> bytes:
    """Derive an AES-256 key from Django's SECRET_KEY."""
    from hashlib import pbkdf2_hmac
    sk = settings.SECRET_KEY.encode()
    return pbkdf2_hmac('sha256', sk, b'focusia-encryption-v1', 600_000, dklen=KEY_LENGTH)


def encrypt_field(plaintext: str) -> str:
    if not plaintext:
        return ''
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = _get_encryption_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(NONCE_LENGTH)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
        payload = nonce + ciphertext
        return base64.b85encode(payload).decode()
    except ImportError:
        return plaintext


def decrypt_field(ciphertext_b85: str) -> str:
    if not ciphertext_b85:
        return ''
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = _get_encryption_key()
        payload = base64.b85decode(ciphertext_b85)
        nonce = payload[:NONCE_LENGTH]
        ciphertext = payload[NONCE_LENGTH:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode()
    except (ImportError, Exception):
        return ciphertext_b85
