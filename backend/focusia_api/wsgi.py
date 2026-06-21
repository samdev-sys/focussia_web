import os
import copy as _copy
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'focusia_api.settings')

# Monkey-patch for Python 3.14 compatibility:
# Django 4.2.11's BaseContext.__copy__ uses copy(super()) which fails
# because super() objects are immutable in Python 3.14.
from django.template import context as _context
_original_base_copy = _context.BaseContext.__copy__
def _patched_base_copy(self):
    duplicate = self.__class__()
    duplicate.dicts = self.dicts[:]
    return duplicate
_context.BaseContext.__copy__ = _patched_base_copy

application = get_wsgi_application()
