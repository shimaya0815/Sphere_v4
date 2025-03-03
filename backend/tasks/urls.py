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
    
    # タイマーアクション
    path('<int:pk>/timers/start/', views.TaskViewSet.as_view({
        'post': 'start_timer'
    }), name='task-timer-start'),
    
    path('<int:pk>/timers/stop/', views.TaskViewSet.as_view({
        'post': 'stop_timer'
    }), name='task-timer-stop'),
]