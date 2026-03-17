from django.db import models

class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=13, blank=True, null=True)
    published_date = models.DateField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    available = models.BooleanField(default=True)

    def __str__(self):
        return self.title