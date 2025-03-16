from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q as models_Q
from django.shortcuts import get_object_or_404
from .models import Client, FiscalYear, TaxRuleHistory, TaskTemplateSchedule, ClientTaskTemplate, ContractService, ClientContract
from .serializers import (
    ClientSerializer, FiscalYearSerializer,
    TaxRuleHistorySerializer, TaskTemplateScheduleSerializer,
    ClientTaskTemplateSerializer, ContractServiceSerializer, ClientContractSerializer
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
    
    @action(detail=True, methods=['get'])
    def task_templates(self, request, pk=None):
        """Get task templates for this client."""
        client = self.get_object()
        templates = client.task_templates.all()
        
        # Filter by active status if provided
        is_active = request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            templates = templates.filter(is_active=is_active_bool)
            
        serializer = ClientTaskTemplateSerializer(templates, many=True)
        return Response(serializer.data)


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


class TaskTemplateScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for task template schedules."""
    queryset = TaskTemplateSchedule.objects.all()
    serializer_class = TaskTemplateScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'schedule_type']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Return schedules for the authenticated user's business."""
        return TaskTemplateSchedule.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the business to the authenticated user's business when creating."""
        serializer.save(business=self.request.user.business)


class ClientTaskTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for client task templates."""
    queryset = ClientTaskTemplate.objects.all()
    serializer_class = ClientTaskTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'client__name']
    ordering_fields = ['order', 'title', 'created_at']
    ordering = ['order', 'title']
    
    def get_queryset(self):
        """Return templates for the authenticated user's business."""
        queryset = ClientTaskTemplate.objects.filter(client__business=self.request.user.business)
        
        # Filter by client if provided
        client_id = self.request.query_params.get('client_id', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        # Filter by active status if provided
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
            
        return queryset
    
    @action(detail=True, methods=['post'])
    def generate_task(self, request, pk=None):
        """Generate a task from this template."""
        template = self.get_object()
        task = template.generate_task()
        
        if task:
            serializer = TaskSerializer(task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {"error": "タスクの生成に失敗しました。テンプレートが無効か、スケジュール設定に問題があります。"},
                status=status.HTTP_400_BAD_REQUEST
            )


class ClientTaskTemplatesView(APIView):
    """View for retrieving all task templates for a client."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, client_id=None, format=None):
        """Get all task templates for a client."""
        try:
            client = Client.objects.get(id=client_id, business=request.user.business)
            task_templates = ClientTaskTemplate.objects.filter(client=client)
            serializer = ClientTaskTemplateSerializer(task_templates, many=True)
            return Response(serializer.data)
        except Client.DoesNotExist:
            return Response(
                {"detail": "Client not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    """View for retrieving tax rules for a client."""
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


# 新しく追加するViewSet
class ContractServiceViewSet(viewsets.ModelViewSet):
    """契約サービスタイプを管理するViewSet"""
    serializer_class = ContractServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """認証されたユーザーのビジネスに属する契約サービスのみ返す"""
        return ContractService.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        """作成時にビジネスを自動設定"""
        serializer.save(business=self.request.user.business)
    
    @action(detail=False, methods=['post'])
    def create_defaults(self, request):
        """デフォルトの契約サービスタイプを作成"""
        business = request.user.business
        
        # デフォルトのサービスタイプ
        defaults = [
            {"name": "顧問契約", "description": "会計顧問契約"},
            {"name": "記帳代行", "description": "月次記帳代行サービス"},
            {"name": "給与計算", "description": "月次給与計算"},
            {"name": "源泉所得税", "description": "源泉所得税の計算および納付"},
            {"name": "住民税対応", "description": "住民税の計算および納付"},
            {"name": "社会保険対応", "description": "社会保険の手続き"},
            {"name": "その他", "description": "その他のカスタムサービス", "is_custom": True}
        ]
        
        created = []
        for service in defaults:
            # すでに存在するか確認
            if not ContractService.objects.filter(business=business, name=service["name"]).exists():
                is_custom = service.get("is_custom", False)
                new_service = ContractService.objects.create(
                    business=business,
                    name=service["name"],
                    description=service.get("description", ""),
                    is_custom=is_custom
                )
                created.append(new_service)
        
        serializer = ContractServiceSerializer(created, many=True)
        return Response(
            {"detail": f"Created {len(created)} default services", "services": serializer.data},
            status=status.HTTP_201_CREATED
        )


class ClientContractViewSet(viewsets.ModelViewSet):
    """クライアント契約情報を管理するViewSet"""
    serializer_class = ClientContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """ユーザーのビジネスに属するクライアントの契約のみ返す"""
        return ClientContract.objects.filter(client__business=self.request.user.business)
    
    def perform_create(self, serializer):
        """契約作成時の処理"""
        # クライアントが正しいビジネスに属しているか確認
        client_id = self.request.data.get('client')
        if client_id:
            client = get_object_or_404(Client, id=client_id)
            if client.business != self.request.user.business:
                raise PermissionDenied("このクライアントにアクセスする権限がありません")
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def client_contracts(self, request):
        """特定のクライアントの契約一覧を取得"""
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response(
                {"detail": "client_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # クライアントが正しいビジネスに属しているか確認
        client = get_object_or_404(Client, id=client_id)
        if client.business != request.user.business:
            raise PermissionDenied("このクライアントにアクセスする権限がありません")
            
        contracts = ClientContract.objects.filter(client=client_id)
        serializer = ClientContractSerializer(contracts, many=True)
        return Response(serializer.data)
