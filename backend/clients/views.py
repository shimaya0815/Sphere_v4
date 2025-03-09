from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q as models_Q
from django.shortcuts import get_object_or_404
from .models import Client, FiscalYear, ClientTaskTemplate, TaxRuleHistory
from .serializers import (
    ClientSerializer, FiscalYearSerializer,
    ClientTaskTemplateSerializer, TaxRuleHistorySerializer
)
from business.permissions import IsSameBusiness
from tasks.serializers import TaskSerializer
from tasks.models import Task


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'client_code', 'email', 'corporate_number']
    ordering_fields = ['name', 'created_at', 'contract_status']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def tax_rules(self, request, pk=None):
        """Get tax rules for this client."""
        client = self.get_object()
        tax_rules = client.tax_rule_histories.all()
        
        # Filter by tax_type if provided
        tax_type = request.query_params.get('tax_type', None)
        if tax_type:
            tax_rules = tax_rules.filter(tax_type=tax_type)
        
        # Filter current rules if requested
        is_current = request.query_params.get('is_current', None)
        if is_current and is_current.lower() == 'true':
            # Get current date
            from django.utils import timezone
            today = timezone.now().date()
            # Filter rules that are current
            tax_rules = tax_rules.filter(
                start_date__lte=today
            ).filter(
                models_Q(end_date__isnull=True) | models_Q(end_date__gte=today)
            )
            
        serializer = TaxRuleHistorySerializer(tax_rules, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """Return clients for the authenticated user's business."""
        queryset = Client.objects.filter(business=self.request.user.business)
        
        # Apply additional filters from query parameters
        contract_status = self.request.query_params.get('contract_status', None)
        if contract_status:
            queryset = queryset.filter(contract_status=contract_status)
            
        return queryset
    
    def perform_create(self, serializer):
        """Set the business to the authenticated user's business when creating a client."""
        serializer.save(business=self.request.user.business)
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Get tasks for this client."""
        client = self.get_object()
        tasks = client.tasks.all()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def fiscal_years(self, request, pk=None):
        """Get fiscal years for this client."""
        client = self.get_object()
        fiscal_years = client.fiscal_years.all()
        serializer = FiscalYearSerializer(fiscal_years, many=True)
        return Response(serializer.data)
    
    # check_settings action was removed and merged into task_templates
        
    # タスクテンプレート関連のメソッドは削除されました


# ClientCheckSettingViewSet was removed and merged into ClientTaskTemplateViewSet


class FiscalYearViewSet(viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['client__name', 'fiscal_period']
    ordering_fields = ['fiscal_period', 'start_date', 'end_date']
    ordering = ['-fiscal_period']
    
    def get_queryset(self):
        """Return fiscal years for the authenticated user's business."""
        queryset = FiscalYear.objects.filter(client__business=self.request.user.business)
        
        # Filter by client if client_id is provided
        client_id = self.request.query_params.get('client_id', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Filter by current if current is provided
        is_current = self.request.query_params.get('is_current', None)
        if is_current and is_current.lower() == 'true':
            queryset = queryset.filter(is_current=True)
            
        return queryset
    
    def perform_create(self, serializer):
        """Create a fiscal year."""
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def set_current(self, request, pk=None):
        """Set this fiscal year as the current one for this client."""
        fiscal_year = self.get_object()
        
        # If this fiscal year is locked, don't allow changes
        if fiscal_year.is_locked:
            return Response(
                {"error": "この決算期はロックされているため、現在の期として設定できません。"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set this as current, the save method will handle unsetting others
        fiscal_year.is_current = True
        fiscal_year.save()
        
        serializer = self.get_serializer(fiscal_year)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_lock(self, request, pk=None):
        """Toggle the lock status of this fiscal year."""
        fiscal_year = self.get_object()
        
        # Don't allow unlocking if there are tasks dependent on this fiscal year
        if fiscal_year.is_locked and hasattr(fiscal_year, 'tasks') and fiscal_year.tasks.exists():
            return Response(
                {"error": "このロックされた決算期には関連するタスクがあるため、ロック解除できません。"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fiscal_year.is_locked = not fiscal_year.is_locked
        fiscal_year.save()
        
        serializer = self.get_serializer(fiscal_year)
        return Response(serializer.data)


class ClientPrefecturesView(APIView):
    """View to get unique prefectures with counts."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get a list of unique prefectures with counts."""
        # Get the user's business
        business = request.user.business
        
        # Get prefectures with counts
        prefectures = Client.objects.filter(business=business) \
            .values('prefecture') \
            .annotate(count=Count('prefecture')) \
            .exclude(prefecture='') \
            .order_by('prefecture')
        
        return Response(prefectures)


class ClientIndustriesView(APIView):
    """View to get unique industries."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get a list of unique industries."""
        # この機能は未実装のため、空のリストを返す
        # 本来はClient modelに industry フィールドがあり、
        # そこから一意なリストを返す処理になる
        return Response([])


class ClientFiscalYearsView(APIView):
    """View to manage fiscal years for a specific client."""
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_client(self, client_id, request):
        """Get the client object ensuring it belongs to the user's business."""
        return get_object_or_404(
            Client, 
            id=client_id, 
            business=request.user.business
        )
    
    def get(self, request, client_id):
        """Get all fiscal years for a client."""
        client = self.get_client(client_id, request)
        fiscal_years = client.fiscal_years.all().order_by('-fiscal_period')
        
        # Filter by current if requested
        is_current = request.query_params.get('is_current', None)
        if is_current and is_current.lower() == 'true':
            fiscal_years = fiscal_years.filter(is_current=True)
        
        serializer = FiscalYearSerializer(fiscal_years, many=True)
        return Response(serializer.data)
    
    def post(self, request, client_id):
        """Create a new fiscal year for a client."""
        client = self.get_client(client_id, request)
        
        # Check if we need to auto-calculate fiscal period
        data = request.data.copy()
        if 'fiscal_period' not in data or not data['fiscal_period']:
            # Get the highest fiscal period and increment
            highest_period = client.fiscal_years.order_by('-fiscal_period').first()
            data['fiscal_period'] = (highest_period.fiscal_period + 1) if highest_period else 1
        
        # Handle auto setting current fiscal year for first fiscal year
        if client.fiscal_years.count() == 0:
            data['is_current'] = True
        
        serializer = FiscalYearSerializer(data=data)
        
        if serializer.is_valid():
            serializer.save(client=client)
            
            # Update the client's fiscal_year and fiscal_date fields if this is current
            if serializer.instance.is_current:
                client.fiscal_year = serializer.instance.fiscal_period
                client.fiscal_date = serializer.instance.end_date
                client.save(update_fields=['fiscal_year', 'fiscal_date'])
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ClientCheckSettingsView was removed and merged into ClientTaskTemplatesView


# ClientTaskTemplateViewSetは削除されました


class TaxRuleHistoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax rule histories."""
    queryset = TaxRuleHistory.objects.all()
    serializer_class = TaxRuleHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['client__name', 'tax_type', 'rule_type']
    ordering_fields = ['start_date', 'end_date', 'tax_type', 'rule_type']
    ordering = ['-start_date']
    
    def get_queryset(self):
        """Return tax rules for the authenticated user's business."""
        queryset = TaxRuleHistory.objects.filter(client__business=self.request.user.business)
        
        # Filter by client if client_id is provided
        client_id = self.request.query_params.get('client_id', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Filter by tax_type if provided
        tax_type = self.request.query_params.get('tax_type', None)
        if tax_type:
            queryset = queryset.filter(tax_type=tax_type)
            
        # Filter by rule_type if provided
        rule_type = self.request.query_params.get('rule_type', None)
        if rule_type:
            queryset = queryset.filter(rule_type=rule_type)
            
        # Filter current rules if requested
        is_current = self.request.query_params.get('is_current', None)
        if is_current and is_current.lower() == 'true':
            # Get current date
            from django.utils import timezone
            today = timezone.now().date()
            # Filter rules that are current (start_date <= today and (end_date is null or end_date >= today))
            queryset = queryset.filter(
                start_date__lte=today
            ).filter(
                models_Q(end_date__isnull=True) | models_Q(end_date__gte=today)
            )
            
        return queryset
    
    def perform_create(self, serializer):
        """Create a tax rule."""
        serializer.save()


class ClientTaxRulesView(APIView):
    """View to manage tax rules for a specific client."""
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_client(self, client_id, request):
        """Get the client object ensuring it belongs to the user's business."""
        return get_object_or_404(
            Client, 
            id=client_id, 
            business=request.user.business
        )
    
    def get(self, request, client_id):
        """Get all tax rules for a client."""
        client = self.get_client(client_id, request)
        
        # Filter by tax_type if provided
        tax_type = request.query_params.get('tax_type', None)
        tax_rules = client.tax_rule_histories.all()
        
        if tax_type:
            tax_rules = tax_rules.filter(tax_type=tax_type)
        
        # Filter current rules if requested
        is_current = request.query_params.get('is_current', None)
        if is_current and is_current.lower() == 'true':
            # Get current date
            from django.utils import timezone
            today = timezone.now().date()
            # Filter rules that are current
            tax_rules = tax_rules.filter(
                start_date__lte=today
            ).filter(
                models_Q(end_date__isnull=True) | models_Q(end_date__gte=today)
            )
            
        serializer = TaxRuleHistorySerializer(tax_rules, many=True)
        return Response(serializer.data)
    
    def post(self, request, client_id):
        """Create a new tax rule for a client."""
        client = self.get_client(client_id, request)
        
        # リクエストデータのコピーを作成し、client_idを追加
        data = request.data.copy()
        data['client'] = client.id
        
        serializer = TaxRuleHistorySerializer(data=data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ClientTaskTemplatesViewは削除されました
