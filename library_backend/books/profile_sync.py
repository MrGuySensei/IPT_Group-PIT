from django.contrib.auth import get_user_model

from .models import BorrowRecord

User = get_user_model()


def sync_profile_borrow_stats(email):
    """Keep UserProfile borrow counters aligned with BorrowRecord data."""
    if not email:
        return

    try:
        user = User.objects.select_related('profile').get(email__iexact=email)
    except User.DoesNotExist:
        return

    try:
        profile = user.profile
    except Exception:
        return

    records = BorrowRecord.objects.filter(borrower_email__iexact=email)
    profile.total_books_borrowed = records.count()
    profile.currently_borrowed = records.filter(
        status__in=['borrowed', 'overdue']
    ).count()
    profile.save(update_fields=['total_books_borrowed', 'currently_borrowed'])
