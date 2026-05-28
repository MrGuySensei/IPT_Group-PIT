from django.urls import path
from .views import UserProfileView, UploadProfilePictureView

urlpatterns = [
    path('',         UserProfileView.as_view(),         name='user-profile'),
    path('picture/', UploadProfilePictureView.as_view(), name='upload-profile-picture'),
]