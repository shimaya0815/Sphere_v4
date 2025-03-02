from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, F, Q
from datetime import datetime, timedelta
from .models import TimeEntry, TimeReport, Break
from business.permissions import IsSameBusiness

# Placeholder views - would need actual serializers
class TimeEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for time entries."""
    queryset = TimeEntry.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description']
    ordering_fields = ['start_time', 'end_time', 'duration', 'created_at']
    ordering = ['-start_time']
    
    def get_queryset(self):
        """Return time entries for the authenticated user's business."""
        queryset = TimeEntry.objects.filter(business=self.request.user.business)
        
        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by task if requested
        task_id = self.request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        # Filter by client if requested
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Filter by date range if requested
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(start_time__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the user and business fields when creating a time entry."""
        serializer.save(
            user=self.request.user,
            business=self.request.user.business
        )
    
    @action(detail=True, methods=['get'])
    def breaks(self, request, pk=None):
        """Get breaks for a time entry."""
        time_entry = self.get_object()
        breaks = time_entry.breaks.all().order_by('start_time')
        # In a real implementation, you'd serialize the breaks here
        return Response({'break_count': breaks.count()})


class BreakViewSet(viewsets.ModelViewSet):
    """ViewSet for breaks."""
    queryset = Break.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return breaks for the authenticated user's time entries."""
        return Break.objects.filter(
            time_entry__user=self.request.user,
            time_entry__business=self.request.user.business
        )
    
    @action(detail=True, methods=['post'], url_path='stop')
    def stop_break(self, request, pk=None):
        """Stop a break."""
        break_obj = self.get_object()
        break_obj.stop_break()
        # In a real implementation, you'd serialize the break here
        return Response({'status': 'break stopped'})


class TimeReportViewSet(viewsets.ModelViewSet):
    """ViewSet for time reports."""
    queryset = TimeReport.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return time reports for the authenticated user's business."""
        return TimeReport.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the creator and business fields when creating a time report."""
        serializer.save(
            creator=self.request.user,
            business=self.request.user.business
        )
    
    @action(detail=True, methods=['get'], url_path='export/csv')
    def export_csv(self, request, pk=None):
        """Export a time report as CSV."""
        # In a real implementation, you'd generate and return a CSV file
        return Response({'status': 'CSV export would be generated here'})


class DashboardSummaryView(APIView):
    """API view to get dashboard summary."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get dashboard summary."""
        now = timezone.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_month = now.replace(day=1)
        
        # Get time entries for different periods
        time_entries = TimeEntry.objects.filter(
            business=request.user.business
        )
        
        # Filter by user if requested
        user_id = request.query_params.get('user_id')
        if user_id:
            time_entries = time_entries.filter(user_id=user_id)
        
        # Calculate stats
        today_entries = time_entries.filter(start_time__date=now.date())
        this_week_entries = time_entries.filter(start_time__gte=start_of_week)
        this_month_entries = time_entries.filter(start_time__gte=start_of_month)
        
        # Calculate total durations
        today_duration = today_entries.aggregate(
            total=Sum('duration', filter=Q(duration__isnull=False))
        )['total'] or timedelta(0)
        
        week_duration = this_week_entries.aggregate(
            total=Sum('duration', filter=Q(duration__isnull=False))
        )['total'] or timedelta(0)
        
        month_duration = this_month_entries.aggregate(
            total=Sum('duration', filter=Q(duration__isnull=False))
        )['total'] or timedelta(0)
        
        # Get current active timer if any
        active_timer = None
        if not user_id or str(request.user.id) == user_id:
            active_timer = time_entries.filter(
                user=request.user,
                end_time__isnull=True
            ).first()
        
        summary = {
            'today': {
                'hours': today_duration.total_seconds() / 3600,
                'entry_count': today_entries.count()
            },
            'this_week': {
                'hours': week_duration.total_seconds() / 3600,
                'entry_count': this_week_entries.count()
            },
            'this_month': {
                'hours': month_duration.total_seconds() / 3600,
                'entry_count': this_month_entries.count()
            },
            'has_active_timer': active_timer is not None
        }
        
        return Response(summary)


class StartTimeEntryView(APIView):
    """API view to start a time entry."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Start a time entry."""
        # Check if there's already an active timer
        active_timer = TimeEntry.objects.filter(
            user=request.user,
            end_time__isnull=True
        ).first()
        
        if active_timer:
            return Response(
                {'error': 'You already have an active timer', 'time_entry_id': active_timer.id},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a new time entry
        time_entry = TimeEntry.objects.create(
            user=request.user,
            business=request.user.business,
            start_time=timezone.now(),
            task_id=request.data.get('task_id'),
            client_id=request.data.get('client_id'),
            description=request.data.get('description', '')
        )
        
        return Response({'id': time_entry.id, 'status': 'time entry started'})


class StopTimeEntryView(APIView):
    """API view to stop a time entry."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, entry_id):
        """Stop a time entry."""
        time_entry = get_object_or_404(
            TimeEntry,
            id=entry_id,
            user=request.user,
            end_time__isnull=True
        )
        
        time_entry.stop_timer()
        
        return Response({'id': time_entry.id, 'status': 'time entry stopped'})


class StartBreakView(APIView):
    """API view to start a break."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, entry_id):
        """Start a break for a time entry."""
        time_entry = get_object_or_404(
            TimeEntry,
            id=entry_id,
            user=request.user,
            end_time__isnull=True
        )
        
        # Check if there's already an active break
        active_break = Break.objects.filter(
            time_entry=time_entry,
            end_time__isnull=True
        ).first()
        
        if active_break:
            return Response(
                {'error': 'This time entry already has an active break', 'break_id': active_break.id},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a new break
        break_obj = Break.objects.create(
            time_entry=time_entry,
            start_time=timezone.now(),
            reason=request.data.get('reason', '')
        )
        
        return Response({'id': break_obj.id, 'status': 'break started'})


class GenerateReportView(APIView):
    """API view to generate a time report."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Generate a time report."""
        # Get parameters from request
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        name = request.data.get('name', f'Report {datetime.now().strftime("%Y-%m-%d")}')
        filters = request.data.get('filters', {})
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a new report
        report = TimeReport.objects.create(
            business=request.user.business,
            creator=request.user,
            name=name,
            start_date=start_date,
            end_date=end_date,
            filters=filters
        )
        
        # Generate report data
        time_entries = TimeEntry.objects.filter(
            business=request.user.business,
            start_time__date__gte=start_date,
            start_time__date__lte=end_date
        )
        
        # Apply filters
        for key, value in filters.items():
            if key == 'user_id' and value:
                time_entries = time_entries.filter(user_id=value)
            elif key == 'task_id' and value:
                time_entries = time_entries.filter(task_id=value)
            elif key == 'client_id' and value:
                time_entries = time_entries.filter(client_id=value)
        
        # Calculate total duration
        total_duration = time_entries.aggregate(
            total=Sum('duration', filter=Q(duration__isnull=False))
        )['total'] or timedelta(0)
        
        # Store report data
        report.data = {
            'entry_count': time_entries.count(),
            'total_hours': total_duration.total_seconds() / 3600,
            'generated_at': timezone.now().isoformat()
        }
        report.save()
        
        return Response({'id': report.id, 'status': 'report generated'})
