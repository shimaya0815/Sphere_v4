from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pages', views.WikiPageViewSet)
router.register(r'attachments', views.WikiAttachmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.SearchWikiPagesView.as_view(), name='search-wiki'),
    path('structure/', views.WikiStructureView.as_view(), name='wiki-structure'),
    path('pages/reorder/', views.ReorderPagesView.as_view(), name='reorder-pages'),
    path('stats/', views.WikiStatsView.as_view(), name='wiki-stats'),
]