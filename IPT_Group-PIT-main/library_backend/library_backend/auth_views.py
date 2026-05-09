from django.contrib.auth import authenticate, login, logout
from user.models import User, UserProfile
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.urls import reverse
import json


def send_verification_email(user, request):
    """Send email verification to user"""
    verification_url = request.build_absolute_uri(
        reverse('verify_email', kwargs={'token': str(user.email_verification_token)})
    )

    context = {
        'user': user,
        'verification_url': verification_url,
    }

    html_message = render_to_string('emails/email_verification.html', context)
    plain_message = render_to_string('emails/email_verification.txt', context)

    from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
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
        print(f"\n✅ VERIFICATION EMAIL SENT TO {user.email}")
        print(f"   Token: {user.email_verification_token}")
        print(f"   URL: {verification_url}")
        print(f"   From: {from_email}")
        print(f"   Subject: Verify Your Email - Library System\n")
        return True
    except Exception as e:
        print(f"\n❌ EMAIL SENDING FAILED: {str(e)}\n")
        raise


def user_to_dict(user):
    """Return user dict including role and profile picture URL."""
    profile_picture_url = None
    try:
        profile_picture_url = user.profile.profile_picture.url if user.profile and user.profile.profile_picture else None
    except Exception:
        profile_picture_url = None

    return {
        'id':                 user.id,
        'username':           user.username,
        'email':              user.email,
        'role':               'staff' if user.is_staff else 'member',
        'profile_picture_url': profile_picture_url,
    }


def get_request_payload(request):
    """Parse JSON or multipart/form-data payload for signup requests."""
    content_type = request.META.get('CONTENT_TYPE', '')
    if 'multipart/form-data' in content_type:
        return request.POST
    return json.loads(request.body or b'{}')


def authenticate_user(request, identifier, password):
    """Authenticate using either email or username."""
    if not identifier or not password:
        return None

    # If the user typed an email address, authenticate directly.
    if '@' in identifier:
        return authenticate(request, username=identifier, password=password)

    # Otherwise, try username lookup and authenticate with the stored email.
    try:
        user_obj = User.objects.get(username=identifier)
        return authenticate(request, username=user_obj.email, password=password)
    except User.DoesNotExist:
        return authenticate(request, username=identifier, password=password)


# ── Staff Sign Up ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def staff_signup_view(request):
    try:
        data             = get_request_payload(request)
        username         = data.get("username", "").strip()
        email            = data.get("email", "").strip()
        password         = data.get("password", "")
        confirm_password = data.get("confirm_password", "")
        profile_picture  = request.FILES.get('profile_picture')

        if not username or not email or not password:
            return JsonResponse({"error": "All fields are required."}, status=400)
        if password != confirm_password:
            return JsonResponse({"error": "Passwords do not match."}, status=400)
        if len(password) < 6:
            return JsonResponse({"error": "Password must be at least 6 characters."}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already taken."}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already registered."}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
            is_active=False,
        )

        profile = UserProfile.objects.create(user=user)
        if profile_picture:
            profile.profile_picture = profile_picture
            profile.save()

        # Send verification email
        send_verification_email(user, request)
        return JsonResponse({
            "message": "Staff account created successfully. Please check your email to verify your account.",
            "user": user_to_dict(user)
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ── Staff Login ───────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def staff_login_view(request):
    try:
        data     = json.loads(request.body)
        username = data.get("username", "").strip()
        password = data.get("password", "")

        if not username or not password:
            return JsonResponse({"error": "Username and password are required."}, status=400)

        user = authenticate_user(request, username, password)
        if user is None:
            return JsonResponse({"error": "Invalid username or password."}, status=401)
        if not user.is_staff:
            return JsonResponse({"error": "This account does not have staff access."}, status=403)
        if not user.is_email_verified:
            return JsonResponse({"error": "Please verify your email before logging in."}, status=403)

        login(request, user)
        return JsonResponse({"message": "Login successful.", "user": user_to_dict(user)})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ── Member Login ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def member_login_view(request):
    try:
        data     = json.loads(request.body)
        username = data.get("username", "").strip()
        password = data.get("password", "")

        if not username or not password:
            return JsonResponse({"error": "Username and password are required."}, status=400)

        user = authenticate_user(request, username, password)
        if user is None:
            return JsonResponse({"error": "Invalid username or password."}, status=401)
        if user.is_staff:
            return JsonResponse({"error": "Staff accounts must use the Staff login."}, status=403)
        if not user.is_email_verified:
            return JsonResponse({"error": "Please verify your email before logging in."}, status=403)

        login(request, user)
        return JsonResponse({"message": "Login successful.", "user": user_to_dict(user)})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ── Member Sign Up ────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def member_signup_view(request):
    try:
        data             = get_request_payload(request)
        username         = data.get("username", "").strip()
        email            = data.get("email", "").strip()
        password         = data.get("password", "")
        confirm_password = data.get("confirm_password", "")
        profile_picture  = request.FILES.get('profile_picture')

        if not username or not email or not password:
            return JsonResponse({"error": "All fields are required."}, status=400)
        if password != confirm_password:
            return JsonResponse({"error": "Passwords do not match."}, status=400)
        if len(password) < 6:
            return JsonResponse({"error": "Password must be at least 6 characters."}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already taken."}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already registered."}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=False,
            is_active=False,
        )

        profile = UserProfile.objects.create(user=user)
        if profile_picture:
            profile.profile_picture = profile_picture
            profile.save()

        # Send verification email
        send_verification_email(user, request)
        return JsonResponse({
            "message": "Account created successfully. Please check your email to verify your account.",
            "user": user_to_dict(user)
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ── Shared Logout & Me ────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out successfully."})


@require_http_methods(["GET"])
def me_view(request):
    if request.user.is_authenticated:
        return JsonResponse({"user": user_to_dict(request.user)})
    return JsonResponse({"user": None}, status=401)


# ── Users List (staff only) ───────────────────────────────────────────────────

@require_http_methods(["GET"])
def users_list_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized."}, status=401)
    if not request.user.is_staff:
        return JsonResponse({"error": "Staff access only."}, status=403)

    users = User.objects.all().values('id', 'username', 'email', 'is_staff')
    user_list = [
        {
            'id': u['id'],
            'username': u['username'],
            'email': u['email'],
            'role': 'staff' if u['is_staff'] else 'member',
        }
        for u in users
    ]
    return JsonResponse({"users": user_list})


# ── Email Verification ───────────────────────────────────────────────────────

@require_http_methods(["GET"])
def verify_email_view(request, token):
    try:
        user = User.objects.get(email_verification_token=token)
        if user.is_email_verified:
            return JsonResponse({"message": "Email already verified.", "verified": True})

        user.is_email_verified = True
        user.is_active = True
        user.save()
        return JsonResponse({
            "message": "Email verified successfully! You can now log in to your account.",
            "verified": True
        })

    except User.DoesNotExist:
        return JsonResponse({"error": "Invalid verification token.", "verified": False}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e), "verified": False}, status=500)