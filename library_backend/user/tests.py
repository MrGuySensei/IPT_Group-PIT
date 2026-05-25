from django.test import TestCase
from .models import User

class UserModelTest(TestCase):
    def test_create_member(self):
        user = User.objects.create_user(username='testuser', password='pass123', role='member')
        self.assertEqual(user.role, 'member')

    def test_create_staff(self):
        user = User.objects.create_user(username='staffuser', password='pass123', role='staff')
        self.assertEqual(user.role, 'staff')