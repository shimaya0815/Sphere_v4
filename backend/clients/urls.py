from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.ClientViewSet)
router.register(r'contracts', views.ClientContractViewSet)
router.register(r'notes', views.ClientNoteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]