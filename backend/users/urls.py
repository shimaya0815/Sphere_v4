from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('profile', views.UserProfileViewSet)
router.register('preferences', views.UserPreferencesViewSet)

urlpatterns = [
    path('me/', views.UserMeView.as_view(), name='user-me'),
    path('', views.BusinessAuthTokenView.as_view(), name='login-with-business'),
    path('register/', views.UserCreateView.as_view(), name='user-register'),
    path('workers/', views.UserProfileViewSet.as_view({'get': 'workers'}), name='user-workers'),
    path('reviewers/', views.UserProfileViewSet.as_view({'get': 'reviewers'}), name='user-reviewers'),
]

urlpatterns += router.urls