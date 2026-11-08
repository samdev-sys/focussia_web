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

# Ensure TimeBlock.fecha exists before app initialization queries
try:
    import django
    django.setup()
    from django.db import connection
    with connection.cursor() as cursor:
        table_name = 'dashboard_timeblock'
        try:
            if connection.vendor == 'sqlite':
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
                if cursor.fetchone():
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    cols = [row[1] for row in cursor.fetchall()]
                    if 'fecha' not in cols:
                        try:
                            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
                        except Exception:
                            pass
                        try:
                            cursor.execute(f"UPDATE {table_name} SET fecha = date('now') WHERE fecha IS NULL")
                        except Exception:
                            pass
            elif connection.vendor == 'postgresql':
                try:
                    cursor.execute("SELECT to_regclass('dashboard_timeblock')")
                    res = cursor.fetchone()
                    if res and res[0]:
                        cursor.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name='dashboard_timeblock' AND column_name='fecha'
                        """)
                        if not cursor.fetchone():
                            try:
                                cursor.execute("ALTER TABLE dashboard_timeblock ADD COLUMN fecha date")
                            except Exception:
                                pass
                            try:
                                cursor.execute("UPDATE dashboard_timeblock SET fecha = CURRENT_DATE WHERE fecha IS NULL")
                            except Exception:
                                pass
                            try:
                                cursor.execute("ALTER TABLE dashboard_timeblock ALTER COLUMN fecha SET NOT NULL")
                            except Exception:
                                pass
                except Exception:
                    pass
        except Exception:
            pass
except Exception:
    pass

application = get_wsgi_application()
