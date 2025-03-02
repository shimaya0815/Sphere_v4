from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 単一ルーターでURLを構成
router = DefaultRouter()
router.register(r'', views.TaskViewSet)
router.register(r'categories', views.TaskCategoryViewSet)
router.register(r'statuses', views.TaskStatusViewSet)
router.register(r'priorities', views.TaskPriorityViewSet)
router.register(r'comments', views.TaskCommentViewSet)
router.register(r'attachments', views.TaskAttachmentViewSet)
router.register(r'timers', views.TaskTimerViewSet)
router.register(r'templates', views.TaskTemplateViewSet)

urlpatterns = [
    path('', include(router.urls)),
]