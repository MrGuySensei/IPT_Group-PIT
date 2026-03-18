from django.db import models
from django.utils import timezone
from datetime import timedelta


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True)
    total_copies = models.PositiveIntegerField(default=1)
    available_copies = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.author}"

    @property
    def is_available(self):
        return self.available_copies > 0


class BorrowRecord(models.Model):
    STATUS_CHOICES = [
        ('borrowed', 'Borrowed'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
    ]

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrow_records')
    borrower_name = models.CharField(max_length=255)
    borrower_email = models.EmailField()
    borrow_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='borrowed')

    def save(self, *args, **kwargs):
        if not self.due_date:
            from datetime import timedelta
            self.due_date = self.borrow_date + timedelta(days=14)
        super().save(*args, **kwargs)

    @property
    def overdue_days(self):
        if self.status == 'returned':
            return 0
        today = timezone.now().date()
        if today > self.due_date:
            return (today - self.due_date).days
        return 0

    @property
    def is_overdue(self):
        return self.overdue_days > 0

    def __str__(self):
        return f"{self.borrower_name} borrowed {self.book.title}"
