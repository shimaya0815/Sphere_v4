from rest_framework import serializers
from .models import Business, Workspace, BusinessInvitation
from django.utils import timezone
from datetime import timedelta


class WorkspaceSerializer(serializers.ModelSerializer):
    """Serializer for the Workspace model."""
    
    class Meta:
        model = Workspace
        fields = ('id', 'name', 'description', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class BusinessSerializer(serializers.ModelSerializer):
    """Serializer for the Business model."""
    
    workspaces = WorkspaceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Business
        fields = (
            'id', 'name', 'business_id', 'description', 'logo', 'owner',
            'address', 'phone', 'email', 'website', 'created_at', 'updated_at',
            'workspaces'
        )
        read_only_fields = ('id', 'business_id', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        """Create a new business."""
        owner = self.context['request'].user
        validated_data['owner'] = owner
        return super().create(validated_data)


class BusinessInvitationSerializer(serializers.ModelSerializer):
    """Serializer for business invitations."""
    
    inviter_name = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessInvitation
        fields = (
            'id', 'business', 'business_name', 'email', 'inviter', 'inviter_name',
            'token', 'status', 'created_at', 'expires_at'
        )
        read_only_fields = ('id', 'token', 'status', 'created_at', 'expires_at', 'inviter')
        extra_kwargs = {
            'token': {'write_only': True}
        }
    
    def get_inviter_name(self, obj):
        """Get the name of the inviter."""
        return obj.inviter.get_full_name()
    
    def get_business_name(self, obj):
        """Get the name of the business."""
        return obj.business.name
    
    def create(self, validated_data):
        """Create a new invitation."""
        # Set inviter to current user
        validated_data['inviter'] = self.context['request'].user
        
        # Set expiration date to 7 days from now
        validated_data['expires_at'] = timezone.now() + timedelta(days=7)
        
        return super().create(validated_data)


class BusinessWithOwnerSerializer(BusinessSerializer):
    """Serializer with owner details."""
    
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    
    class Meta(BusinessSerializer.Meta):
        fields = BusinessSerializer.Meta.fields + ('owner_name', 'owner_email')
    
    def get_owner_name(self, obj):
        """Get the name of the owner."""
        return obj.owner.get_full_name() if obj.owner else None
    
    def get_owner_email(self, obj):
        """Get the email of the owner."""
        return obj.owner.email if obj.owner else None