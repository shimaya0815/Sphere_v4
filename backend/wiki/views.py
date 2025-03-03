from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.core.exceptions import ValidationError
from .models import WikiPage, WikiPageVersion, WikiAttachment
from .serializers import (
    WikiPageListSerializer, WikiPageDetailSerializer, WikiPageCreateSerializer,
    WikiPageUpdateSerializer, WikiPageVersionSerializer, WikiAttachmentSerializer,
    WikiPageMoveSerializer, WikiPageBulkReorderSerializer
)
from business.permissions import IsSameBusiness


class WikiPageViewSet(viewsets.ModelViewSet):
    """ViewSet for wiki pages."""
    queryset = WikiPage.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['title', 'updated_at', 'created_at', 'order']
    ordering = ['order', 'title']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return WikiPageListSerializer
        elif self.action == 'create':
            return WikiPageCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return WikiPageUpdateSerializer
        return WikiPageDetailSerializer
    
    def get_queryset(self):
        """Return wiki pages for the authenticated user's business."""
        queryset = WikiPage.objects.filter(business=self.request.user.business)
        
        # Filter by parent if provided
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            if parent_id == 'null':
                # Get root pages (with no parent)
                queryset = queryset.filter(parent__isnull=True)
            else:
                # Get children of specified parent
                queryset = queryset.filter(parent=parent_id)
        
        # Filter by published status
        published = self.request.query_params.get('published')
        if published is not None:
            is_published = published.lower() == 'true'
            queryset = queryset.filter(is_published=is_published)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the business and creator fields when creating a wiki page."""
        serializer.save(
            business=self.request.user.business,
            creator=self.request.user,
            last_editor=self.request.user
        )
    
    def perform_update(self, serializer):
        """Set the last_editor field when updating a wiki page."""
        serializer.save(last_editor=self.request.user)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get versions of a wiki page."""
        page = self.get_object()
        versions = page.versions.all().order_by('-created_at')
        serializer = WikiPageVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def attachments(self, request, pk=None):
        """Get attachments for a wiki page."""
        page = self.get_object()
        attachments = page.attachments.all()
        serializer = WikiAttachmentSerializer(attachments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='versions/(?P<version_id>[^/.]+)/restore')
    def restore_version(self, request, pk=None, version_id=None):
        """Restore a wiki page to a previous version."""
        page = self.get_object()
        version = get_object_or_404(WikiPageVersion, pk=version_id, page=page)
        
        # Update the page content
        page.content = version.content
        page.last_editor = request.user
        page.save()
        
        serializer = self.get_serializer(page)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move a wiki page to a different parent and/or change its order."""
        page = self.get_object()
        serializer = WikiPageMoveSerializer(data=request.data)
        
        if serializer.is_valid():
            parent_id = serializer.validated_data.get('parent_id')
            order = serializer.validated_data.get('order', 0)
            
            # Update parent
            if parent_id is None:
                # Move to root level
                page.parent = None
            else:
                # Move to new parent
                try:
                    parent = WikiPage.objects.get(
                        id=parent_id, 
                        business=request.user.business
                    )
                    
                    # Check for circular reference
                    if parent.id == page.id:
                        return Response(
                            {'error': 'A page cannot be its own parent'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check if any ancestor is the page itself (circular reference)
                    ancestor = parent.parent
                    while ancestor:
                        if ancestor.id == page.id:
                            return Response(
                                {'error': 'Circular reference detected'},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                        ancestor = ancestor.parent
                    
                    page.parent = parent
                except WikiPage.DoesNotExist:
                    return Response(
                        {'error': 'Parent page not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Update order
            page.order = order
            page.save()
            
            # Return the updated page
            serializer = self.get_serializer(page)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """Get child pages of this page."""
        page = self.get_object()
        children = page.children.all().order_by('order', 'title')
        serializer = WikiPageListSerializer(children, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def breadcrumbs(self, request, pk=None):
        """Get breadcrumb trail for a page (ancestors in order)."""
        page = self.get_object()
        breadcrumbs = []
        
        # Build the chain of ancestors
        current = page
        while current:
            breadcrumbs.insert(0, {
                'id': current.id,
                'title': current.title,
                'slug': current.slug
            })
            current = current.parent
        
        return Response(breadcrumbs)


class WikiAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for wiki attachments."""
    queryset = WikiAttachment.objects.all()
    serializer_class = WikiAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_context(self):
        """Add request to serializer context for absolute URL generation."""
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context
    
    def get_queryset(self):
        """Return wiki attachments for the authenticated user's business."""
        return WikiAttachment.objects.filter(page__business=self.request.user.business)
    
    def create(self, request, *args, **kwargs):
        """Override create to add better debugging"""
        print("WikiAttachmentViewSet.create called")
        print("Request data:", request.data)
        print("Request FILES:", request.FILES)
        print("Authenticated user:", request.user.id, request.user.email)
        
        # Debug user business association
        if hasattr(request.user, 'business'):
            print("User business:", request.user.business)
        else:
            print("User has no business attribute")
            # Add a temporary business for development
            from business.models import Business
            business = Business.objects.first()
            if business:
                print("Using first available business:", business)
                request.user.business = business
            else:
                print("No business found in database")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print("Error creating attachment:", str(e))
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_create(self, serializer):
        """Set the uploader field when creating a wiki attachment."""
        print("WikiAttachmentViewSet.perform_create called")
        # We'll use the serializer's validated page directly
        file = self.request.FILES.get('file')
        print("File from request:", file)
        
        if not file:
            print("File is missing")
            raise ValidationError({'file': 'This field is required.'})
        
        print("File details:", file.name, file.content_type, file.size)
        
        try:
            # Let serializer handle page validation
            attachment = serializer.save(
                uploader=self.request.user,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size
            )
            print("Attachment saved successfully:", attachment.id, attachment.file.url)
            return attachment
        except Exception as e:
            print("Error saving attachment:", str(e))
            raise


class SearchWikiPagesView(APIView):
    """API view to search wiki pages."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Search wiki pages."""
        query = request.query_params.get('query', '')
        
        if not query:
            return Response(
                {'error': 'query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pages = WikiPage.objects.filter(
            business=request.user.business,
            is_published=True
        ).filter(
            Q(title__icontains=query) | 
            Q(content__icontains=query)
        ).order_by('title')
        
        serializer = WikiPageListSerializer(pages, many=True)
        return Response(serializer.data)


class WikiStructureView(APIView):
    """API view to get the tree structure of wiki pages."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get the hierarchical structure of wiki pages."""
        # Get all pages for the user's business
        pages = WikiPage.objects.filter(
            business=request.user.business,
            is_published=True
        ).order_by('order', 'title')
        
        # Convert to a dictionary for easier processing
        pages_dict = {}
        for page in pages:
            pages_dict[page.id] = {
                'id': page.id,
                'title': page.title,
                'slug': page.slug,
                'parent_id': page.parent_id,
                'order': page.order,
                'updated_at': page.updated_at,
                'children': []
            }
        
        # Build the hierarchy
        root_pages = []
        for page_id, page_data in pages_dict.items():
            parent_id = page_data['parent_id']
            if parent_id is None:
                # This is a root page
                root_pages.append(page_data)
            elif parent_id in pages_dict:
                # Add as child to parent
                pages_dict[parent_id]['children'].append(page_data)
        
        # Sort children by order
        for page_data in pages_dict.values():
            page_data['children'].sort(key=lambda x: (x['order'], x['title']))
        
        # Sort root pages by order
        root_pages.sort(key=lambda x: (x['order'], x['title']))
        
        return Response(root_pages)


class ReorderPagesView(APIView):
    """API view to reorder wiki pages."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Reorder wiki pages."""
        serializer = WikiPageBulkReorderSerializer(data=request.data)
        
        if serializer.is_valid():
            page_orders = serializer.validated_data['page_orders']
            
            for page_order in page_orders:
                page_id = page_order['id']
                order = page_order['order']
                
                # Get the page and update its order
                try:
                    page = WikiPage.objects.get(
                        id=page_id,
                        business=request.user.business
                    )
                    page.order = order
                    page.save(update_fields=['order'])
                except WikiPage.DoesNotExist:
                    # Skip pages that don't exist or don't belong to the user's business
                    continue
            
            return Response({'status': 'pages reordered successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WikiStatsView(APIView):
    """API view to get statistics about wiki pages."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get statistics about wiki pages for the user's business."""
        business = request.user.business
        
        # Get total pages count
        total_pages = WikiPage.objects.filter(business=business).count()
        
        # Get pages updated in the last 30 days
        from django.utils import timezone
        import datetime
        thirty_days_ago = timezone.now() - datetime.timedelta(days=30)
        recently_updated = WikiPage.objects.filter(
            business=business,
            updated_at__gte=thirty_days_ago
        ).count()
        
        # Get top contributors
        top_contributors = WikiPage.objects.filter(business=business) \
            .values('last_editor__id', 'last_editor__first_name', 'last_editor__last_name', 'last_editor__email') \
            .annotate(count=Count('last_editor')) \
            .order_by('-count')[:5]
        
        # Get page count by hierarchy level
        root_pages = WikiPage.objects.filter(business=business, parent__isnull=True).count()
        child_pages = WikiPage.objects.filter(business=business, parent__isnull=False).count()
        
        stats = {
            'total_pages': total_pages,
            'recently_updated': recently_updated,
            'top_contributors': top_contributors,
            'root_pages': root_pages,
            'child_pages': child_pages
        }
        
        return Response(stats)
