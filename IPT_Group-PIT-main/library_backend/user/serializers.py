from rest_framework import serializers
from user.models import User

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']  # ✅ removed re_password
        extra_kwargs = {'password': {'write_only': True}}

    def get_role(self, obj):
        return 'staff' if obj.is_staff else 'member'

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user