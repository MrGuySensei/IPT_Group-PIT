from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from user.models import UserProfile
from books.models import Book, BorrowRecord
from datetime import date, timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database with sample data...')
        
        # Create staff accounts (verified, can login immediately)
        staff_users = [
            {
                'username': 'admin_staff',
                'email': 'admin@library.com',
                'password': 'admin123',
                'first_name': 'Admin',
                'last_name': 'Staff'
            },
            {
                'username': 'john_staff',
                'email': 'john@library.com',
                'password': 'staff123',
                'first_name': 'John',
                'last_name': 'Smith'
            },
            {
                'username': 'sarah_staff',
                'email': 'sarah@library.com',
                'password': 'staff123',
                'first_name': 'Sarah',
                'last_name': 'Johnson'
            }
        ]
        
        for staff_data in staff_users:
            if not User.objects.filter(email=staff_data['email']).exists():
                user = User.objects.create_user(
                    username=staff_data['username'],
                    email=staff_data['email'],
                    password=staff_data['password'],
                    first_name=staff_data['first_name'],
                    last_name=staff_data['last_name'],
                    is_staff=True,
                    is_active=True,
                    is_email_verified=True  # Pre-verified for testing
                )
                UserProfile.objects.create(user=user)
                self.stdout.write(f'Created staff account: {staff_data["email"]}')
            else:
                self.stdout.write(f'Staff account already exists: {staff_data["email"]}')
        
        # Create member accounts (verified, can login immediately)
        member_users = [
            {
                'username': 'jane_member',
                'email': 'jane@example.com',
                'password': 'member123',
                'first_name': 'Jane',
                'last_name': 'Doe'
            },
            {
                'username': 'mike_member',
                'email': 'mike@example.com',
                'password': 'member123',
                'first_name': 'Mike',
                'last_name': 'Wilson'
            },
            {
                'username': 'emily_member',
                'email': 'emily@example.com',
                'password': 'member123',
                'first_name': 'Emily',
                'last_name': 'Brown'
            }
        ]
        
        for member_data in member_users:
            if not User.objects.filter(email=member_data['email']).exists():
                user = User.objects.create_user(
                    username=member_data['username'],
                    email=member_data['email'],
                    password=member_data['password'],
                    first_name=member_data['first_name'],
                    last_name=member_data['last_name'],
                    is_staff=False,
                    is_active=True,
                    is_email_verified=True  # Pre-verified for testing
                )
                profile = UserProfile.objects.create(user=user)
                # Add some additional profile data
                profile.phone_number = '555-0101'
                profile.city = 'New York'
                profile.country = 'USA'
                profile.save()
                self.stdout.write(f'Created member account: {member_data["email"]}')
            else:
                self.stdout.write(f'Member account already exists: {member_data["email"]}')
        
        # Create sample books
        books_data = [
            {
                'title': 'The Great Gatsby',
                'author': 'F. Scott Fitzgerald',
                'isbn': '9780743273565',
                'total_copies': 5,
                'available_copies': 3
            },
            {
                'title': 'To Kill a Mockingbird',
                'author': 'Harper Lee',
                'isbn': '9780061120084',
                'total_copies': 4,
                'available_copies': 4
            },
            {
                'title': '1984',
                'author': 'George Orwell',
                'isbn': '9780451524935',
                'total_copies': 6,
                'available_copies': 2
            },
            {
                'title': 'Pride and Prejudice',
                'author': 'Jane Austen',
                'isbn': '9780141439518',
                'total_copies': 3,
                'available_copies': 3
            },
            {
                'title': 'The Catcher in the Rye',
                'author': 'J.D. Salinger',
                'isbn': '9780316769488',
                'total_copies': 4,
                'available_copies': 1
            }
        ]
        
        for book_data in books_data:
            if not Book.objects.filter(isbn=book_data['isbn']).exists():
                Book.objects.create(**book_data)
                self.stdout.write(f'Created book: {book_data["title"]}')
            else:
                self.stdout.write(f'Book already exists: {book_data["title"]}')
        
        # Create sample borrow records
        jane_user = User.objects.filter(email='jane@example.com').first()
        mike_user = User.objects.filter(email='mike@example.com').first()
        gatsby_book = Book.objects.filter(isbn='9780743273565').first()
        orwell_book = Book.objects.filter(isbn='9780451524935').first()
        salinger_book = Book.objects.filter(isbn='9780316769488').first()
        
        if jane_user and gatsby_book:
            # Active borrow
            if not BorrowRecord.objects.filter(borrower_email=jane_user.email, book=gatsby_book, status='borrowed').exists():
                BorrowRecord.objects.create(
                    book=gatsby_book,
                    borrower_name=jane_user.get_full_name(),
                    borrower_email=jane_user.email,
                    borrow_date=date.today() - timedelta(days=5),
                    status='borrowed'
                )
                gatsby_book.available_copies -= 1
                gatsby_book.save()
                self.stdout.write(f'Created borrow record for {jane_user.email}')
        
        if mike_user and orwell_book:
            # Returned book
            if not BorrowRecord.objects.filter(borrower_email=mike_user.email, book=orwell_book).exists():
                BorrowRecord.objects.create(
                    book=orwell_book,
                    borrower_name=mike_user.get_full_name(),
                    borrower_email=mike_user.email,
                    borrow_date=date.today() - timedelta(days=20),
                    return_date=date.today() - timedelta(days=6),
                    status='returned'
                )
                self.stdout.write(f'Created returned record for {mike_user.email}')
        
        if mike_user and salinger_book:
            # Overdue book
            if not BorrowRecord.objects.filter(borrower_email=mike_user.email, book=salinger_book, status='overdue').exists():
                BorrowRecord.objects.create(
                    book=salinger_book,
                    borrower_name=mike_user.get_full_name(),
                    borrower_email=mike_user.email,
                    borrow_date=date.today() - timedelta(days=20),
                    status='overdue'
                )
                salinger_book.available_copies -= 1
                salinger_book.save()
                self.stdout.write(f'Created overdue record for {mike_user.email}')
        
        self.stdout.write(self.style.SUCCESS('✅ Database seeded successfully!'))
        self.stdout.write('\n📋 Staff Login Credentials:')
        self.stdout.write('   Email: admin@library.com | Password: admin123')
        self.stdout.write('   Email: john@library.com  | Password: staff123')
        self.stdout.write('   Email: sarah@library.com | Password: staff123')
        self.stdout.write('\n📋 Member Login Credentials:')
        self.stdout.write('   Email: jane@example.com  | Password: member123')
        self.stdout.write('   Email: mike@example.com  | Password: member123')
        self.stdout.write('   Email: emily@example.com | Password: member123')
