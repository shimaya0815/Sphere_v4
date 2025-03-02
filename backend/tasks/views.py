from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Task, TaskCategory, TaskStatus, TaskPriority, TaskComment, TaskAttachment, TaskTimer, TaskHistory, TaskNotification
from business.permissions import IsSameBusiness
from django.db.models import Q

# ViewSets will be implemented properly later, these are placeholders
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return tasks for the authenticated user's business."""
        return Task.objects.filter(business=self.request.user.business)
    
    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        task = self.get_object()
        task.mark_complete(user=request.user)
        return Response({'status': 'task marked as complete'})
    
    @action(detail=True, methods=['post'], url_path='timers/start')
    def start_timer(self, request, pk=None):
        task = self.get_object()
        timer = TaskTimer.objects.create(
            task=task,
            user=request.user,
            start_time=timezone.now()
        )
        return Response({'id': timer.id, 'status': 'timer started'})
    
    @action(detail=True, methods=['post'], url_path='timers/stop')
    def stop_timer(self, request, pk=None):
        task = self.get_object()
        timer = TaskTimer.objects.filter(
            task=task,
            user=request.user,
            end_time=None
        ).first()
        
        if not timer:
            return Response(
                {'error': 'No active timer found for this task'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timer.stop_timer()
        return Response({'id': timer.id, 'status': 'timer stopped'})


class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return categories for the authenticated user's business."""
        return TaskCategory.objects.filter(business=self.request.user.business)


class TaskStatusViewSet(viewsets.ModelViewSet):
    queryset = TaskStatus.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return statuses for the authenticated user's business."""
        return TaskStatus.objects.filter(business=self.request.user.business)


class TaskPriorityViewSet(viewsets.ModelViewSet):
    queryset = TaskPriority.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return priorities for the authenticated user's business."""
        return TaskPriority.objects.filter(business=self.request.user.business)


class TaskCommentViewSet(viewsets.ModelViewSet):
    queryset = TaskComment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return comments for tasks in the authenticated user's business."""
        return TaskComment.objects.filter(task__business=self.request.user.business)


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAttachment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return attachments for tasks in the authenticated user's business."""
        return TaskAttachment.objects.filter(task__business=self.request.user.business)


class TaskTimerViewSet(viewsets.ModelViewSet):
    queryset = TaskTimer.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return timers for tasks in the authenticated user's business."""
        return TaskTimer.objects.filter(task__business=self.request.user.business)


class TaskTemplateViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.filter(is_template=True)
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return task templates for the authenticated user's business."""
        return Task.objects.filter(
            business=self.request.user.business,
            is_template=True
        )
    
    @action(detail=True, methods=['post'], url_path='apply')
    def apply_template(self, request, pk=None):
        template = self.get_object()
        
        # Create a new task from the template
        new_task = Task.objects.create(
            title=request.data.get('title', template.title),
            description=template.description,
            business=request.user.business,
            workspace=request.data.get('workspace_id', template.workspace_id),
            status=template.status,
            priority=template.priority,
            category=template.category,
            creator=request.user,
            assignee=request.data.get('assignee_id', None),
            due_date=request.data.get('due_date', None),
            estimated_hours=template.estimated_hours,
            client=request.data.get('client_id', None),
            is_recurring=request.data.get('is_recurring', False),
            recurrence_pattern=request.data.get('recurrence_pattern', None),
        )
        
        return Response({'id': new_task.id, 'status': 'task created from template'})
