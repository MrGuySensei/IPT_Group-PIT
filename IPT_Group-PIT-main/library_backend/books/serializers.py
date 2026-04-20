from rest_framework import serializers
from .models import Book, BorrowRecord


class BookSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'isbn', 'total_copies', 'available_copies', 'is_available', 'created_at']
        read_only_fields = ['available_copies', 'created_at']


class BorrowRecordSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author', read_only=True)
    overdue_days = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = BorrowRecord
        fields = [
            'id', 'book', 'book_title', 'book_author',
            'borrower_name', 'borrower_email',
            'borrow_date', 'due_date', 'return_date',
            'status', 'overdue_days', 'is_overdue'
        ]
        read_only_fields = ['return_date', 'status', 'borrow_date']

    def validate_book(self, book):
        if not book.is_available:
            raise serializers.ValidationError("This book is not available for borrowing.")
        return book