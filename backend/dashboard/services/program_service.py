from datetime import date

from django.utils import timezone
from ..models import ProgramMonth, ProgramDay, UserProgramProgress, DailyPhraseViewLog


def get_or_create_progress(user):
    progress, _ = UserProgramProgress.objects.get_or_create(
        user=user,
        defaults={'cycle_start_date': timezone.localdate()}
    )
    return progress


def get_current_program_day(user, today=None):
    today = today or timezone.localdate()
    progress = get_or_create_progress(user)
    # Doc 25.1 §4/§10: reinicio anual colectivo. Los usuarios sincronizados
    # cuyo ciclo viene de un año anterior inician juntos el 1 de enero.
    if (progress.is_synced_to_collective
            and progress.cycle_start_date.year < today.year
            and progress.last_collective_reset_year != today.year):
        progress.cycle_start_date = date(today.year, 1, 1)
        progress.last_collective_reset_year = today.year
        progress.save(update_fields=['cycle_start_date', 'last_collective_reset_year'])
    cycle_day_index = (today - progress.cycle_start_date).days + 1
    if cycle_day_index < 1:
        cycle_day_index = 1

    remaining = cycle_day_index
    for month in ProgramMonth.objects.order_by("month_number").prefetch_related("days"):
        days_in_month = month.days.count()
        if remaining <= days_in_month:
            return month.days.get(day_number=remaining)
        remaining -= days_in_month

    return ProgramDay.objects.order_by("-month__month_number", "-day_number").first()


def get_program_day_data(user, today=None):
    today = today or timezone.localdate()
    program_day = get_current_program_day(user, today)
    if program_day is None:
        return None
    month = program_day.month
    day_total = month.days.count()
    return {
        'phrase': program_day.phrase,
        'intention': program_day.intention,
        'month_theme': month.theme_name,
        'month_number': month.month_number,
        'day_number': program_day.day_number,
        'day_total': day_total,
    }


def get_or_log_phrase_view(user, program_day, shown_date=None):
    shown_date = shown_date or timezone.localdate()
    log, created = DailyPhraseViewLog.objects.get_or_create(
        user=user,
        shown_date=shown_date,
        defaults={'program_day': program_day}
    )
    return log, created


def get_progress_summary(user, today=None):
    today = today or timezone.localdate()
    program_day = get_current_program_day(user, today)
    progress = get_or_create_progress(user)
    if program_day is None:
        return {
            'current_month': 12,
            'current_day_in_month': 0,
            'total_day_in_cycle': (today - progress.cycle_start_date).days + 1,
            'month_theme': '',
            'cycle_start_date': progress.cycle_start_date,
        }
    cycle_day_index = (today - progress.cycle_start_date).days + 1
    return {
        'current_month': program_day.month.month_number,
        'current_day_in_month': program_day.day_number,
        'total_day_in_cycle': max(cycle_day_index, 1),
        'month_theme': program_day.month.theme_name,
        'cycle_start_date': progress.cycle_start_date,
    }
