from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class TimeEntry(models.Model):
    """Time entry for tracking time spent on tasks."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='time_entries'
    )
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='time_entries',
        null=True,
        blank=True
    )
    description = models.TextField(_('description'), blank=True)
    
    # Time tracking
    start_time = models.DateTimeField(_('start time'))
    end_time = models.DateTimeField(_('end time'), null=True, blank=True)
    duration = models.DurationField(_('duration'), null=True, blank=True)
    
    # Additional fields
    is_billable = models.BooleanField(_('is billable'), default=True)
    is_approved = models.BooleanField(_('is approved'), default=False)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_time_entries'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # Productivity score (0-100)
    productivity_score = models.IntegerField(_('productivity score'), null=True, blank=True)
    
    # Optional client link
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='time_entries'
    )
    
    # Optional fiscal year link
    fiscal_year = models.ForeignKey(
        'clients.FiscalYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='time_entries'
    )
    
    # Business link
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='time_entries'
    )
    
    class Meta:
        verbose_name = _('time entry')
        verbose_name_plural = _('time entries')
        ordering = ['-start_time']
    
    def __str__(self):
        if self.task:
            return f"Time entry for {self.task.title} by {self.user.get_full_name()}"
        return f"Time entry by {self.user.get_full_name()} on {self.start_time.date()}"
    
    def save(self, *args, **kwargs):
        # Calculate duration if start and end times are set
        if self.start_time and self.end_time and self.end_time > self.start_time:
            self.duration = self.end_time - self.start_time
        
        super().save(*args, **kwargs)
    
    def stop_timer(self):
        """Stop the timer and calculate duration."""
        if not self.end_time:
            self.end_time = timezone.now()
            self.duration = self.end_time - self.start_time
            self.save()
    
    def effective_duration(self):
        """Calculate effective duration by subtracting breaks."""
        if not self.duration:
            return timedelta(0)
            
        break_time = timedelta(0)
        for break_obj in self.breaks.all():
            if break_obj.duration:
                break_time += break_obj.duration
                
        return self.duration - break_time


class DailyAnalytics(models.Model):
    """Daily time tracking analytics."""
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='daily_analytics'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_analytics'
    )
    date = models.DateField(_('date'))
    
    # Time metrics
    total_hours = models.FloatField(_('total hours'), default=0)
    billable_hours = models.FloatField(_('billable hours'), default=0)
    break_time = models.FloatField(_('break time'), default=0)
    
    # Productivity metrics
    productivity_score = models.FloatField(_('productivity score'), default=0)
    task_completion_rate = models.FloatField(_('task completion rate'), default=0)
    
    # Task metrics
    tasks_worked = models.IntegerField(_('tasks worked'), default=0)
    tasks_completed = models.IntegerField(_('tasks completed'), default=0)
    
    # JSON data for detailed analytics
    hourly_data = models.JSONField(_('hourly data'), default=dict, blank=True)
    task_data = models.JSONField(_('task data'), default=dict, blank=True)
    tags = models.JSONField(_('tags'), default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('daily analytics')
        verbose_name_plural = _('daily analytics')
        unique_together = ('user', 'date', 'business')
        ordering = ['-date']
    
    def __str__(self):
        return f"Daily Analytics for {self.user.get_full_name()} on {self.date}"


class TimeReport(models.Model):
    """Saved time reports."""
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='time_reports'
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_time_reports'
    )
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    
    # Report parameters
    start_date = models.DateField(_('start date'))
    end_date = models.DateField(_('end date'))
    
    # Filter options (stored as JSON)
    filters = models.JSONField(_('filters'), default=dict, blank=True)
    
    # Report data (stored as JSON)
    data = models.JSONField(_('data'), default=dict, blank=True)
    
    # Chart type options
    CHART_TYPES = (
        ('bar', _('Bar Chart')),
        ('line', _('Line Chart')),
        ('pie', _('Pie Chart')),
        ('table', _('Table')),
    )
    chart_type = models.CharField(_('chart type'), max_length=10, choices=CHART_TYPES, default='bar')
    
    # Report format options
    REPORT_FORMATS = (
        ('daily', _('Daily')),
        ('weekly', _('Weekly')),
        ('monthly', _('Monthly')),
        ('custom', _('Custom')),
    )
    report_format = models.CharField(_('report format'), max_length=10, choices=REPORT_FORMATS, default='custom')
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('time report')
        verbose_name_plural = _('time reports')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name


class Break(models.Model):
    """Break during a time entry."""
    
    time_entry = models.ForeignKey(
        TimeEntry,
        on_delete=models.CASCADE,
        related_name='breaks'
    )
    start_time = models.DateTimeField(_('start time'))
    end_time = models.DateTimeField(_('end time'), null=True, blank=True)
    duration = models.DurationField(_('duration'), null=True, blank=True)
    reason = models.CharField(_('reason'), max_length=255, blank=True)
    
    class Meta:
        verbose_name = _('break')
        verbose_name_plural = _('breaks')
        ordering = ['start_time']
    
    def __str__(self):
        return f"Break for {self.time_entry}"
    
    def save(self, *args, **kwargs):
        # Calculate duration if start and end times are set
        if self.start_time and self.end_time and self.end_time > self.start_time:
            self.duration = self.end_time - self.start_time
        
        super().save(*args, **kwargs)
    
    def stop_break(self):
        """Stop the break and calculate duration."""
        if not self.end_time:
            self.end_time = timezone.now()
            self.duration = self.end_time - self.start_time
            self.save()
