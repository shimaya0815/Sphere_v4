from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'channels', views.ChannelViewSet)
router.register(r'messages', views.MessageViewSet)
router.register(r'direct-messages', views.DirectMessageViewSet, basename='direct-messages')

urlpatterns = [
    path('', include(router.urls)),
    path('workspaces/<int:workspace_id>/channels/', views.WorkspaceChannelsView.as_view(), name='workspace-channels'),
    path('workspaces/<int:workspace_id>/search/', views.SearchMessagesView.as_view(), name='search-messages'),
]