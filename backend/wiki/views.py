from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import WikiPage, WikiPageVersion, WikiAttachment
from business.permissions import IsSameBusiness

# Placeholder views - would need actual serializers
class WikiPageViewSet(viewsets.ModelViewSet):
    """ViewSet for wiki pages."""
    queryset = WikiPage.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['title', 'updated_at', 'created_at']
    ordering = ['title']
    
    def get_queryset(self):
        """Return wiki pages for the authenticated user's business."""
        return WikiPage.objects.filter(business=self.request.user.business)
    
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
        # In a real implementation, you'd serialize the versions here
        return Response({'version_count': versions.count()})
    
    @action(detail=True, methods=['get'])
    def attachments(self, request, pk=None):
        """Get attachments for a wiki page."""
        page = self.get_object()
        attachments = page.attachments.all()
        # In a real implementation, you'd serialize the attachments here
        return Response({'attachment_count': attachments.count()})
    
    @action(detail=True, methods=['post'], url_path='versions/(?P<version_id>[^/.]+)/restore')
    def restore_version(self, request, pk=None, version_id=None):
        """Restore a wiki page to a previous version."""
        page = self.get_object()
        version = get_object_or_404(WikiPageVersion, pk=version_id, page=page)
        
        # Update the page content
        page.content = version.content
        page.last_editor = request.user
        page.save()
        
        return Response({'status': 'page restored to version'})


class WikiAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for wiki attachments."""
    queryset = WikiAttachment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return wiki attachments for the authenticated user's business."""
        return WikiAttachment.objects.filter(page__business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the uploader field when creating a wiki attachment."""
        serializer.save(uploader=self.request.user)


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
        )
        
        # In a real implementation, you'd serialize the pages here
        return Response({'page_count': pages.count()})


class ChildPagesView(APIView):
    """API view to get child pages of a wiki page."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, page_id):
        """Get child pages of a wiki page."""
        parent_page = get_object_or_404(
            WikiPage, 
            id=page_id, 
            business=request.user.business
        )
        
        child_pages = WikiPage.objects.filter(
            parent=parent_page,
            business=request.user.business
        ).order_by('order', 'title')
        
        # In a real implementation, you'd serialize the child pages here
        return Response({'child_page_count': child_pages.count()})


class ReorderPagesView(APIView):
    """API view to reorder wiki pages."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Reorder wiki pages."""
        # Expected format: {'page_orders': [{'id': 1, 'order': 0}, {'id': 2, 'order': 1}, ...]}
        page_orders = request.data.get('page_orders', [])
        
        if not page_orders:
            return Response(
                {'error': 'page_orders is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for page_order in page_orders:
            page_id = page_order.get('id')
            order = page_order.get('order')
            
            if page_id is None or order is None:
                return Response(
                    {'error': 'Each page_order must have id and order'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
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
