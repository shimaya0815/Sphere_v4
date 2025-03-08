from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'check-settings', views.ClientCheckSettingViewSet)
router.register(r'fiscal-years', views.FiscalYearViewSet)
router.register(r'task-templates', views.ClientTaskTemplateViewSet)
router.register(r'tax-rules', views.TaxRuleHistoryViewSet)
router.register(r'', views.ClientViewSet)

urlpatterns = [
    path('prefectures/', views.ClientPrefecturesView.as_view(), name='client-prefectures'),
    path('industries/', views.ClientIndustriesView.as_view(), name='client-industries'),
    path('<int:client_id>/fiscal-years/', views.ClientFiscalYearsView.as_view(), name='client-fiscal-years'),
    path('<int:client_id>/check-settings/', views.ClientCheckSettingsView.as_view(), name='client-check-settings'),
    path('<int:client_id>/task-templates/', views.ClientTaskTemplatesView.as_view(), name='client-task-templates'),
    path('<int:client_id>/tax-rules/', views.ClientTaxRulesView.as_view(), name='client-tax-rules'),
    path('', include(router.urls)),
]