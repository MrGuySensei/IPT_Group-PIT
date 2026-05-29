from datetime import datetime
from django.conf import settings
import resend


def uses_console_email_backend():
    return False  # Resend handles all delivery


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


def get_frontend_verification_url(token):
    return f"{settings.FRONTEND_URL}/?verify={token}"


def send_verification_email(user, request=None):
    """
    Send verification email via Resend API.
    Returns (success, error_message, verification_url, delivery_mode)
    """
    verification_url = get_frontend_verification_url(user.email_verification_token)

    api_key = getattr(settings, 'RESEND_API_KEY', None)
    if not api_key:
        print("\n❌ RESEND_API_KEY is not set in environment variables.\n")
        return False, 'RESEND_API_KEY is not configured.', verification_url, 'none'

    resend.api_key = api_key

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 background-color: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff;
                    padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <span style="font-size: 10px; font-weight: 900; color: #c4522a;
                         text-transform: uppercase; letter-spacing: 1.5px;
                         display: block; margin-bottom: 4px;">
                Email Verification
            </span>
            <h2 style="font-size: 24px; font-weight: 900; color: #0f172a;
                       text-transform: uppercase; margin: 0 0 16px 0;">
                Welcome to the Library System
            </h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                Hi <strong>{user.username}</strong>, your account has been created.
                Please verify your email address to activate your account.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{verification_url}"
                   style="background-color: #c4522a; color: #ffffff;
                          padding: 14px 28px; text-decoration: none;
                          border-radius: 12px; font-size: 13px;
                          font-weight: 700; text-transform: uppercase;
                          display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                If the button does not work, copy and paste this link:
            </p>
            <p style="word-break: break-all; font-size: 11px; font-weight: 700;
                      color: #c4522a; background-color: #f8fafc;
                      padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                {verification_url}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 10px; font-weight: 900; color: #94a3b8;
                      text-transform: uppercase; margin: 0;">
                &copy; 2026 Library System
            </p>
        </div>
    </body>
    </html>
    """

    try:
        resend.Emails.send({
            "from": "Library System <onboarding@resend.dev>",
            "to": [user.email],
            "subject": "Verify Your Email - Library System",
            "html": html_content,
        })
        print(f"\n✅ Verification email sent via Resend to {user.email}\n")
        return True, None, verification_url, 'smtp'
    except Exception as exc:
        print(f"\n❌ Resend API error for {user.email}: {exc}\n")
        return False, str(exc), verification_url, 'smtp'