from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'entries', views.TimeEntryViewSet)
router.register(r'reports', views.TimeReportViewSet)
router.register(r'breaks', views.BreakViewSet)
router.register(r'analytics', views.DailyAnalyticsViewSet)
router.register(r'timer', views.StartTimeEntryViewSet, basename='timer')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardSummaryView.as_view(), name='dashboard'),
    path('timer/start/', views.StartTimeEntryViewSet.as_view({'post': 'create'}), name='start-time-entry'),
    path('timer/<int:entry_id>/stop/', views.StopTimeEntryViewSet.as_view({'post': 'create'}), name='stop-time-entry'),
    path('entries/<int:entry_id>/breaks/start/', views.StartBreakView.as_view(), name='start-break'),
    path('breaks/<int:break_id>/stop/', views.StopBreakView.as_view(), name='stop-break'),
    path('reports/generate/', views.GenerateReportView.as_view(), name='generate-report'),
    path('analytics/generate/', views.DailyAnalyticsViewSet.as_view({'get': 'generate'}), name='generate-analytics'),
    path('analytics/chart-data/', views.DailyAnalyticsViewSet.as_view({'get': 'chart_data'}), name='analytics-chart-data'),
]