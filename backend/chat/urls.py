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
    # 明示的にmessages/mark_readエンドポイントを追加
    path('messages/mark_read/', views.MessageViewSet.as_view({'post': 'mark_read'}), name='message-mark-read'),
    # 明示的にチャンネルメッセージエンドポイントを追加
    path('channels/<int:pk>/messages/', views.ChannelViewSet.as_view({'get': 'messages'}), name='channel-messages'),
    # 明示的にデフォルトワークスペース取得エンドポイントを追加
    path('default-workspace/', views.DefaultWorkspaceView.as_view(), name='default-workspace'),
]