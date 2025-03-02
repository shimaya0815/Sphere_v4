from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pages', views.WikiPageViewSet)
router.register(r'attachments', views.WikiAttachmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.SearchWikiPagesView.as_view(), name='search-wiki'),
    path('pages/<int:page_id>/children/', views.ChildPagesView.as_view(), name='child-pages'),
    path('pages/reorder/', views.ReorderPagesView.as_view(), name='reorder-pages'),
]