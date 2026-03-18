from django.contrib import admin
from .models import Book, BorrowRecord


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'isbn', 'total_copies', 'available_copies', 'created_at']
    search_fields = ['title', 'author', 'isbn']
    list_filter = ['created_at']


@admin.register(BorrowRecord)
class BorrowRecordAdmin(admin.ModelAdmin):
    list_display = ['book', 'borrower_name', 'borrower_email', 'borrow_date', 'due_date', 'return_date', 'status']
    search_fields = ['borrower_name', 'borrower_email', 'book__title']
    list_filter = ['status', 'borrow_date']
    readonly_fields = ['borrow_date']
