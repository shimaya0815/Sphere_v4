from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'workspaces', views.WorkspaceViewSet, basename='workspace')
router.register(r'', views.BusinessViewSet, basename='business')

urlpatterns = [
    path('', include(router.urls)),
    path('users/', views.BusinessUserListView.as_view(), name='business-users'),
]