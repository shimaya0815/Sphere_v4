from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Max, F, Prefetch
from django.utils import timezone
from .models import Channel, ChannelMembership, Message, MessageAttachment, MessageReaction
from business.permissions import IsSameBusiness, IsWorkspaceMember
from business.models import Workspace
from .serializers import (
    ChannelSerializer, ChannelDetailSerializer, MessageSerializer, 
    MessageCreateSerializer, MessageAttachmentSerializer, MessageReactionSerializer,
    ChannelMembershipSerializer, DirectMessageChannelSerializer, UserMiniSerializer
)

User = get_user_model()


class ChannelViewSet(viewsets.ModelViewSet):
    """ViewSet for chat channels."""
    queryset = Channel.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filterset_fields = ['workspace', 'channel_type']
    search_fields = ['name', 'description']
    
    def get_serializer_class(self):
        if self.action == 'retrieve' or self.action == 'members':
            return ChannelDetailSerializer
        return ChannelSerializer
    
    def get_queryset(self):
        """Return channels from the authenticated user's workspaces."""
        queryset = Channel.objects.filter(
            workspace__business=self.request.user.business
        )
        
        # Only include channels the user is a member of or public channels
        queryset = queryset.filter(
            Q(members=self.request.user) | Q(channel_type='public')
        )
        
        # Annotate with last_message_time for ordering
        queryset = queryset.annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time', 'name')
        
        return queryset.distinct()
    
    def perform_create(self, serializer):
        """Set created_by and add the creator as a member when creating a channel."""
        channel = serializer.save(created_by=self.request.user)
        
        # Add creator as member and admin
        ChannelMembership.objects.create(
            channel=channel,
            user=self.request.user,
            is_admin=True
        )
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get messages for a channel."""
        channel = self.get_object()
        
        # Get query parameters for pagination and filtering
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        before_id = request.query_params.get('before_id')
        after_id = request.query_params.get('after_id')
        
        # Base query for parent messages (not thread replies)
        messages_query = channel.messages.filter(parent_message__isnull=True)
        
        # Apply before/after filters if provided
        if before_id:
            try:
                before_message = Message.objects.get(id=before_id)
                messages_query = messages_query.filter(created_at__lt=before_message.created_at)
            except Message.DoesNotExist:
                pass
                
        if after_id:
            try:
                after_message = Message.objects.get(id=after_id)
                messages_query = messages_query.filter(created_at__gt=after_message.created_at)
            except Message.DoesNotExist:
                pass
        
        # Get messages with pagination
        messages = messages_query.order_by('-created_at')[offset:offset+limit]
        
        # Prefetch related data for performance
        messages = messages.prefetch_related(
            'attachments', 
            'reactions', 
            'mentioned_users',
            Prefetch('thread_messages', queryset=Message.objects.order_by('created_at'))
        )
        
        serializer = MessageSerializer(messages, many=True)
        
        return Response({
            'results': serializer.data,
            'count': messages_query.count()
        })
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get members of a channel."""
        channel = self.get_object()
        memberships = channel.memberships.select_related('user').all()
        serializer = ChannelMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a member to the channel."""
        channel = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists and is in the same business
        try:
            user = User.objects.get(id=user_id, business=request.user.business)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is already a member
        if channel.members.filter(id=user_id).exists():
            return Response({'error': 'User is already a member'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add user to channel
        membership = ChannelMembership.objects.create(
            channel=channel,
            user=user,
            is_admin=False
        )
        
        serializer = ChannelMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remove a member from the channel."""
        channel = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is a member
        membership = channel.memberships.filter(user_id=user_id).first()
        if not membership:
            return Response({'error': 'User is not a member'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if requesting user has permission (admin or self-removal)
        requester_membership = channel.memberships.filter(user=request.user).first()
        if not requester_membership.is_admin and str(request.user.id) != user_id:
            return Response(
                {'error': 'You do not have permission to remove this member'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Remove the membership
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for chat messages."""
    queryset = Message.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MessageCreateSerializer
        return MessageSerializer
    
    def get_queryset(self):
        """Return messages from channels the authenticated user is a member of."""
        return Message.objects.filter(
            channel__workspace__business=self.request.user.business,
            channel__members=self.request.user
        ).select_related('user', 'channel', 'parent_message').prefetch_related(
            'attachments', 'reactions', 'mentioned_users'
        )
    
    def perform_create(self, serializer):
        """Set the user field to the authenticated user when creating a message."""
        message = serializer.save(user=self.request.user)
        
        # Handle file attachments
        files = self.request.FILES.getlist('files')
        for file in files:
            MessageAttachment.objects.create(
                message=message,
                file=file,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size
            )
        
        return message
    
    @action(detail=True, methods=['get'])
    def thread(self, request, pk=None):
        """Get thread messages for a parent message."""
        parent_message = self.get_object()
        thread_messages = parent_message.thread_messages.all().order_by('created_at')
        thread_messages = thread_messages.prefetch_related('attachments', 'reactions', 'mentioned_users')
        serializer = MessageSerializer(thread_messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Add a reaction to a message."""
        message = self.get_object()
        emoji = request.data.get('emoji')
        
        if not emoji:
            return Response({'error': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Toggle reaction: remove if exists, add if doesn't
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        if not created:
            reaction.delete()
            return Response({'status': 'reaction removed'})
        
        serializer = MessageReactionSerializer(reaction)
        return Response(serializer.data)


class DirectMessageViewSet(viewsets.ViewSet):
    """ViewSet for direct messages."""
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def create(self, request):
        """Create or get a direct message channel with another user."""
        serializer = DirectMessageChannelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = serializer.validated_data['user_id']
        
        # Check if user exists and is in the same business
        try:
            target_user = User.objects.get(id=user_id, business=request.user.business)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if a DM channel already exists between these users
        existing_channels = Channel.objects.filter(
            is_direct_message=True,
            workspace__business=request.user.business,
            members=request.user
        ).filter(
            members=target_user
        )
        
        if existing_channels.exists():
            channel = existing_channels.first()
            serializer = ChannelDetailSerializer(channel)
            return Response(serializer.data)
        
        # Create new DM channel
        # First, get the default workspace
        workspace = Workspace.objects.filter(
            business=request.user.business
        ).first()
        
        if not workspace:
            return Response(
                {'error': 'No workspace available for your business'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the DM channel
        dm_name = f"DM: {request.user.get_full_name()} and {target_user.get_full_name()}"
        channel = Channel.objects.create(
            name=dm_name,
            workspace=workspace,
            channel_type='direct',
            is_direct_message=True,
            created_by=request.user
        )
        
        # Add both users as members
        ChannelMembership.objects.create(channel=channel, user=request.user)
        ChannelMembership.objects.create(channel=channel, user=target_user)
        
        serializer = ChannelDetailSerializer(channel)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WorkspaceChannelsView(APIView):
    """API view to get channels for a workspace."""
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    
    def get(self, request, workspace_id):
        """Get channels for a workspace."""
        workspace = get_object_or_404(
            Workspace, 
            id=workspace_id, 
            business=request.user.business
        )
        
        # Get all accessible channels for this user in the workspace
        channels = Channel.objects.filter(
            workspace=workspace
        ).filter(
            Q(channel_type='public') | 
            Q(members=request.user)
        ).distinct()
        
        # Annotate with useful data
        channels = channels.annotate(
            members_count=Count('members', distinct=True),
            last_activity=Max('messages__created_at')
        ).order_by('-last_activity', 'name')
        
        serializer = ChannelSerializer(channels, many=True)
        return Response(serializer.data)


class SearchMessagesView(APIView):
    """API view to search messages in a workspace."""
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    
    def get(self, request, workspace_id):
        """Search messages in a workspace."""
        workspace = get_object_or_404(
            Workspace, 
            id=workspace_id, 
            business=request.user.business
        )
        
        query = request.query_params.get('query', '')
        
        if not query:
            return Response(
                {'error': 'query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get messages from channels the user is a member of
        messages = Message.objects.filter(
            channel__workspace=workspace,
            channel__members=request.user,
            content__icontains=query
        ).order_by('-created_at')
        
        # Apply pagination
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        
        paginated_messages = messages[offset:offset+limit]
        
        # Prefetch related data
        paginated_messages = paginated_messages.select_related('user', 'channel')
        
        serializer = MessageSerializer(paginated_messages, many=True)
        return Response({
            'results': serializer.data,
            'count': messages.count()
        })


class UserChannelsView(APIView):
    """API view to get channels for the current user."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get all channels for the current user across workspaces."""
        # Get all channels the user is a member of
        channels = Channel.objects.filter(
            workspace__business=request.user.business,
            members=request.user
        )
        
        # Add unread message counts
        channels = channels.annotate(
            unread_count=Count(
                'messages',
                filter=Q(
                    messages__created_at__gt=F('memberships__user__last_login'),
                    messages__user__ne=request.user
                )
            )
        )
        
        # Group by workspace for easier frontend organization
        workspaces = Workspace.objects.filter(
            business=request.user.business
        ).prefetch_related(
            Prefetch(
                'channels', 
                queryset=channels,
                to_attr='user_channels'
            )
        )
        
        data = []
        for workspace in workspaces:
            data.append({
                'workspace': {
                    'id': workspace.id,
                    'name': workspace.name
                },
                'channels': ChannelSerializer(workspace.user_channels, many=True).data
            })
            
        return Response(data)
