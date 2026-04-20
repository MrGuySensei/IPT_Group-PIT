from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import Book, BorrowRecord
from .serializers import BookSerializer, BorrowRecordSerializer


@api_view(['GET'])
def dashboard_stats(request):
    today = timezone.now().date()
    # Auto-update overdue
    BorrowRecord.objects.filter(status='borrowed', due_date__lt=today).update(status='overdue')

    total_books = Book.objects.count()
    total_copies = sum(Book.objects.values_list('total_copies', flat=True))
    available_copies = sum(Book.objects.values_list('available_copies', flat=True))
    active_borrows = BorrowRecord.objects.filter(status__in=['borrowed', 'overdue']).count()
    overdue_count = BorrowRecord.objects.filter(status='overdue').count()
    returned_count = BorrowRecord.objects.filter(status='returned').count()
    total_borrows = BorrowRecord.objects.count()

    # Most borrowed books
    popular = (
        Book.objects.annotate(borrow_count=Count('borrow_records'))
        .order_by('-borrow_count')[:5]
    )
    popular_data = [{'id': b.id, 'title': b.title, 'author': b.author, 'borrow_count': b.borrow_count} for b in popular]

    # Overdue records
    overdue_records = BorrowRecord.objects.filter(status='overdue').select_related('book').order_by('due_date')
    overdue_data = BorrowRecordSerializer(overdue_records, many=True).data

    return Response({
        'total_books': total_books,
        'total_copies': total_copies,
        'available_copies': available_copies,
        'borrowed_copies': total_copies - available_copies,
        'active_borrows': active_borrows,
        'overdue_count': overdue_count,
        'returned_count': returned_count,
        'total_borrows': total_borrows,
        'popular_books': popular_data,
        'overdue_records': overdue_data,
    })


@method_decorator(csrf_exempt, name='dispatch')
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('-created_at')
    serializer_class = BookSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(author__icontains=search) | Q(isbn__icontains=search)
            )
        available = self.request.query_params.get('available')
        if available == 'true':
            queryset = queryset.filter(available_copies__gt=0)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Always set available_copies = total_copies on creation
        total_copies = serializer.validated_data.get('total_copies', 1)
        serializer.save(available_copies=total_copies)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        # Recalculate available if total changes
        old_total = instance.total_copies
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_total = serializer.validated_data.get('total_copies', old_total)
        if new_total != old_total:
            diff = new_total - old_total
            instance.available_copies = max(0, instance.available_copies + diff)
            instance.save(update_fields=['available_copies'])
        self.perform_update(serializer)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class BorrowRecordViewSet(viewsets.ModelViewSet):
    queryset = BorrowRecord.objects.all().order_by('-borrow_date')
    serializer_class = BorrowRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        today = timezone.now().date()
        queryset.filter(status='borrowed', due_date__lt=today).update(status='overdue')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(borrower_email__icontains=email)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        book = serializer.validated_data['book']
        book.available_copies -= 1
        book.save()
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        record = self.get_object()
        if record.status == 'returned':
            return Response({'error': 'Book already returned.'}, status=status.HTTP_400_BAD_REQUEST)
        record.status = 'returned'
        record.return_date = timezone.now().date()
        record.save()
        book = record.book
        book.available_copies += 1
        book.save()
        return Response(BorrowRecordSerializer(record).data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        records = self.get_queryset()
        book_id = request.query_params.get('book_id')
        if book_id:
            records = records.filter(book_id=book_id)
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def members(self, request):
        """Unique borrowers with their stats"""
        records = BorrowRecord.objects.values('borrower_name', 'borrower_email').annotate(
            total=Count('id'),
            active=Count('id', filter=Q(status__in=['borrowed', 'overdue'])),
            overdue=Count('id', filter=Q(status='overdue')),
        ).order_by('-total')
        return Response(list(records))