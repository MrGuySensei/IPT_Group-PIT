from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, BorrowRecordViewSet, dashboard_stats

router = DefaultRouter()
router.register(r'books', BookViewSet)
router.register(r'borrow-records', BorrowRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_stats),
]
