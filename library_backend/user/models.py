from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
import uuid


def profile_picture_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4()}.{ext}'
    return f'media/profile_pictures/{filename}'


class User(AbstractUser):
    email = models.EmailField(_('email address'), unique=True)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, editable=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    profile_picture = models.ImageField(
        upload_to=profile_picture_path,
        null=True,
        blank=True
    )
    bio = models.TextField(max_length=500, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    membership_id = models.CharField(max_length=20, unique=True, blank=True)
    membership_date = models.DateField(auto_now_add=True)
    total_books_borrowed = models.PositiveIntegerField(default=0)
    currently_borrowed = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user.email}'

    def save(self, *args, **kwargs):
        if not self.membership_id:
            import random
            import string
            self.membership_id = 'LIB-' + ''.join(
                random.choices(string.digits, k=8)
            )
        super().save(*args, **kwargs)