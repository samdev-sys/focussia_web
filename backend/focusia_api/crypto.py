import base64
import hashlib
import os
from django.conf import settings
from cryptography.fernet import Fernet


def _derive_key(salt: bytes) -> bytes:
    key = hashlib.pbkdf2_hmac(
        'sha256',
        settings.SECRET_KEY.encode(),
        salt,
        600000,
        dklen=32,
    )
    return base64.urlsafe_b64encode(key)


def encrypt_value(plaintext: str, salt: bytes | None = None) -> str:
    if not plaintext:
        return ''
    salt = salt or os.urandom(16)
    f = Fernet(_derive_key(salt))
    token = f.encrypt(plaintext.encode())
    return base64.urlsafe_b64encode(salt + token).decode()


def decrypt_value(ciphertext: str) -> str:
    if not ciphertext:
        return ''
    raw = base64.urlsafe_b64decode(ciphertext.encode())
    salt = raw[:16]
    token = raw[16:]
    f = Fernet(_derive_key(salt))
    return f.decrypt(token).decode()
