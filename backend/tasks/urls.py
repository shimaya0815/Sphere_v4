from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# メインルーターを使用
router = DefaultRouter()
router.register(r'categories', views.TaskCategoryViewSet, basename='category')
router.register(r'statuses', views.TaskStatusViewSet, basename='status')
router.register(r'priorities', views.TaskPriorityViewSet, basename='priority')
router.register(r'templates', views.TaskTemplateViewSet, basename='template')
router.register(r'comments', views.TaskCommentViewSet, basename='comment')
router.register(r'attachments', views.TaskAttachmentViewSet, basename='attachment')
router.register(r'timers', views.TaskTimerViewSet, basename='timer')
router.register(r'notifications', views.TaskNotificationViewSet, basename='notification')
# メインのタスクViewSetもルーターに登録
router.register(r'', views.TaskViewSet, basename='task')

# URLパターン
urlpatterns = [
    # ルーター生成のURLパターンを使用
    path('', include(router.urls)),
    
    # カスタムアクション
    path('<int:pk>/mark_complete/', views.TaskViewSet.as_view({
        'post': 'mark_complete'
    }), name='task-mark-complete'),
    
    path('<int:pk>/change-status/', views.TaskViewSet.as_view({
        'post': 'change_status'
    }), name='task-change-status'),
    
    # タイマーアクション
    path('<int:pk>/timers/start/', views.TaskViewSet.as_view({
        'post': 'start_timer'
    }), name='task-timer-start'),
    
    path('<int:pk>/timers/stop/', views.TaskViewSet.as_view({
        'post': 'stop_timer'
    }), name='task-timer-stop'),
    
    # 通知アクション
    path('notifications/mark-all-read/', views.TaskNotificationViewSet.as_view({
        'post': 'mark_all_as_read'
    }), name='notifications-mark-all-read'),
    
    path('notifications/<int:pk>/mark-read/', views.TaskNotificationViewSet.as_view({
        'post': 'mark_as_read'
    }), name='notification-mark-read'),
    
    path('notifications/unread-count/', views.TaskNotificationViewSet.as_view({
        'get': 'unread_count'
    }), name='notifications-unread-count'),
]