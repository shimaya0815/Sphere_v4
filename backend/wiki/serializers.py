from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from .models import WikiPage, WikiPageVersion, WikiAttachment

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    """Minimal user data for wiki pages."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'profile_image')
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class WikiAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for wiki page attachments."""
    
    uploader = UserMiniSerializer(read_only=True)
    
    class Meta:
        model = WikiAttachment
        fields = ('id', 'file', 'filename', 'file_type', 'file_size', 'uploader', 'uploaded_at', 'page')
        read_only_fields = ('uploader', 'uploaded_at', 'filename', 'file_type', 'file_size')
        
    def to_representation(self, instance):
        """Ensure the file URL includes the full domain path."""
        ret = super().to_representation(instance)
        if ret.get('file'):
            # Make sure the URL is absolute
            if not ret['file'].startswith('http'):
                request = self.context.get('request')
                if request is not None:
                    ret['file'] = request.build_absolute_uri(ret['file'])
        return ret


class WikiPageVersionSerializer(serializers.ModelSerializer):
    """Serializer for wiki page versions."""
    
    editor = UserMiniSerializer(read_only=True)
    
    class Meta:
        model = WikiPageVersion
        fields = ('id', 'content', 'editor', 'created_at')
        read_only_fields = ('created_at',)


class WikiPageListSerializer(serializers.ModelSerializer):
    """Serializer for listing wiki pages."""
    
    creator = UserMiniSerializer(read_only=True)
    last_editor = UserMiniSerializer(read_only=True)
    has_children = serializers.SerializerMethodField()
    
    class Meta:
        model = WikiPage
        fields = (
            'id', 'title', 'slug', 'parent', 'order', 'creator',
            'last_editor', 'created_at', 'updated_at', 'is_published',
            'has_children'
        )
        read_only_fields = ('creator', 'last_editor', 'created_at', 'updated_at')
    
    def get_has_children(self, obj):
        return obj.children.exists()


class WikiPageDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed wiki page info, including content."""
    
    creator = UserMiniSerializer(read_only=True)
    last_editor = UserMiniSerializer(read_only=True)
    has_children = serializers.SerializerMethodField()
    latest_version = serializers.SerializerMethodField()
    
    class Meta:
        model = WikiPage
        fields = (
            'id', 'title', 'slug', 'content', 'business', 'parent', 
            'order', 'creator', 'last_editor', 'created_at', 'updated_at',
            'is_published', 'has_children', 'latest_version'
        )
        read_only_fields = ('slug', 'creator', 'last_editor', 'created_at', 'updated_at')
    
    def get_has_children(self, obj):
        return obj.children.exists()
    
    def get_latest_version(self, obj):
        latest = obj.versions.first()
        if latest:
            return WikiPageVersionSerializer(latest).data
        return None


class WikiPageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating wiki pages."""
    
    class Meta:
        model = WikiPage
        fields = ('id', 'title', 'content', 'parent', 'order', 'is_published')
    
    def validate_title(self, value):
        # Check if a page with this title already exists in the same business
        business = self.context['request'].user.business
        # Generate the slug from the title
        slug = slugify(value)
        
        # Check if slug already exists for a different page
        if WikiPage.objects.filter(business=business, slug=slug).exists():
            raise serializers.ValidationError("A page with a similar title already exists.")
        
        return value


class WikiPageUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating wiki pages."""
    
    class Meta:
        model = WikiPage
        fields = ('id', 'title', 'content', 'parent', 'order', 'is_published')
    
    def validate_title(self, value):
        # Check if changing the title would create a conflict
        business = self.context['request'].user.business
        instance = self.instance
        
        # Generate the slug from the title
        slug = slugify(value)
        
        # Check if slug already exists for a different page
        if WikiPage.objects.filter(business=business, slug=slug).exclude(id=instance.id).exists():
            raise serializers.ValidationError("A page with a similar title already exists.")
        
        return value


class WikiPageMoveSerializer(serializers.Serializer):
    """Serializer for moving a wiki page in the hierarchy."""
    
    parent_id = serializers.IntegerField(allow_null=True)
    order = serializers.IntegerField(required=False, default=0)


class WikiPageBulkReorderSerializer(serializers.Serializer):
    """Serializer for reordering multiple wiki pages."""
    
    page_orders = serializers.ListField(
        child=serializers.DictField(
            child=serializers.IntegerField(),
            allow_empty=False
        ),
        allow_empty=False
    )
    
    def validate_page_orders(self, value):
        for page_order in value:
            if 'id' not in page_order or 'order' not in page_order:
                raise serializers.ValidationError("Each item must contain 'id' and 'order' fields.")
        return value