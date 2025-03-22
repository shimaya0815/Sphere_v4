from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientViewSet, ClientPrefecturesView, ClientIndustriesView,
    ClientFiscalYearsView, ClientTaskTemplateViewSet, ClientTaskTemplatesView,
    ClientTaxRulesView, ContractServiceViewSet, ClientContractViewSet,
    TaxRuleHistoryViewSet, TaskTemplateScheduleViewSet
)

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'client-task-templates', ClientTaskTemplateViewSet, basename='client-task-template')
router.register(r'contract-services', ContractServiceViewSet, basename='contract-service')
router.register(r'client-contracts', ClientContractViewSet, basename='client-contract')
router.register(r'tax-rules', TaxRuleHistoryViewSet, basename='tax-rule')
router.register(r'schedules', TaskTemplateScheduleViewSet, basename='schedule')

urlpatterns = [
    path('', include(router.urls)),
    path('clients/<int:client_id>/fiscal-years/', ClientFiscalYearsView.as_view(), name='client-fiscal-years'),
    path('clients/<int:client_id>/task-templates/', ClientTaskTemplatesView.as_view(), name='client-task-templates'),
    path('clients/<int:client_id>/tax-rules/', ClientTaxRulesView.as_view(), name='client-tax-rules'),
    path('clients/prefectures/', ClientPrefecturesView.as_view(), name='client-prefectures'),
    path('clients/industries/', ClientIndustriesView.as_view(), name='client-industries'),
    path('contract-services/create-defaults/', ContractServiceViewSet.as_view({'post': 'create_defaults'}), name='create-default-services'),
    path('client-contracts/client/', ClientContractViewSet.as_view({'get': 'client_contracts'}), name='client-contracts-list'),
]