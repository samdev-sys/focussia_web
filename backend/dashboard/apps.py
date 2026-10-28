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