from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'channels', views.ChannelViewSet)
router.register(r'messages', views.MessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('direct-messages/', views.DirectMessageViewSet.as_view({'post': 'create'}), name='direct-messages'),
    path('workspaces/<int:workspace_id>/channels/', views.WorkspaceChannelsView.as_view(), name='workspace-channels'),
    path('workspaces/<int:workspace_id>/search/', views.SearchMessagesView.as_view(), name='search-messages'),
    path('my-channels/', views.UserChannelsView.as_view(), name='user-channels'),
]