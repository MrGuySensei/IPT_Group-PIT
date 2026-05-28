from django.urls import path, include
from rest_framework.routers import DefaultRouter

from books.views import BookViewSet, BorrowRecordViewSet, dashboard_stats
from library_backend import auth_views

router = DefaultRouter()
router.register(r'books', BookViewSet)
router.register(r'borrow-records', BorrowRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_stats),

    # Use the existing user app JWT auth and profile endpoints
    path('auth/', include('user.urls')),

    # Preserve the system's dedicated staff/member auth flows
    path('auth/staff/signup/', auth_views.staff_signup_view, name='staff-signup'),
    path('auth/staff/login/', auth_views.staff_login_view, name='staff-login'),
    path('auth/member/signup/', auth_views.member_signup_view, name='member-signup'),
    path('auth/member/login/', auth_views.member_login_view, name='member-login'),
    path('auth/logout/', auth_views.logout_view, name='logout'),
    path('auth/me/', auth_views.me_view, name='me'),
    path('auth/resend-verification/', auth_views.resend_verification_view, name='resend-verification'),
    path('auth/verify/<uuid:token>/', auth_views.verify_email_view, name='verify_email'),
]