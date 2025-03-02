from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count
from .models import Client, ClientContract, ClientNote
from .serializers import ClientSerializer, ClientContractSerializer, ClientNoteSerializer
from business.permissions import IsSameBusiness
from tasks.serializers import TaskSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_name', 'email', 'industry']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Return clients for the authenticated user's business."""
        queryset = Client.objects.filter(business=self.request.user.business)
        
        # Apply additional filters from query parameters
        industry = self.request.query_params.get('industry', None)
        if industry:
            queryset = queryset.filter(industry__icontains=industry)
            
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


class ClientContractViewSet(viewsets.ModelViewSet):
    queryset = ClientContract.objects.all()
    serializer_class = ClientContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'client__name']
    ordering_fields = ['start_date', 'end_date', 'status', 'value']
    ordering = ['-start_date']
    
    def get_queryset(self):
        """Return contracts for the authenticated user's business."""
        queryset = ClientContract.objects.filter(client__business=self.request.user.business)
        
        # Apply additional filters from query parameters
        status = self.request.query_params.get('status', None)
        client_id = self.request.query_params.get('client_id', None)
        
        if status:
            queryset = queryset.filter(status=status)
            
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        return queryset
    
    def perform_create(self, serializer):
        """Set the created_by field to the authenticated user when creating a contract."""
        serializer.save(created_by=self.request.user)


class ClientNoteViewSet(viewsets.ModelViewSet):
    queryset = ClientNote.objects.all()
    serializer_class = ClientNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return notes for the authenticated user's business."""
        queryset = ClientNote.objects.filter(client__business=self.request.user.business)
        
        # Filter by client if client_id is provided
        client_id = self.request.query_params.get('client_id', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        return queryset
    
    def perform_create(self, serializer):
        """Set the user field to the authenticated user when creating a note."""
        serializer.save(user=self.request.user)


class ClientIndustriesView(APIView):
    """View to get unique industries with counts."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get a list of unique industries with counts."""
        # Get the user's business
        business = request.user.business
        
        # Get industries with counts
        industries = Client.objects.filter(business=business) \
            .values('industry') \
            .annotate(count=Count('industry')) \
            .exclude(industry='') \
            .order_by('industry')
        
        return Response(industries)
