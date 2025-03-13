from django.urls import path
from . import views

urlpatterns = [
    # Route the root URL directly to the UserChannelsView
    path('', views.UserChannelsView.as_view(), name='direct-user-channels'),
]