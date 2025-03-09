from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'fiscal-years', views.FiscalYearViewSet)
# task-templates が削除されました
router.register(r'tax-rules', views.TaxRuleHistoryViewSet)
router.register(r'', views.ClientViewSet)

urlpatterns = [
    path('prefectures/', views.ClientPrefecturesView.as_view(), name='client-prefectures'),
    path('industries/', views.ClientIndustriesView.as_view(), name='client-industries'),
    path('<int:client_id>/fiscal-years/', views.ClientFiscalYearsView.as_view(), name='client-fiscal-years'),
    # タスクテンプレート設定が削除されました
    path('<int:client_id>/tax-rules/', views.ClientTaxRulesView.as_view(), name='client-tax-rules'),
    path('', include(router.urls)),
]