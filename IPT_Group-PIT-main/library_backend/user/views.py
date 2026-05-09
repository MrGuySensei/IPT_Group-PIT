from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator

from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UpdateProfileSerializer,
)

User = get_user_model()


def send_verification_email(user, request):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    domain = request.get_host()
    scheme = 'https' if request.is_secure() else 'http'
    verify_url = f"{scheme}://{domain}/api/auth/verify-email/{uid}/{token}/"

    subject = 'Verify your Library Account Email'
    message = f"""
Hello {user.first_name or user.username},

Thank you for registering with our Library System.

Please click the link below to verify your email address:

{verify_url}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
Library System Team
    """.strip()

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            try:
                send_verification_email(user, request)
            except Exception as e:
                print(f"Email sending failed: {e}")

            return Response(
                {
                    "message": "Registration successful. Please check your email to verify your account.",
                    "email": user.email,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if default_token_generator.check_token(user, token):
            if user.is_email_verified:
                return Response(
                    {"message": "Email already verified. Please log in."},
                    status=status.HTTP_200_OK,
                )
            user.is_email_verified = True
            user.is_active = True
            user.save()
            return Response(
                {"message": "Email verified successfully! You can now log in."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "Verification link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If that email is registered, a verification link has been sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_email_verified:
            return Response(
                {"message": "Email is already verified. Please log in."},
                status=status.HTTP_200_OK,
            )

        try:
            send_verification_email(user, request)
        except Exception as e:
            return Response(
                {"error": "Failed to send email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "Verification email sent. Please check your inbox."},
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UpdateProfileSerializer
        return UserSerializer

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        user = self.get_object()
        serializer = UpdateProfileSerializer(user, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Profile updated successfully.", "data": UserSerializer(user).data}
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UploadProfilePictureView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        if 'profile_picture' not in request.FILES:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['profile_picture']

        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if file.content_type not in allowed_types:
            return Response(
                {"error": "Only JPEG, PNG, and WebP images are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > 5 * 1024 * 1024:
            return Response(
                {"error": "Image size must be less than 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.profile_picture = file
        profile.save()

        return Response(
            {
                "message": "Profile picture updated.",
                "profile_picture": request.build_absolute_uri(profile.profile_picture.url),
            }
        )