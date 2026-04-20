from django.contrib.auth import authenticate, login, logout
from user.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json


def user_to_dict(user):
    """Return user dict including role. Staff = is_staff=True in Django."""
    return {
        'id':       user.id,
        'username': user.username,
        'email':    user.email,
        'role':     'staff' if user.is_staff else 'member',
    }


# ── Staff Sign Up ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def staff_signup_view(request):
    try:
        data             = json.loads(request.body)
        username         = data.get("username", "").strip()
        email            = data.get("email", "").strip()
        password         = data.get("password", "")
        confirm_password = data.get("confirm_password", "")

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

        user = User.objects.create_user(username=username, email=email, password=password, is_staff=True)
        login(request, user)
        return JsonResponse({"message": "Staff account created successfully.", "user": user_to_dict(user)}, status=201)

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

        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse({"error": "Invalid username or password."}, status=401)
        if not user.is_staff:
            return JsonResponse({"error": "This account does not have staff access."}, status=403)

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

        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse({"error": "Invalid username or password."}, status=401)
        if user.is_staff:
            return JsonResponse({"error": "Staff accounts must use the Staff login."}, status=403)

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
        data             = json.loads(request.body)
        username         = data.get("username", "").strip()
        email            = data.get("email", "").strip()
        password         = data.get("password", "")
        confirm_password = data.get("confirm_password", "")

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

        user = User.objects.create_user(username=username, email=email, password=password, is_staff=False)
        login(request, user)
        return JsonResponse({"message": "Account created successfully.", "user": user_to_dict(user)}, status=201)

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