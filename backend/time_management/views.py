from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, F, Q, Avg, Min, Max
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from .models import TimeEntry, TimeReport, Break, DailyAnalytics
from .serializers import (
    TimeEntrySerializer, TimeEntryCreateUpdateSerializer, BreakSerializer,
    BreakCreateUpdateSerializer, TimeReportSerializer, TimeReportCreateSerializer,
    TimerStartSerializer, BreakStartSerializer, TimeSummarySerializer,
    DailyAnalyticsSerializer, DailyAnalyticsCreateUpdateSerializer,
    TimeChartDataSerializer, ProductivityChartDataSerializer
)
from business.permissions import IsSameBusiness
from tasks.models import Task
from users.models import User


class TimeEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for time entries."""
    queryset = TimeEntry.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description']
    ordering_fields = ['start_time', 'end_time', 'duration', 'created_at']
    ordering = ['-start_time']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TimeEntryCreateUpdateSerializer
        return TimeEntrySerializer
    
    def get_queryset(self):
        """Return time entries for the authenticated user's business."""
        queryset = TimeEntry.objects.filter(business=self.request.user.business)
        
        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        else:
            # Default to current user's entries if not an admin request
            if not self.request.query_params.get('all_users'):
                queryset = queryset.filter(user=self.request.user)
        
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
        
        # Filter by active status if requested
        active = self.request.query_params.get('active')
        if active:
            is_active = active.lower() == 'true'
            if is_active:
                queryset = queryset.filter(end_time__isnull=True)
            else:
                queryset = queryset.filter(end_time__isnull=False)
        
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
        serializer = BreakSerializer(breaks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='stop')
    def stop_timer(self, request, pk=None):
        """Stop a time entry timer."""
        time_entry = self.get_object()
        
        # Check if it's already stopped
        if time_entry.end_time:
            return Response(
                {'error': 'This timer is already stopped'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_entry.stop_timer()
        serializer = self.get_serializer(time_entry)
        return Response(serializer.data)


class BreakViewSet(viewsets.ModelViewSet):
    """ViewSet for breaks."""
    queryset = Break.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BreakCreateUpdateSerializer
        return BreakSerializer
    
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
        
        # Check if it's already stopped
        if break_obj.end_time:
            return Response(
                {'error': 'This break is already stopped'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        break_obj.stop_break()
        serializer = self.get_serializer(break_obj)
        return Response(serializer.data)


class TimeReportViewSet(viewsets.ModelViewSet):
    """ViewSet for time reports."""
    queryset = TimeReport.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TimeReportCreateSerializer
        return TimeReportSerializer
    
    def get_queryset(self):
        """Return time reports for the authenticated user's business."""
        return TimeReport.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        """Set the creator and business fields when creating a time report."""
        serializer.save(
            creator=self.request.user,
            business=self.request.user.business
        )
    
    @action(detail=True, methods=['get'])
    def generate(self, request, pk=None):
        """Generate report data for a time report."""
        report = self.get_object()
        
        # Generate report data
        time_entries = TimeEntry.objects.filter(
            business=report.business,
            start_time__date__gte=report.start_date,
            start_time__date__lte=report.end_date
        )
        
        # Apply filters
        filters = report.filters or {}
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
        
        # Calculate data by user
        user_data = []
        for user_id, user_name in time_entries.values_list('user__id', 'user__first_name').distinct():
            user_entries = time_entries.filter(user__id=user_id)
            user_duration = user_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            user_data.append({
                'user_id': user_id,
                'user_name': user_name,
                'hours': user_duration.total_seconds() / 3600,
                'entry_count': user_entries.count()
            })
        
        # Calculate data by task
        task_data = []
        for task_id, task_title in time_entries.filter(task__isnull=False).values_list('task__id', 'task__title').distinct():
            task_entries = time_entries.filter(task__id=task_id)
            task_duration = task_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            task_data.append({
                'task_id': task_id,
                'task_title': task_title,
                'hours': task_duration.total_seconds() / 3600,
                'entry_count': task_entries.count()
            })
        
        # Calculate data by client
        client_data = []
        for client_id, client_name in time_entries.filter(client__isnull=False).values_list('client__id', 'client__name').distinct():
            client_entries = time_entries.filter(client__id=client_id)
            client_duration = client_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            client_data.append({
                'client_id': client_id,
                'client_name': client_name,
                'hours': client_duration.total_seconds() / 3600,
                'entry_count': client_entries.count()
            })
        
        # Store report data
        report.data = {
            'entry_count': time_entries.count(),
            'total_hours': total_duration.total_seconds() / 3600,
            'user_data': user_data,
            'task_data': task_data,
            'client_data': client_data,
            'generated_at': timezone.now().isoformat()
        }
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='export/csv')
    def export_csv(self, request, pk=None):
        """Export a time report as CSV."""
        report = self.get_object()
        
        # Ensure report data is generated
        if not report.data:
            self.generate(request, pk)
            report.refresh_from_db()
        
        import csv
        import io
        from django.http import HttpResponse
        
        # Create CSV buffer
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        
        # Write header
        writer.writerow(['Report Name', report.name])
        writer.writerow(['Period', f"{report.start_date} to {report.end_date}"])
        writer.writerow(['Generated At', report.data.get('generated_at', '')])
        writer.writerow(['Total Hours', f"{report.data.get('total_hours', 0):.2f}"])
        writer.writerow(['Entry Count', report.data.get('entry_count', 0)])
        writer.writerow([])
        
        # Write user data
        writer.writerow(['User Data'])
        writer.writerow(['User ID', 'User Name', 'Hours', 'Entry Count'])
        for user in report.data.get('user_data', []):
            writer.writerow([
                user.get('user_id', ''),
                user.get('user_name', ''),
                f"{user.get('hours', 0):.2f}",
                user.get('entry_count', 0)
            ])
        writer.writerow([])
        
        # Write task data
        writer.writerow(['Task Data'])
        writer.writerow(['Task ID', 'Task Title', 'Hours', 'Entry Count'])
        for task in report.data.get('task_data', []):
            writer.writerow([
                task.get('task_id', ''),
                task.get('task_title', ''),
                f"{task.get('hours', 0):.2f}",
                task.get('entry_count', 0)
            ])
        writer.writerow([])
        
        # Write client data
        writer.writerow(['Client Data'])
        writer.writerow(['Client ID', 'Client Name', 'Hours', 'Entry Count'])
        for client in report.data.get('client_data', []):
            writer.writerow([
                client.get('client_id', ''),
                client.get('client_name', ''),
                f"{client.get('hours', 0):.2f}",
                client.get('entry_count', 0)
            ])
        
        # Create HTTP response
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report.name.replace(" ", "_")}.csv"'
        
        return response


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
        else:
            # Default to current user's entries
            time_entries = time_entries.filter(user=request.user)
        
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
        
        summary_data = {
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
            'has_active_timer': active_timer is not None,
            'active_timer': active_timer
        }
        
        serializer = TimeSummarySerializer(summary_data)
        return Response(serializer.data)


class StartTimeEntryViewSet(viewsets.ViewSet):
    """API view to start and manage time entries."""
    permission_classes = [permissions.IsAuthenticated]
    
    def active(self, request):
        """Get the active time entry for the current user or for a specific task."""
        task_id = request.query_params.get('task_id')
        
        # Base query for active time entries
        query_filter = {
            'user': request.user,
            'end_time__isnull': True
        }
        
        # Add task filter if specified
        if task_id:
            query_filter['task_id'] = task_id
        
        # Get the active time entry
        active_timer = TimeEntry.objects.filter(**query_filter).first()
        
        if active_timer:
            serializer = TimeEntrySerializer(active_timer)
            return Response(serializer.data)
        else:
            return Response({'active': False}, status=status.HTTP_404_NOT_FOUND)
    
    def create(self, request):
        """Start a time entry."""
        # Validate request data
        serializer = TimerStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if there's already an active timer
        active_timer = TimeEntry.objects.filter(
            user=request.user,
            end_time__isnull=True
        ).first()
        
        if active_timer:
            active_serializer = TimeEntrySerializer(active_timer)
            return Response(
                {
                    'error': 'You already have an active timer',
                    'time_entry': active_serializer.data
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get task if provided
        task = None
        if serializer.validated_data.get('task_id'):
            from tasks.models import Task
            try:
                task = Task.objects.get(
                    id=serializer.validated_data['task_id'],
                    business=request.user.business
                )
            except Task.DoesNotExist:
                return Response(
                    {'error': 'Invalid task ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get client if provided
        client = None
        if serializer.validated_data.get('client_id'):
            from clients.models import Client
            try:
                client = Client.objects.get(
                    id=serializer.validated_data['client_id'],
                    business=request.user.business
                )
            except Client.DoesNotExist:
                return Response(
                    {'error': 'Invalid client ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get fiscal year if provided
        fiscal_year = None
        if serializer.validated_data.get('fiscal_year_id'):
            from clients.models import FiscalYear
            try:
                fiscal_year = FiscalYear.objects.get(
                    id=serializer.validated_data['fiscal_year_id'],
                    client__business=request.user.business
                )
            except FiscalYear.DoesNotExist:
                return Response(
                    {'error': 'Invalid fiscal year ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create a new time entry
        entry_data = {
            'user': request.user,
            'business': request.user.business,
            'start_time': timezone.now(),
            'task': task,
            'client': client,
            'description': serializer.validated_data.get('description', '')
        }
        
        # Add fiscal year reference if available in the model
        from django.db.models import Field
        time_entry_fields = [f.name for f in TimeEntry._meta.get_fields()]
        if 'fiscal_year' in time_entry_fields and fiscal_year is not None:
            entry_data['fiscal_year'] = fiscal_year
            
        time_entry = TimeEntry.objects.create(**entry_data)
        
        response_serializer = TimeEntrySerializer(time_entry)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['post'])
    def start_timer(self, request):
        """Alias for create."""
        return self.create(request)
        
        # Get client if provided
        client = None
        if serializer.validated_data.get('client_id'):
            from clients.models import Client
            try:
                client = Client.objects.get(
                    id=serializer.validated_data['client_id'],
                    business=request.user.business
                )
            except Client.DoesNotExist:
                return Response(
                    {'error': 'Invalid client ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get fiscal year if provided
        fiscal_year = None
        if serializer.validated_data.get('fiscal_year_id'):
            from clients.models import FiscalYear
            try:
                fiscal_year = FiscalYear.objects.get(
                    id=serializer.validated_data['fiscal_year_id'],
                    client__business=request.user.business
                )
            except FiscalYear.DoesNotExist:
                return Response(
                    {'error': 'Invalid fiscal year ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create a new time entry
        entry_data = {
            'user': request.user,
            'business': request.user.business,
            'start_time': timezone.now(),
            'task': task,
            'client': client,
            'description': serializer.validated_data.get('description', '')
        }
        
        # Add fiscal year reference if available in the model
        from django.db.models import Field
        time_entry_fields = [f.name for f in TimeEntry._meta.get_fields()]
        if 'fiscal_year' in time_entry_fields and fiscal_year is not None:
            entry_data['fiscal_year'] = fiscal_year
            
        time_entry = TimeEntry.objects.create(**entry_data)
        
        response_serializer = TimeEntrySerializer(time_entry)
        return Response(response_serializer.data)


class StopTimeEntryViewSet(viewsets.ViewSet):
    """API view to stop a time entry."""
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, entry_id):
        """Stop a time entry."""
        time_entry = get_object_or_404(
            TimeEntry,
            id=entry_id,
            user=request.user,
            end_time__isnull=True
        )
        
        time_entry.stop_timer()
        
        serializer = TimeEntrySerializer(time_entry)
        return Response(serializer.data)


class StartBreakView(APIView):
    """API view to start a break."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, entry_id):
        """Start a break for a time entry."""
        # Validate request data
        serializer = BreakStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
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
            break_serializer = BreakSerializer(active_break)
            return Response(
                {
                    'error': 'This time entry already has an active break',
                    'break': break_serializer.data
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a new break
        break_obj = Break.objects.create(
            time_entry=time_entry,
            start_time=timezone.now(),
            reason=serializer.validated_data.get('reason', '')
        )
        
        response_serializer = BreakSerializer(break_obj)
        return Response(response_serializer.data)


class StopBreakView(APIView):
    """API view to stop a break."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, break_id):
        """Stop a break."""
        break_obj = get_object_or_404(
            Break,
            id=break_id,
            time_entry__user=request.user,
            end_time__isnull=True
        )
        
        break_obj.stop_break()
        
        serializer = BreakSerializer(break_obj)
        return Response(serializer.data)


class DailyAnalyticsViewSet(viewsets.ModelViewSet):
    """ViewSet for daily analytics."""
    queryset = DailyAnalytics.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['date', 'productivity_score', 'total_hours']
    ordering = ['-date']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DailyAnalyticsCreateUpdateSerializer
        return DailyAnalyticsSerializer
    
    def get_queryset(self):
        """Return daily analytics for the authenticated user's business."""
        queryset = DailyAnalytics.objects.filter(business=self.request.user.business)
        
        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        else:
            # Default to current user's analytics if not an admin request
            if not self.request.query_params.get('all_users'):
                queryset = queryset.filter(user=self.request.user)
        
        # Filter by date range if requested
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the business field when creating daily analytics."""
        serializer.save(business=self.request.user.business)
    
    @action(detail=False, methods=['get'])
    def generate(self, request):
        """Generate or update daily analytics for the specified date."""
        target_date = request.query_params.get('date', date.today().isoformat())
        target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
        user_id = request.query_params.get('user_id', request.user.id)
        
        try:
            # Get the specified user
            user = User.objects.get(id=user_id, business=request.user.business)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid user ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get time entries for the specified date
        time_entries = TimeEntry.objects.filter(
            business=request.user.business,
            user=user,
            start_time__date=target_date
        )
        
        # Calculate total hours
        total_duration = time_entries.aggregate(
            total=Sum('duration', filter=Q(duration__isnull=False))
        )['total'] or timedelta(0)
        total_hours = total_duration.total_seconds() / 3600
        
        # Calculate billable hours
        billable_duration = time_entries.filter(is_billable=True).aggregate(
            total=Sum('duration', filter=Q(duration__isnull=False))
        )['total'] or timedelta(0)
        billable_hours = billable_duration.total_seconds() / 3600
        
        # Calculate break time
        break_duration = Break.objects.filter(
            time_entry__in=time_entries,
            duration__isnull=False
        ).aggregate(total=Sum('duration'))['total'] or timedelta(0)
        break_time = break_duration.total_seconds() / 3600
        
        # Calculate tasks worked and completed
        task_ids = time_entries.filter(task__isnull=False).values_list('task_id', flat=True).distinct()
        tasks_worked = len(task_ids)
        
        # Check how many of these tasks were completed on this day
        tasks_completed = Task.objects.filter(
            id__in=task_ids, 
            status='completed',
            completed_at__date=target_date
        ).count()
        
        # Calculate task completion rate
        task_completion_rate = (tasks_completed / tasks_worked * 100) if tasks_worked > 0 else 0
        
        # Calculate average productivity score from time entries
        avg_productivity = time_entries.filter(
            productivity_score__isnull=False
        ).aggregate(avg=Avg('productivity_score'))['avg'] or 0
        
        # Generate hourly data
        hourly_data = []
        for hour in range(24):
            hour_start = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=hour)
            hour_end = hour_start + timedelta(hours=1)
            
            hour_entries = time_entries.filter(
                start_time__lt=hour_end,
                end_time__isnull=False
            ).filter(
                Q(end_time__gt=hour_start) | Q(end_time__isnull=True)
            )
            
            # Calculate time spent in this hour
            hour_duration = timedelta(0)
            for entry in hour_entries:
                entry_start = max(entry.start_time, hour_start)
                entry_end = min(entry.end_time, hour_end) if entry.end_time else hour_end
                if entry_end > entry_start:
                    hour_duration += entry_end - entry_start
            
            hourly_data.append({
                'hour': hour,
                'time': hour_duration.total_seconds() / 60,  # in minutes
                'entry_count': hour_entries.count()
            })
        
        # Generate task data
        task_data = []
        for task_id in task_ids:
            task_entries = time_entries.filter(task_id=task_id)
            task_duration = task_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            # Get task details
            try:
                task = Task.objects.get(id=task_id)
                task_title = task.title
                task_status = task.status
            except Task.DoesNotExist:
                task_title = "Unknown Task"
                task_status = "unknown"
            
            task_data.append({
                'task_id': task_id,
                'title': task_title,
                'status': task_status,
                'hours': task_duration.total_seconds() / 3600,
                'entry_count': task_entries.count()
            })
        
        # Create or update daily analytics
        analytics, created = DailyAnalytics.objects.update_or_create(
            business=request.user.business,
            user=user,
            date=target_date,
            defaults={
                'total_hours': total_hours,
                'billable_hours': billable_hours,
                'break_time': break_time,
                'productivity_score': avg_productivity,
                'task_completion_rate': task_completion_rate,
                'tasks_worked': tasks_worked,
                'tasks_completed': tasks_completed,
                'hourly_data': {'hours': hourly_data},
                'task_data': {'tasks': task_data}
            }
        )
        
        serializer = self.get_serializer(analytics)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def chart_data(self, request):
        """Get chart data for visualization."""
        chart_type = request.query_params.get('type', 'time')  # time or productivity
        period = request.query_params.get('period', 'week')  # day, week, month, year
        user_id = request.query_params.get('user_id', request.user.id)
        
        try:
            # Get the specified user
            user = User.objects.get(id=user_id, business=request.user.business)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid user ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate date range based on period
        today = date.today()
        if period == 'day':
            start_date = today
            end_date = today
            date_format = '%H:%M'
            group_by = 'hourly'
        elif period == 'week':
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            date_format = '%a'
            group_by = 'daily'
        elif period == 'month':
            start_date = today.replace(day=1)
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
            date_format = '%d'
            group_by = 'daily'
        elif period == 'year':
            start_date = date(today.year, 1, 1)
            end_date = date(today.year, 12, 31)
            date_format = '%b'
            group_by = 'monthly'
        else:
            return Response(
                {'error': 'Invalid period'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For day period, we need time entries directly
        if period == 'day':
            # Get time entries for the day
            time_entries = TimeEntry.objects.filter(
                business=request.user.business,
                user=user,
                start_time__date=today
            )
            
            # Generate hourly data
            labels = []
            time_data = []
            for hour in range(24):
                hour_start = datetime.combine(today, datetime.min.time()) + timedelta(hours=hour)
                hour_end = hour_start + timedelta(hours=1)
                
                hour_entries = time_entries.filter(
                    start_time__lt=hour_end,
                    end_time__isnull=False
                ).filter(
                    Q(end_time__gt=hour_start) | Q(end_time__isnull=True)
                )
                
                # Calculate time spent in this hour
                hour_duration = timedelta(0)
                for entry in hour_entries:
                    entry_start = max(entry.start_time, hour_start)
                    entry_end = min(entry.end_time, hour_end) if entry.end_time else hour_end
                    if entry_end > entry_start:
                        hour_duration += entry_end - entry_start
                
                labels.append(hour_start.strftime('%H:%M'))
                time_data.append(round(hour_duration.total_seconds() / 60, 1))  # in minutes
            
            if chart_type == 'time':
                chart_data = {
                    'labels': labels,
                    'datasets': [
                        {
                            'label': 'Minutes',
                            'data': time_data,
                            'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                            'borderColor': 'rgba(54, 162, 235, 1)',
                            'borderWidth': 1
                        }
                    ]
                }
                serializer = TimeChartDataSerializer(chart_data)
            else:  # productivity
                # Get productivity scores from the time entries
                productivity_data = []
                for hour in range(24):
                    hour_start = datetime.combine(today, datetime.min.time()) + timedelta(hours=hour)
                    hour_end = hour_start + timedelta(hours=1)
                    
                    hour_entries = time_entries.filter(
                        start_time__lt=hour_end,
                        end_time__isnull=False,
                        productivity_score__isnull=False
                    ).filter(
                        Q(end_time__gt=hour_start) | Q(end_time__isnull=True)
                    )
                    
                    avg_productivity = hour_entries.aggregate(
                        avg=Avg('productivity_score')
                    )['avg'] or 0
                    
                    productivity_data.append(round(avg_productivity, 1))
                
                chart_data = {
                    'labels': labels,
                    'datasets': [
                        {
                            'label': 'Productivity',
                            'data': productivity_data,
                            'backgroundColor': 'rgba(255, 99, 132, 0.5)',
                            'borderColor': 'rgba(255, 99, 132, 1)',
                            'borderWidth': 1
                        }
                    ]
                }
                serializer = ProductivityChartDataSerializer(chart_data)
        else:
            # Get analytics for the date range
            analytics = DailyAnalytics.objects.filter(
                business=request.user.business,
                user=user,
                date__range=(start_date, end_date)
            ).order_by('date')
            
            if group_by == 'daily':
                # Create a date range to include all dates
                date_range = [start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)]
                
                # Prepare data
                labels = [d.strftime(date_format) for d in date_range]
                
                # Initialize data arrays
                total_hours = [0] * len(date_range)
                billable_hours = [0] * len(date_range)
                break_time = [0] * len(date_range)
                productivity_scores = [0] * len(date_range)
                
                # Fill in data where we have analytics
                for entry in analytics:
                    day_index = (entry.date - start_date).days
                    if 0 <= day_index < len(date_range):
                        total_hours[day_index] = round(entry.total_hours, 1)
                        billable_hours[day_index] = round(entry.billable_hours, 1)
                        break_time[day_index] = round(entry.break_time, 1)
                        productivity_scores[day_index] = round(entry.productivity_score, 1)
            
            elif group_by == 'monthly':
                # Create month labels for the year
                labels = [date(today.year, month, 1).strftime(date_format) for month in range(1, 13)]
                
                # Initialize data arrays
                total_hours = [0] * 12
                billable_hours = [0] * 12
                break_time = [0] * 12
                productivity_scores = [0] * 12
                
                # Group by month and calculate averages
                month_data = {}
                for entry in analytics:
                    month = entry.date.month - 1  # 0-indexed
                    if month not in month_data:
                        month_data[month] = {
                            'total': entry.total_hours,
                            'billable': entry.billable_hours,
                            'break': entry.break_time,
                            'productivity': entry.productivity_score,
                            'count': 1
                        }
                    else:
                        month_data[month]['total'] += entry.total_hours
                        month_data[month]['billable'] += entry.billable_hours
                        month_data[month]['break'] += entry.break_time
                        month_data[month]['productivity'] += entry.productivity_score
                        month_data[month]['count'] += 1
                
                # Calculate monthly averages
                for month, data in month_data.items():
                    count = data['count']
                    total_hours[month] = round(data['total'] / count, 1)
                    billable_hours[month] = round(data['billable'] / count, 1)
                    break_time[month] = round(data['break'] / count, 1)
                    productivity_scores[month] = round(data['productivity'] / count, 1)
            
            if chart_type == 'time':
                chart_data = {
                    'labels': labels,
                    'datasets': [
                        {
                            'label': 'Total Hours',
                            'data': total_hours,
                            'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                            'borderColor': 'rgba(54, 162, 235, 1)',
                            'borderWidth': 1
                        },
                        {
                            'label': 'Billable Hours',
                            'data': billable_hours,
                            'backgroundColor': 'rgba(75, 192, 192, 0.5)',
                            'borderColor': 'rgba(75, 192, 192, 1)',
                            'borderWidth': 1
                        },
                        {
                            'label': 'Break Time',
                            'data': break_time,
                            'backgroundColor': 'rgba(255, 159, 64, 0.5)',
                            'borderColor': 'rgba(255, 159, 64, 1)',
                            'borderWidth': 1
                        }
                    ]
                }
                serializer = TimeChartDataSerializer(chart_data)
            else:  # productivity
                chart_data = {
                    'labels': labels,
                    'datasets': [
                        {
                            'label': 'Productivity Score',
                            'data': productivity_scores,
                            'backgroundColor': 'rgba(255, 99, 132, 0.5)',
                            'borderColor': 'rgba(255, 99, 132, 1)',
                            'borderWidth': 1
                        }
                    ]
                }
                serializer = ProductivityChartDataSerializer(chart_data)
        
        return Response(serializer.data)


class GenerateReportView(APIView):
    """API view to generate a time report."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Generate a time report."""
        # Validate request data
        serializer = TimeReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create a new report
        report = TimeReport.objects.create(
            business=request.user.business,
            creator=request.user,
            name=serializer.validated_data.get('name', f'Report {datetime.now().strftime("%Y-%m-%d")}'),
            description=serializer.validated_data.get('description', ''),
            start_date=serializer.validated_data['start_date'],
            end_date=serializer.validated_data['end_date'],
            filters=serializer.validated_data.get('filters', {}),
            chart_type=serializer.validated_data.get('chart_type', 'bar'),
            report_format=serializer.validated_data.get('report_format', 'custom')
        )
        
        # Generate report data
        time_entries = TimeEntry.objects.filter(
            business=request.user.business,
            start_time__date__gte=report.start_date,
            start_time__date__lte=report.end_date
        )
        
        # Apply filters
        filters = report.filters or {}
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
        
        # Calculate data by user
        user_data = []
        for user_id, user_name in time_entries.values_list('user__id', 'user__first_name').distinct():
            user_entries = time_entries.filter(user__id=user_id)
            user_duration = user_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            user_data.append({
                'user_id': user_id,
                'user_name': user_name,
                'hours': user_duration.total_seconds() / 3600,
                'entry_count': user_entries.count()
            })
        
        # Calculate data by task
        task_data = []
        for task_id, task_title in time_entries.filter(task__isnull=False).values_list('task__id', 'task__title').distinct():
            task_entries = time_entries.filter(task__id=task_id)
            task_duration = task_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            task_data.append({
                'task_id': task_id,
                'task_title': task_title,
                'hours': task_duration.total_seconds() / 3600,
                'entry_count': task_entries.count()
            })
        
        # Calculate data by client
        client_data = []
        for client_id, client_name in time_entries.filter(client__isnull=False).values_list('client__id', 'client__name').distinct():
            client_entries = time_entries.filter(client__id=client_id)
            client_duration = client_entries.aggregate(
                total=Sum('duration', filter=Q(duration__isnull=False))
            )['total'] or timedelta(0)
            
            client_data.append({
                'client_id': client_id,
                'client_name': client_name,
                'hours': client_duration.total_seconds() / 3600,
                'entry_count': client_entries.count()
            })
        
        # Generate chart data based on report format
        chart_data = {}
        if report.report_format in ['daily', 'weekly', 'monthly']:
            # Generate date range
            if report.report_format == 'daily':
                date_range = [report.start_date + timedelta(days=i) for i in range((report.end_date - report.start_date).days + 1)]
                date_format = '%Y-%m-%d'
            elif report.report_format == 'weekly':
                # Group by weeks
                date_range = []
                current = report.start_date
                while current <= report.end_date:
                    week_start = current - timedelta(days=current.weekday())
                    date_range.append(week_start)
                    current = week_start + timedelta(days=7)
                date_format = 'Week %W, %Y'
            elif report.report_format == 'monthly':
                # Group by months
                date_range = []
                current = report.start_date.replace(day=1)
                while current <= report.end_date:
                    date_range.append(current)
                    if current.month == 12:
                        current = date(current.year + 1, 1, 1)
                    else:
                        current = date(current.year, current.month + 1, 1)
                date_format = '%B %Y'
            
            # Format labels
            labels = [d.strftime(date_format) for d in date_range]
            
            # Create datasets for chart
            datasets = []
            
            # For each date in range, calculate total hours
            if 'user_id' in filters and filters['user_id']:
                # If a user is specified, show data by date
                data = [0] * len(date_range)
                
                for i, d in enumerate(date_range):
                    if report.report_format == 'daily':
                        entries = time_entries.filter(start_time__date=d)
                    elif report.report_format == 'weekly':
                        entries = time_entries.filter(
                            start_time__date__gte=d,
                            start_time__date__lt=d + timedelta(days=7)
                        )
                    elif report.report_format == 'monthly':
                        if d.month == 12:
                            next_month = date(d.year + 1, 1, 1)
                        else:
                            next_month = date(d.year, d.month + 1, 1)
                        entries = time_entries.filter(
                            start_time__date__gte=d,
                            start_time__date__lt=next_month
                        )
                    
                    duration = entries.aggregate(
                        total=Sum('duration', filter=Q(duration__isnull=False))
                    )['total'] or timedelta(0)
                    
                    data[i] = round(duration.total_seconds() / 3600, 1)
                
                datasets.append({
                    'label': 'Hours',
                    'data': data,
                    'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                    'borderColor': 'rgba(54, 162, 235, 1)',
                    'borderWidth': 1
                })
            else:
                # If no user is specified, show data by user
                for user in user_data:
                    user_id = user['user_id']
                    user_name = user['user_name']
                    
                    data = [0] * len(date_range)
                    
                    for i, d in enumerate(date_range):
                        if report.report_format == 'daily':
                            entries = time_entries.filter(user_id=user_id, start_time__date=d)
                        elif report.report_format == 'weekly':
                            entries = time_entries.filter(
                                user_id=user_id,
                                start_time__date__gte=d,
                                start_time__date__lt=d + timedelta(days=7)
                            )
                        elif report.report_format == 'monthly':
                            if d.month == 12:
                                next_month = date(d.year + 1, 1, 1)
                            else:
                                next_month = date(d.year, d.month + 1, 1)
                            entries = time_entries.filter(
                                user_id=user_id,
                                start_time__date__gte=d,
                                start_time__date__lt=next_month
                            )
                        
                        duration = entries.aggregate(
                            total=Sum('duration', filter=Q(duration__isnull=False))
                        )['total'] or timedelta(0)
                        
                        data[i] = round(duration.total_seconds() / 3600, 1)
                    
                    datasets.append({
                        'label': user_name,
                        'data': data,
                        'backgroundColor': f'rgba({user_id * 50 % 255}, {(user_id * 30 + 100) % 255}, {(user_id * 70 + 50) % 255}, 0.5)',
                        'borderColor': f'rgba({user_id * 50 % 255}, {(user_id * 30 + 100) % 255}, {(user_id * 70 + 50) % 255}, 1)',
                        'borderWidth': 1
                    })
            
            chart_data = {
                'labels': labels,
                'datasets': datasets
            }
        
        # Store report data
        report.data = {
            'entry_count': time_entries.count(),
            'total_hours': total_duration.total_seconds() / 3600,
            'user_data': user_data,
            'task_data': task_data,
            'client_data': client_data,
            'chart_data': chart_data,
            'generated_at': timezone.now().isoformat()
        }
        report.save()
        
        response_serializer = TimeReportSerializer(report)
        return Response(response_serializer.data)
