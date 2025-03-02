from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'entries', views.TimeEntryViewSet)
router.register(r'reports', views.TimeReportViewSet)
router.register(r'breaks', views.BreakViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardSummaryView.as_view(), name='dashboard'),
    path('entries/start/', views.StartTimeEntryView.as_view(), name='start-time-entry'),
    path('entries/<int:entry_id>/stop/', views.StopTimeEntryView.as_view(), name='stop-time-entry'),
    path('entries/<int:entry_id>/breaks/start/', views.StartBreakView.as_view(), name='start-break'),
    path('reports/generate/', views.GenerateReportView.as_view(), name='generate-report'),
]