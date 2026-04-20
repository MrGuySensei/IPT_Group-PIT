from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from . import auth_views

def home(request):
    return render(request, 'index.html')

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('books.urls')),
    path('api/', include('user.urls')),  # ✅ ADDED - includes DRF user viewset

    # ── Staff auth ──
    path('api/auth/staff/signup/', auth_views.staff_signup_view, name='staff-signup'),
    path('api/auth/staff/login/',  auth_views.staff_login_view,  name='staff-login'),

    # ── Member auth ──
    path('api/auth/member/login/',  auth_views.member_login_view,  name='member-login'),
    path('api/auth/member/signup/', auth_views.member_signup_view, name='member-signup'),

    # ── Shared ──
    path('api/auth/logout/', auth_views.logout_view, name='logout'),
    path('api/auth/me/',     auth_views.me_view,     name='me'),
]