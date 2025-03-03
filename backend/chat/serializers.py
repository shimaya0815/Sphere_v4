from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Channel, ChannelMembership, Message, MessageAttachment, MessageReaction

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    """Minimal user data for messages and channel members."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'profile_image')
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for message attachments."""
    
    class Meta:
        model = MessageAttachment
        fields = ('id', 'file', 'filename', 'file_type', 'file_size', 'uploaded_at')
        read_only_fields = ('uploaded_at',)


class MessageReactionSerializer(serializers.ModelSerializer):
    """Serializer for message reactions."""
    
    user = UserMiniSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ('id', 'user', 'emoji', 'created_at')
        read_only_fields = ('created_at',)


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages."""
    
    user = UserMiniSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    mentioned_users = UserMiniSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = (
            'id', 'channel', 'user', 'content', 'created_at', 'updated_at',
            'is_edited', 'parent_message', 'attachments', 'reactions', 'mentioned_users'
        )
        read_only_fields = ('created_at', 'updated_at', 'is_edited')


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat messages."""
    
    mentioned_user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Message
        fields = ('id', 'channel', 'content', 'parent_message', 'mentioned_user_ids')
    
    def create(self, validated_data):
        mentioned_user_ids = validated_data.pop('mentioned_user_ids', [])
        message = Message.objects.create(**validated_data)
        
        if mentioned_user_ids:
            mentioned_users = User.objects.filter(id__in=mentioned_user_ids)
            message.mentioned_users.set(mentioned_users)
        
        return message


class ChannelMembershipSerializer(serializers.ModelSerializer):
    """Serializer for channel membership."""
    
    user = UserMiniSerializer(read_only=True)
    
    class Meta:
        model = ChannelMembership
        fields = ('id', 'user', 'joined_at', 'is_admin', 'muted', 'last_read_at', 'unread_count')
        read_only_fields = ('joined_at', 'last_read_at', 'unread_count')


class ChannelSerializer(serializers.ModelSerializer):
    """Serializer for chat channels."""
    
    created_by = UserMiniSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Channel
        fields = (
            'id', 'name', 'description', 'workspace', 'channel_type',
            'created_by', 'created_at', 'updated_at', 'is_direct_message',
            'members_count', 'unread_count'
        )
        read_only_fields = ('created_at', 'updated_at', 'unread_count')
    
    def get_members_count(self, obj):
        return obj.members.count()
    
    def get_unread_count(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user:
            return 0
        
        membership = obj.memberships.filter(user=user).first()
        if membership:
            return membership.unread_count
        return 0


class ChannelDetailSerializer(ChannelSerializer):
    """Detailed serializer for chat channels, including members."""
    
    memberships = ChannelMembershipSerializer(many=True, read_only=True, source='memberships.all')
    last_message = serializers.SerializerMethodField()
    
    class Meta(ChannelSerializer.Meta):
        fields = ChannelSerializer.Meta.fields + ('memberships', 'last_message')
    
    def get_last_message(self, obj):
        last_message = obj.messages.filter(parent_message__isnull=True).order_by('-created_at').first()
        if last_message:
            return MessageSerializer(last_message).data
        return None


class DirectMessageChannelSerializer(serializers.Serializer):
    """Serializer for creating direct message channels."""
    
    user_id = serializers.IntegerField()