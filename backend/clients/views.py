from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Client, ClientContract, ClientNote
from business.permissions import IsSameBusiness


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_name', 'email', 'industry']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Return clients for the authenticated user's business."""
        return Client.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the business to the authenticated user's business when creating a client."""
        serializer.save(business=self.request.user.business)
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Get tasks for this client."""
        client = self.get_object()
        tasks = client.tasks.all()
        # In a real implementation, you'd serialize the tasks here
        return Response({'count': tasks.count()})


class ClientContractViewSet(viewsets.ModelViewSet):
    queryset = ClientContract.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return contracts for the authenticated user's business."""
        return ClientContract.objects.filter(client__business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the created_by field to the authenticated user when creating a contract."""
        serializer.save(created_by=self.request.user)


class ClientNoteViewSet(viewsets.ModelViewSet):
    queryset = ClientNote.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notes for the authenticated user's business."""
        return ClientNote.objects.filter(client__business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the user field to the authenticated user when creating a note."""
        serializer.save(user=self.request.user)
