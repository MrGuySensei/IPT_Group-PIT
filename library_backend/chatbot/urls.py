from django.urls import path
from .views import chatbot_response

urlpatterns = [
    path('api/chat/', chatbot_response, name='chatbot'),
]