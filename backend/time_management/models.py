from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone

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
    
    # Optional client link
    client = models.ForeignKey(
        'clients.Client',
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
