from django.utils import timezone
from ..models import UserProgramProgress


def apply_collective_annual_reset(today=None):
    today = today or timezone.localdate()
    current_year = today.year
    eligible = UserProgramProgress.objects.filter(
        is_synced_to_collective=True
    ).exclude(last_collective_reset_year=current_year)

    updated = eligible.update(
        cycle_start_date=today,
        last_collective_reset_year=current_year,
    )
    # TODO: considerar disparar aquí una notificación/mensaje de campaña de año nuevo
    # (fuera de alcance de este módulo, coordinar con Sistema Proactivo)
    return updated
