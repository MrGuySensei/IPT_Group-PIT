from datetime import date

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'profile_picture', 'bio', 'gender', 'date_of_birth',
            'phone_number', 'address', 'city', 'country',
            'membership_id', 'membership_date',
            'total_books_borrowed', 'currently_borrowed',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'membership_id', 'membership_date',
            'total_books_borrowed', 'currently_borrowed',
            'created_at', 'updated_at',
        ]

    def get_profile_picture(self, obj):
        if not obj.profile_picture:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return obj.profile_picture.url


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    borrowed_books = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'age', 'is_email_verified', 'profile', 'borrowed_books',
        ]
        read_only_fields = ['id', 'email', 'is_email_verified']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_age(self, obj):
        dob = getattr(getattr(obj, 'profile', None), 'date_of_birth', None)
        if not dob:
            return None
        today = date.today()
        age = today.year - dob.year
        if (today.month, today.day) < (dob.month, dob.day):
            age -= 1
        return age

    def get_borrowed_books(self, obj):
        from books.models import BorrowRecord
        from books.serializers import BorrowRecordSerializer

        records = BorrowRecord.objects.filter(
            borrower_email__iexact=obj.email
        ).select_related('book').order_by('-borrow_date')
        return BorrowRecordSerializer(records, many=True, context=self.context).data


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'password', 'password_confirm', 'date_of_birth', 'profile_picture',
        ]

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        profile_picture = validated_data.pop('profile_picture', None)
        date_of_birth = validated_data.pop('date_of_birth', None)
        validated_data.pop('password_confirm')

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password'],
            is_active=False,
        )
        profile = UserProfile.objects.create(user=user)
        if date_of_birth:
            profile.date_of_birth = date_of_birth
        if profile_picture:
            profile.profile_picture = profile_picture
        profile.save()
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'username', 'profile']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        return instance