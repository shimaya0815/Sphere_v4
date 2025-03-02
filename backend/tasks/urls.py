from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# メインのViewSetをルータに登録
task_router = DefaultRouter()
task_router.register(r'', views.TaskViewSet, basename='task')

# カテゴリー、ステータス、優先度のViewSetを登録
category_router = DefaultRouter()
category_router.register(r'', views.TaskCategoryViewSet, basename='category')

status_router = DefaultRouter()
status_router.register(r'', views.TaskStatusViewSet, basename='status')

priority_router = DefaultRouter()
priority_router.register(r'', views.TaskPriorityViewSet, basename='priority')

# その他のViewSetを登録
comment_router = DefaultRouter()
comment_router.register(r'', views.TaskCommentViewSet, basename='comment')

attachment_router = DefaultRouter()
attachment_router.register(r'', views.TaskAttachmentViewSet, basename='attachment')

timer_router = DefaultRouter()
timer_router.register(r'', views.TaskTimerViewSet, basename='timer')

template_router = DefaultRouter()
template_router.register(r'', views.TaskTemplateViewSet, basename='template')

# URLパターンの定義
urlpatterns = [
    path('', include(task_router.urls)),
    path('categories/', include(category_router.urls)),
    path('statuses/', include(status_router.urls)),
    path('priorities/', include(priority_router.urls)),
    path('comments/', include(comment_router.urls)),
    path('attachments/', include(attachment_router.urls)),
    path('timers/', include(timer_router.urls)),
    path('templates/', include(template_router.urls)),
]