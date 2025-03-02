from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'contracts', views.ClientContractViewSet)
router.register(r'notes', views.ClientNoteViewSet)
router.register(r'', views.ClientViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('industries/', views.ClientIndustriesView.as_view(), name='client-industries'),
]