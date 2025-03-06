from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TimeEntry, TimeReport, Break, DailyAnalytics
from tasks.models import Task
from clients.models import Client

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    """Minimal user data for time entries."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name')
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class TaskMiniSerializer(serializers.ModelSerializer):
    """Minimal task data for time entries."""
    
    class Meta:
        model = Task
        fields = ('id', 'title')


class ClientMiniSerializer(serializers.ModelSerializer):
    """Minimal client data for time entries."""
    
    class Meta:
        model = Client
        fields = ('id', 'name')


class BreakSerializer(serializers.ModelSerializer):
    """Serializer for breaks."""
    
    duration_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = Break
        fields = ('id', 'time_entry', 'start_time', 'end_time', 'duration', 'duration_seconds', 'reason')
        read_only_fields = ('duration',)
    
    def get_duration_seconds(self, obj):
        if obj.duration:
            return obj.duration.total_seconds()
        elif obj.end_time and obj.start_time:
            return (obj.end_time - obj.start_time).total_seconds()
        return None


class FiscalYearMiniSerializer(serializers.ModelSerializer):
    """Minimal fiscal year data for time entries."""
    
    class Meta:
        model = Client  # This will be changed to FiscalYear
        fields = ('id', 'fiscal_period')
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from clients.models import FiscalYear
        self.Meta.model = FiscalYear


class TimeEntrySerializer(serializers.ModelSerializer):
    """Serializer for time entries."""
    
    user = UserMiniSerializer(read_only=True)
    task = TaskMiniSerializer(read_only=True)
    client = ClientMiniSerializer(read_only=True)
    fiscal_year = FiscalYearMiniSerializer(read_only=True)
    approved_by = UserMiniSerializer(read_only=True)
    breaks = BreakSerializer(many=True, read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    is_running = serializers.SerializerMethodField()
    
    class Meta:
        model = TimeEntry
        fields = (
            'id', 'user', 'task', 'description', 'start_time', 'end_time',
            'duration', 'duration_seconds', 'is_billable', 'is_approved',
            'approved_by', 'client', 'fiscal_year', 'breaks', 'is_running', 'created_at', 
            'updated_at'
        )
        read_only_fields = ('duration', 'user', 'approved_by', 'business')
    
    def get_duration_seconds(self, obj):
        if obj.duration:
            return obj.duration.total_seconds()
        elif obj.end_time and obj.start_time:
            return (obj.end_time - obj.start_time).total_seconds()
        return None
    
    def get_is_running(self, obj):
        return obj.end_time is None


class TimeEntryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating time entries."""
    
    task_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    client_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    fiscal_year_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = TimeEntry
        fields = (
            'id', 'task_id', 'description', 'start_time', 'end_time',
            'is_billable', 'client_id', 'fiscal_year_id'
        )
    
    def validate(self, attrs):
        # Validate task_id if provided
        task_id = attrs.pop('task_id', None)
        if task_id:
            try:
                task = Task.objects.get(
                    id=task_id,
                    business=self.context['request'].user.business
                )
                attrs['task'] = task
            except Task.DoesNotExist:
                raise serializers.ValidationError({'task_id': 'Invalid task ID'})
        
        # Validate client_id if provided
        client_id = attrs.pop('client_id', None)
        if client_id:
            try:
                client = Client.objects.get(
                    id=client_id,
                    business=self.context['request'].user.business
                )
                attrs['client'] = client
            except Client.DoesNotExist:
                raise serializers.ValidationError({'client_id': 'Invalid client ID'})
        
        # Validate fiscal_year_id if provided
        fiscal_year_id = attrs.pop('fiscal_year_id', None)
        if fiscal_year_id:
            from clients.models import FiscalYear
            try:
                fiscal_year = FiscalYear.objects.get(
                    id=fiscal_year_id,
                    client__business=self.context['request'].user.business
                )
                attrs['fiscal_year'] = fiscal_year
            except FiscalYear.DoesNotExist:
                raise serializers.ValidationError({'fiscal_year_id': 'Invalid fiscal year ID'})
        
        # Validate start and end times
        if 'start_time' in attrs and 'end_time' in attrs:
            if attrs['end_time'] and attrs['start_time'] > attrs['end_time']:
                raise serializers.ValidationError({'end_time': 'End time must be after start time'})
        
        return attrs


class BreakCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating breaks."""
    
    class Meta:
        model = Break
        fields = ('id', 'time_entry', 'start_time', 'end_time', 'reason')
    
    def validate(self, attrs):
        # Validate time_entry exists and belongs to the user
        if 'time_entry' in attrs:
            if attrs['time_entry'].user != self.context['request'].user:
                raise serializers.ValidationError({'time_entry': 'You can only create breaks for your own time entries'})
        
        # Validate start and end times
        if 'start_time' in attrs and 'end_time' in attrs and attrs['end_time']:
            if attrs['start_time'] > attrs['end_time']:
                raise serializers.ValidationError({'end_time': 'End time must be after start time'})
        
        return attrs


class TimeReportSerializer(serializers.ModelSerializer):
    """Serializer for time reports."""
    
    creator = UserMiniSerializer(read_only=True)
    
    class Meta:
        model = TimeReport
        fields = (
            'id', 'name', 'description', 'start_date', 'end_date',
            'filters', 'data', 'creator', 'created_at', 'updated_at'
        )
        read_only_fields = ('creator', 'business', 'data')


class TimeReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating time reports."""
    
    class Meta:
        model = TimeReport
        fields = ('id', 'name', 'description', 'start_date', 'end_date', 'filters')
    
    def validate(self, attrs):
        # Validate start and end dates
        if 'start_date' in attrs and 'end_date' in attrs:
            if attrs['start_date'] > attrs['end_date']:
                raise serializers.ValidationError({'end_date': 'End date must be after start date'})
        
        return attrs


class TimerStartSerializer(serializers.Serializer):
    """Serializer for starting a timer."""
    
    task_id = serializers.IntegerField(required=False, allow_null=True)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    fiscal_year_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)


class BreakStartSerializer(serializers.Serializer):
    """Serializer for starting a break."""
    
    reason = serializers.CharField(required=False, allow_blank=True)


class TimeSummarySerializer(serializers.Serializer):
    """Serializer for time summary data."""
    
    today = serializers.DictField()
    this_week = serializers.DictField()
    this_month = serializers.DictField()
    has_active_timer = serializers.BooleanField()
    active_timer = TimeEntrySerializer(allow_null=True)


class DailyAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for daily analytics."""
    
    user = UserMiniSerializer(read_only=True)
    
    class Meta:
        model = DailyAnalytics
        fields = (
            'id', 'user', 'date', 'total_hours', 'billable_hours', 'break_time',
            'productivity_score', 'task_completion_rate', 'tasks_worked',
            'tasks_completed', 'hourly_data', 'task_data', 'tags',
            'created_at', 'updated_at'
        )
        read_only_fields = ('business',)


class DailyAnalyticsCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating daily analytics."""
    
    class Meta:
        model = DailyAnalytics
        fields = (
            'id', 'user', 'date', 'total_hours', 'billable_hours', 'break_time',
            'productivity_score', 'task_completion_rate', 'tasks_worked',
            'tasks_completed', 'hourly_data', 'task_data', 'tags'
        )
        read_only_fields = ('business',)


class TimeChartDataSerializer(serializers.Serializer):
    """Serializer for time chart data."""
    
    labels = serializers.ListField(child=serializers.CharField())
    datasets = serializers.ListField(child=serializers.DictField())
    
    
class ProductivityChartDataSerializer(serializers.Serializer):
    """Serializer for productivity chart data."""
    
    labels = serializers.ListField(child=serializers.CharField())
    datasets = serializers.ListField(child=serializers.DictField())