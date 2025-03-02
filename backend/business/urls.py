from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.BusinessViewSet)
router.register(r'workspaces', views.WorkspaceViewSet)
router.register(r'invitations', views.BusinessInvitationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('current/', views.CurrentBusinessView.as_view(), name='current-business'),
    path('invitations/accept/', views.AcceptInvitationView.as_view(), name='accept-invitation'),
    path('invitations/decline/', views.DeclineInvitationView.as_view(), name='decline-invitation'),
]