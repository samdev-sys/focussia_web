import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class DashboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dashboard'

    def ready(self):
        try:
            import dashboard.signals  # noqa: F401
        except ImportError:
            logger.debug('No signals module found')
        except Exception as e:
            logger.warning(f'Error loading signals: {e}')
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                table_name = 'dashboard_timeblock'
                try:
                    if connection.vendor == 'sqlite':
                        cursor.execute(f"PRAGMA table_info({table_name})")
                        cols = [row[1] for row in cursor.fetchall()]
                        if 'fecha' not in cols:
                            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
                            cursor.execute(f"UPDATE {table_name} SET fecha = date('now') WHERE fecha IS NULL")
                    elif connection.vendor == 'postgresql':
                        cursor.execute("""
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name=%s AND column_name=%s
                        """, [table_name, 'fecha'])
                        if not cursor.fetchone():
                            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN fecha date")
                            cursor.execute(f"UPDATE {table_name} SET fecha = CURRENT_DATE WHERE fecha IS NULL")
                            try:
                                cursor.execute(f"ALTER TABLE {table_name} ALTER COLUMN fecha SET NOT NULL")
                            except Exception:
                                pass
                except Exception:
                    pass
        except Exception:
            pass