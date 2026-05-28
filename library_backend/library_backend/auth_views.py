import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.conf import settings

from user.models import User, UserProfile
from .email_utils import send_verification_email, parse_date_of_birth, uses_console_email_backend


def user_to_dict(user):
    profile_picture_url = None
    try:
        if user.profile and user.profile.profile_picture:
            profile_picture_url = user.profile.profile_picture.url
    except Exception:
        profile_picture_url = None

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': 'staff' if user.is_staff else 'member',
        'profile_picture_url': profile_picture_url,
    }


def get_request_payload(request):
    content_type = request.META.get('CONTENT_TYPE', '')
    if 'multipart/form-data' in content_type:
        return request.POST
    return json.loads(request.body or b'{}')


def authenticate_user(request, identifier, password):
    if not identifier or not password:
        return None

    if '@' in identifier:
        return authenticate(request, username=identifier, password=password)

    try:
        user_obj = User.objects.get(username=identifier)
        return authenticate(request, username=user_obj.email, password=password)
    except User.DoesNotExist:
        return authenticate(request, username=identifier, password=password)


def apply_signup_profile(user, profile, data, request):
    first_name = data.get('first_name', '').strip()
    last_name  = data.get('last_name', '').strip()
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if first_name or last_name:
        user.save(update_fields=['first_name', 'last_name'])

    dob = parse_date_of_birth(data.get('date_of_birth', ''))
    if dob:
        profile.date_of_birth = dob

    profile_picture = request.FILES.get('profile_picture')
    if profile_picture:
        profile.profile_picture = profile_picture

    profile.save()


def try_send_verification(user, request):
    if not settings.REQUIRE_EMAIL_VERIFICATION:
        return True, None, None, 'none'
    return send_verification_email(user, request)


def login_blocked_unverified(user, request):
    sent, err, _verify_url, delivery_mode = try_send_verification(user, request)
    if delivery_mode == 'console':
        note = ' Check the Django server terminal for the link (development mode only).'
    elif sent and delivery_mode == 'smtp':
        note = f' A verification email was sent to {user.email}. Please check your inbox and spam folder.'
    else:
        note = f' Could not send email ({err or "check SMTP settings"}). Use Resend verification on the login page.'

    return JsonResponse({
        'error': 'Please verify your email before logging in.' + note,
        'needs_verification': True,
        'email': user.email,
        'email_sent_to_inbox': sent and delivery_mode == 'smtp',
        'delivery_mode': delivery_mode,
    }, status=403)


def create_account(username, email, password, is_staff, data, request):
    user = User.objects.create_user(
        email=email,
        username=username,
        password=password,
        is_staff=is_staff,
        is_active=False,
        is_email_verified=False,
    )

    profile = UserProfile.objects.create(user=user)
    apply_signup_profile(user, profile, data, request)

    if not settings.REQUIRE_EMAIL_VERIFICATION:
        user.is_active = True
        user.is_email_verified = True
        user.save(update_fields=['is_active', 'is_email_verified'])
        role = 'Staff' if is_staff else 'Member'
        return JsonResponse({
            'message': f'{role} account created and activated (email verification disabled).',
            'user': user_to_dict(user),
            'email_sent': False,
        }, status=201)

    sent, err, _verify_url, delivery_mode = try_send_verification(user, request)

    if delivery_mode == 'console':
        message = (
            f'Account created for {email}. Development mode: check the Django terminal for the verify link. '
            'Configure Gmail SMTP in .env to send real emails.'
        )
    elif sent and delivery_mode == 'smtp':
        message = (
            f'Account created successfully. A verification email was sent to {email}. '
            'Please check your inbox and spam folder, then click the link to activate your account.'
        )
    else:
        message = (
            f'Account created for {email}, but the verification email could not be delivered. '
            f'{err or "Check SMTP settings in .env."} '
            'You can use "Resend verification email" on the login page.'
        )

    return JsonResponse({
        'message': message,
        'user': user_to_dict(user),
        'email_sent_to_inbox': sent and delivery_mode == 'smtp',
        'delivery_mode': delivery_mode,
        'needs_verification': True,
    }, status=201)


# ── Staff Sign Up ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def staff_signup_view(request):
    try:
        data     = get_request_payload(request)
        username = data.get('username', '').strip()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm  = data.get('confirm_password', '')
        dob      = data.get('date_of_birth', '').strip()

        if not username or not email or not password or not dob:
            return JsonResponse({'error': 'Username, email, password, and date of birth are required.'}, status=400)
        if not parse_date_of_birth(dob):
            return JsonResponse({'error': 'Please enter a valid date of birth.'}, status=400)
        if password != confirm:
            return JsonResponse({'error': 'Passwords do not match.'}, status=400)
        if len(password) < 6:
            return JsonResponse({'error': 'Password must be at least 6 characters.'}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already taken.'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already registered.'}, status=400)

        return create_account(username, email, password, is_staff=True, data=data, request=request)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ── Staff Login ───────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def staff_login_view(request):
    try:
        data     = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required.'}, status=400)

        user = authenticate_user(request, username, password)
        if user is None:
            return JsonResponse({'error': 'Invalid username or password.'}, status=401)
        if not user.is_staff:
            return JsonResponse({'error': 'This account does not have staff access.'}, status=403)
        if not user.is_email_verified:
            return login_blocked_unverified(user, request)

        login(request, user)
        return JsonResponse({'message': 'Login successful.', 'user': user_to_dict(user)})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ── Member Login ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def member_login_view(request):
    try:
        data     = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required.'}, status=400)

        user = authenticate_user(request, username, password)
        if user is None:
            return JsonResponse({'error': 'Invalid username or password.'}, status=401)
        if user.is_staff:
            return JsonResponse({'error': 'Staff accounts must use the Staff login.'}, status=403)
        if not user.is_email_verified:
            return login_blocked_unverified(user, request)

        login(request, user)
        return JsonResponse({'message': 'Login successful.', 'user': user_to_dict(user)})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ── Member Sign Up ────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def member_signup_view(request):
    try:
        data     = get_request_payload(request)
        username = data.get('username', '').strip()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm  = data.get('confirm_password', '')
        dob      = data.get('date_of_birth', '').strip()

        if not username or not email or not password or not dob:
            return JsonResponse({'error': 'Username, email, password, and date of birth are required.'}, status=400)
        if not parse_date_of_birth(dob):
            return JsonResponse({'error': 'Please enter a valid date of birth.'}, status=400)
        if password != confirm:
            return JsonResponse({'error': 'Passwords do not match.'}, status=400)
        if len(password) < 6:
            return JsonResponse({'error': 'Password must be at least 6 characters.'}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already taken.'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already registered.'}, status=400)

        return create_account(username, email, password, is_staff=False, data=data, request=request)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ── Resend Verification ───────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def resend_verification_view(request):
    try:
        data  = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        if not email:
            return JsonResponse({'error': 'Email is required.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'message': 'If that email is registered, a verification link has been sent.'})

        if user.is_email_verified:
            return JsonResponse({'message': 'This email is already verified. You can log in now.'})

        sent, err, _verify_url, delivery_mode = try_send_verification(user, request)

        if delivery_mode == 'console':
            return JsonResponse({
                'message': 'Development mode: check the Django terminal for the verification link.',
                'email_sent_to_inbox': False,
                'delivery_mode': 'console',
            })
        if sent and delivery_mode == 'smtp':
            return JsonResponse({
                'message': f'Verification email sent to {email}. Please check your inbox and spam folder.',
                'email_sent_to_inbox': True,
                'delivery_mode': 'smtp',
            })

        return JsonResponse({
            'error': f'Could not send email: {err or "check SMTP settings"}',
            'email_sent_to_inbox': False,
            'delivery_mode': delivery_mode,
        }, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ── Logout ────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Logged out successfully.'})


# ── Me ────────────────────────────────────────────────────────────────────────

@ensure_csrf_cookie
@require_http_methods(["GET"])
def me_view(request):
    if request.user.is_authenticated:
        return JsonResponse({'user': user_to_dict(request.user)})
    return JsonResponse({'user': None})   # ← 200, not 401


# ── Users List (staff only) ───────────────────────────────────────────────────

@require_http_methods(["GET"])
def users_list_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized.'}, status=401)
    if not request.user.is_staff:
        return JsonResponse({'error': 'Staff access only.'}, status=403)

    users = User.objects.all().values('id', 'username', 'email', 'is_staff')
    return JsonResponse({'users': [
        {
            'id':       u['id'],
            'username': u['username'],
            'email':    u['email'],
            'role':     'staff' if u['is_staff'] else 'member',
        }
        for u in users
    ]})


# ── Email Verification ────────────────────────────────────────────────────────

@require_http_methods(["GET"])
def verify_email_view(request, token):
    try:
        user = User.objects.get(email_verification_token=token)
        if user.is_email_verified:
            return JsonResponse({'message': 'Email already verified.', 'verified': True})

        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=['is_email_verified', 'is_active'])
        return JsonResponse({
            'message': 'Email verified successfully! You can now log in.',
            'verified': True,
        })

    except User.DoesNotExist:
        return JsonResponse({'error': 'Invalid or expired verification link.', 'verified': False}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e), 'verified': False}, status=500)