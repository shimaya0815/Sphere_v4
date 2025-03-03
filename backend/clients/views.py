from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count
from django.shortcuts import get_object_or_404
from .models import Client, ClientCheckSetting, FiscalYear
from .serializers import ClientSerializer, ClientCheckSettingSerializer, FiscalYearSerializer
from business.permissions import IsSameBusiness
from tasks.serializers import TaskSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'client_code', 'email', 'corporate_number']
    ordering_fields = ['name', 'created_at', 'contract_status']
    ordering = ['name']
    
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
    def check_settings(self, request, pk=None):
        """Get check settings for this client."""
        client = self.get_object()
        check_settings = client.check_settings.all()
        serializer = ClientCheckSettingSerializer(check_settings, many=True)
        return Response(serializer.data)


class ClientCheckSettingViewSet(viewsets.ModelViewSet):
    queryset = ClientCheckSetting.objects.all()
    serializer_class = ClientCheckSettingSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['check_type', 'client__name']
    ordering_fields = ['client__name', 'check_type']
    ordering = ['client__name', 'check_type']
    
    def get_queryset(self):
        """Return check settings for the authenticated user's business."""
        queryset = ClientCheckSetting.objects.filter(client__business=self.request.user.business)
        
        # Apply additional filters from query parameters
        client_id = self.request.query_params.get('client_id', None)
        check_type = self.request.query_params.get('check_type', None)
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        if check_type:
            queryset = queryset.filter(check_type=check_type)
            
        return queryset
    
    def perform_create(self, serializer):
        """Create a check setting."""
        serializer.save()


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


class ClientCheckSettingsView(APIView):
    """View to manage check settings for a specific client."""
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_client(self, client_id, request):
        """Get the client object ensuring it belongs to the user's business."""
        return get_object_or_404(
            Client, 
            id=client_id, 
            business=request.user.business
        )
    
    def get(self, request, client_id):
        """Get all check settings for a client."""
        client = self.get_client(client_id, request)
        check_settings = client.check_settings.all()
        serializer = ClientCheckSettingSerializer(check_settings, many=True)
        return Response(serializer.data)
    
    def post(self, request, client_id):
        """Create a new check setting for a client."""
        client = self.get_client(client_id, request)
        
        # リクエストデータのコピーを作成し、client_idを追加（もし存在しない場合）
        data = request.data.copy()
        data['client'] = client.id
        
        serializer = ClientCheckSettingSerializer(data=data)
        
        if serializer.is_valid():
            serializer.save(client=client)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # エラーの詳細をログに出力（デバッグ用）
        print(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
