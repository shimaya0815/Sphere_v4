from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class TaskCategory(models.Model):
    """Category for tasks."""
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_categories'
    )
    name = models.CharField(_('name'), max_length=100)
    color = models.CharField(_('color'), max_length=20, default='#3B82F6')  # Default blue
    description = models.TextField(_('description'), blank=True)
    
    class Meta:
        verbose_name = _('task category')
        verbose_name_plural = _('task categories')
        ordering = ['name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name


class TaskStatus(models.Model):
    """Status for tasks."""
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_statuses'
    )
    name = models.CharField(_('name'), max_length=100)
    color = models.CharField(_('color'), max_length=20, default='#3B82F6')  # Default blue
    description = models.TextField(_('description'), blank=True)
    order = models.PositiveIntegerField(_('order'), default=0)
    
    class Meta:
        verbose_name = _('task status')
        verbose_name_plural = _('task statuses')
        ordering = ['order', 'name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name


class TaskPriority(models.Model):
    """Priority for tasks."""
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_priorities'
    )
    name = models.CharField(_('name'), max_length=100)
    color = models.CharField(_('color'), max_length=20, default='#3B82F6')  # Default blue
    description = models.TextField(_('description'), blank=True)
    level = models.PositiveIntegerField(_('level'), default=0)  # Higher means more important
    
    class Meta:
        verbose_name = _('task priority')
        verbose_name_plural = _('task priorities')
        ordering = ['-level', 'name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name


class Task(models.Model):
    """Task model."""
    
    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    workspace = models.ForeignKey(
        'business.Workspace',
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    status = models.ForeignKey(
        TaskStatus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    priority = models.ForeignKey(
        TaskPriority,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    category = models.ForeignKey(
        TaskCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks'
    )
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks_to_approve'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    due_date = models.DateTimeField(_('due date'), null=True, blank=True)
    start_date = models.DateTimeField(_('start date'), null=True, blank=True)
    completed_at = models.DateTimeField(_('completed at'), null=True, blank=True)
    estimated_hours = models.DecimalField(
        _('estimated hours'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Optional link to a client
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    # For recurring tasks
    is_recurring = models.BooleanField(_('is recurring'), default=False)
    recurrence_pattern = models.CharField(
        _('recurrence pattern'),
        max_length=50,
        choices=(
            ('daily', _('Daily')),
            ('weekly', _('Weekly')),
            ('monthly', _('Monthly')),
            ('yearly', _('Yearly')),
        ),
        null=True,
        blank=True
    )
    recurrence_end_date = models.DateTimeField(_('recurrence end date'), null=True, blank=True)
    
    # For template tasks
    is_template = models.BooleanField(_('is template'), default=False)
    template_name = models.CharField(_('template name'), max_length=255, blank=True)
    
    class Meta:
        verbose_name = _('task')
        verbose_name_plural = _('tasks')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def mark_complete(self, user=None):
        """Mark the task as complete."""
        self.completed_at = timezone.now()
        if self.status:
            # Find a "Completed" status or similar
            completed_status = TaskStatus.objects.filter(
                business=self.business,
                name__icontains='complete'
            ).first()
            if completed_status:
                self.status = completed_status
        self.save()
        
        # Create a task history entry
        TaskHistory.objects.create(
            task=self,
            user=user,
            field_name='status',
            old_value=self.status.name if self.status else None,
            new_value='Completed'
        )


class TaskComment(models.Model):
    """Comments on tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_comments'
    )
    content = models.TextField(_('content'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # For @mentions
    mentioned_users = models.ManyToManyField(
        User,
        related_name='mentioned_in_comments',
        blank=True
    )
    
    class Meta:
        verbose_name = _('task comment')
        verbose_name_plural = _('task comments')
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.get_full_name()} on {self.task.title}"


class TaskAttachment(models.Model):
    """Attachments for tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_attachments'
    )
    file = models.FileField(_('file'), upload_to='task_attachments/')
    filename = models.CharField(_('filename'), max_length=255)
    file_type = models.CharField(_('file type'), max_length=100)
    file_size = models.PositiveIntegerField(_('file size'))
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('task attachment')
        verbose_name_plural = _('task attachments')
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.filename


class TaskHistory(models.Model):
    """History of changes to tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='history'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_history_entries'
    )
    timestamp = models.DateTimeField(_('timestamp'), auto_now_add=True)
    field_name = models.CharField(_('field name'), max_length=100)
    old_value = models.TextField(_('old value'), blank=True, null=True)
    new_value = models.TextField(_('new value'), blank=True, null=True)
    
    class Meta:
        verbose_name = _('task history')
        verbose_name_plural = _('task history entries')
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.field_name} changed on {self.task.title}"


class TaskTimer(models.Model):
    """Timer for tracking time spent on tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='timers'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_timers'
    )
    start_time = models.DateTimeField(_('start time'))
    end_time = models.DateTimeField(_('end time'), null=True, blank=True)
    duration = models.DurationField(_('duration'), null=True, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    
    class Meta:
        verbose_name = _('task timer')
        verbose_name_plural = _('task timers')
        ordering = ['-start_time']
    
    def __str__(self):
        return f"Timer for {self.task.title} by {self.user.get_full_name()}"
    
    def stop_timer(self):
        """Stop the timer and calculate duration."""
        if not self.end_time:
            self.end_time = timezone.now()
            self.duration = self.end_time - self.start_time
            self.save()
    
    def resume_timer(self):
        """Resume a stopped timer."""
        self.end_time = None
        self.save()


class TaskNotification(models.Model):
    """Notifications related to tasks."""
    
    TYPE_CHOICES = (
        ('assignment', _('Task Assignment')),
        ('due_soon', _('Task Due Soon')),
        ('overdue', _('Task Overdue')),
        ('comment', _('New Comment')),
        ('mention', _('Mention')),
        ('status_change', _('Status Change')),
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_notifications'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(_('type'), max_length=20, choices=TYPE_CHOICES)
    content = models.TextField(_('content'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    read = models.BooleanField(_('read'), default=False)
    
    class Meta:
        verbose_name = _('task notification')
        verbose_name_plural = _('task notifications')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} notification for {self.user.get_full_name()}"
