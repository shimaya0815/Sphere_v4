from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Business, Workspace, BusinessInvitation
from .serializers import (
    BusinessSerializer, WorkspaceSerializer, BusinessInvitationSerializer,
    BusinessWithOwnerSerializer
)
from .permissions import IsBusinessOwner, IsBusinessMember, IsWorkspaceMember


class CurrentBusinessView(APIView):
    """API view to get the current user's business."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get the current user's business."""
        if not request.user.business:
            return Response({'error': 'User has no business'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BusinessWithOwnerSerializer(request.user.business)
        return Response(serializer.data)


class AcceptInvitationView(APIView):
    """API view to accept a business invitation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Accept an invitation by token."""
        token = request.data.get('token')
        invitation = get_object_or_404(BusinessInvitation, token=token)
        
        # Check if the invitation is for the current user
        if invitation.email != request.user.email:
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if invitation is still valid
        if invitation.status != 'pending' or invitation.expires_at < timezone.now():
            return Response(
                {'error': 'This invitation has expired or already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user's business
        request.user.business = invitation.business
        request.user.save()
        
        # Update invitation status
        invitation.status = 'accepted'
        invitation.save()
        
        return Response({'status': 'Invitation accepted'})


class DeclineInvitationView(APIView):
    """API view to decline a business invitation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Decline an invitation by token."""
        token = request.data.get('token')
        invitation = get_object_or_404(BusinessInvitation, token=token)
        
        # Check if the invitation is for the current user
        if invitation.email != request.user.email:
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update invitation status
        invitation.status = 'declined'
        invitation.save()
        
        return Response({'status': 'Invitation declined'})


class BusinessViewSet(viewsets.ModelViewSet):
    """ViewSet for businesses."""
    
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == 'retrieve' or self.action == 'list':
            return BusinessWithOwnerSerializer
        return self.serializer_class
    
    def get_queryset(self):
        """Return only businesses the user is a member of."""
        user = self.request.user
        return Business.objects.filter(users=user)
    
    def get_permissions(self):
        """Return appropriate permissions based on action."""
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsBusinessOwner]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'])
    def invite_user(self, request, pk=None):
        """Invite a user to join the business."""
        business = self.get_object()
        
        # Check if user is the owner
        if business.owner != request.user:
            return Response(
                {'error': 'Only the business owner can invite users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BusinessInvitationSerializer(
            data={'business': business.id, 'email': request.data.get('email')},
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def workspaces(self, request, pk=None):
        """List all workspaces for a business."""
        business = self.get_object()
        workspaces = business.workspaces.all()
        serializer = WorkspaceSerializer(workspaces, many=True)
        return Response(serializer.data)


class WorkspaceViewSet(viewsets.ModelViewSet):
    """ViewSet for workspaces."""
    
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]
    
    def get_queryset(self):
        """Return only workspaces from businesses the user is a member of."""
        user = self.request.user
        return Workspace.objects.filter(business__users=user)
    
    def perform_create(self, serializer):
        """Create a new workspace."""
        business_id = self.request.data.get('business')
        business = get_object_or_404(Business, id=business_id, users=self.request.user)
        serializer.save(business=business)


class BusinessInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for business invitations."""
    
    queryset = BusinessInvitation.objects.all()
    serializer_class = BusinessInvitationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return invitations sent by the user or for the user's email."""
        user = self.request.user
        return BusinessInvitation.objects.filter(inviter=user) | \
               BusinessInvitation.objects.filter(email=user.email)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept an invitation."""
        invitation = self.get_object()
        
        # Check if the invitation is for the current user
        if invitation.email != request.user.email:
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if invitation is still valid
        if invitation.status != 'pending' or invitation.expires_at < timezone.now():
            return Response(
                {'error': 'This invitation has expired or already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user's business
        request.user.business = invitation.business
        request.user.save()
        
        # Update invitation status
        invitation.status = 'accepted'
        invitation.save()
        
        return Response({'status': 'Invitation accepted'})
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline an invitation."""
        invitation = self.get_object()
        
        # Check if the invitation is for the current user
        if invitation.email != request.user.email:
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update invitation status
        invitation.status = 'declined'
        invitation.save()
        
        return Response({'status': 'Invitation declined'})
