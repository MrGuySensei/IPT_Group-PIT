from datetime import datetime

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string


def uses_console_email_backend():
    """True when emails print to the Django terminal instead of a real inbox."""
    return 'console' in (settings.EMAIL_BACKEND or '').lower()


def smtp_is_configured():
    return bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)


def get_frontend_verification_url(token):
    """Link that opens the React app verification page."""
    return f"{settings.FRONTEND_URL}/?verify={token}"


def parse_date_of_birth(value):
    if not value:
        return None
    value = str(value).strip()
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def send_verification_email(user, request=None):
    """
    Send or simulate verification email.
    Returns (success, error_message, verification_url, delivery_mode)
    delivery_mode: 'console' | 'smtp' | 'none'
    """
    verification_url = get_frontend_verification_url(user.email_verification_token)

    if uses_console_email_backend():
        print("\n" + "=" * 60)
        print("  DEVELOPMENT EMAIL (not sent to Gmail)")
        print(f"  Account: {user.email}")
        print("  Configure Gmail SMTP in library_backend/.env to deliver verification by email.")
        if smtp_is_configured():
            print("  Warning: SMTP credentials are configured, but EMAIL_BACKEND is set to the console backend.")
            print("           Remove or comment out EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend to enable SMTP delivery.")
        print("=" * 60 + "\n")
        return True, None, verification_url, 'console'

    if not smtp_is_configured():
        return False, 'SMTP is not configured (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD missing).', verification_url, 'none'

    context = {
        'user': user,
        'verification_url': verification_url,
    }

    html_message = render_to_string('emails/email_verification.html', context)
    plain_message = render_to_string('emails/email_verification.txt', context)

    from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER or 'noreply@library.com'
    recipient_list = [user.email]

    try:
        send_mail(
            subject='Verify Your Email - Library System',
            message=plain_message,
            html_message=html_message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        print(f"\n✅ VERIFICATION EMAIL SENT TO {user.email} via SMTP\n")
        return True, None, verification_url, 'smtp'
    except Exception as exc:
        print(f"\n❌ EMAIL SENDING FAILED for {user.email}: {exc}\n")
        return False, str(exc), verification_url, 'smtp'
