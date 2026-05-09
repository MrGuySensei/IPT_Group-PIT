from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationEmailView,
    UserProfileView,
    UploadProfilePictureView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('verify-email/<uidb64>/<token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification'),

    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/picture/', UploadProfilePictureView.as_view(), name='upload-profile-picture'),
]