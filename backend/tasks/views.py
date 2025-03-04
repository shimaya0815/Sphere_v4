from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Task, TaskCategory, TaskStatus, TaskPriority, TaskComment, TaskAttachment, TaskTimer, TaskHistory, TaskNotification
from .serializers import (
    TaskSerializer, TaskCategorySerializer, TaskStatusSerializer, 
    TaskPrioritySerializer, TaskCommentSerializer, TaskAttachmentSerializer, 
    TaskTimerSerializer, TaskHistorySerializer, TaskNotificationSerializer
)
from business.permissions import IsSameBusiness
from django.db.models import Q
from rest_framework.filters import SearchFilter, OrderingFilter

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'status__order', 'priority__level']
    ordering = ['-created_at']
    
    def update(self, request, *args, **kwargs):
        """Custom update method to handle task updates properly"""
        print(f"TASK UPDATE REQUEST: {request.data}")
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Log the update details for debugging
        print(f"Updating task {instance.id} with data: {request.data}")
        print(f"Current task status: {instance.status.id if instance.status else None}")
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Get the updated instance for returning the complete data
        updated_instance = self.get_object()
        print(f"Updated task status: {updated_instance.status.id if updated_instance.status else None}")
        
        # Create a serialized response with the fully updated task
        response_serializer = self.get_serializer(updated_instance)
        return Response(response_serializer.data)
    
    def get_queryset(self):
        """Return tasks for the authenticated user's business."""
        queryset = Task.objects.filter(business=self.request.user.business)
        
        # Filter by is_template (only show non-templates by default)
        queryset = queryset.filter(is_template=False)
        
        # Apply filters from query parameters
        status = self.request.query_params.get('status', None)
        priority = self.request.query_params.get('priority', None)
        category = self.request.query_params.get('category', None)
        search_term = self.request.query_params.get('searchTerm', None)
        is_fiscal_task = self.request.query_params.get('is_fiscal_task', None)
        client = self.request.query_params.get('client', None)
        
        if status:
            queryset = queryset.filter(status__name__icontains=status)
        
        if priority:
            queryset = queryset.filter(priority__name__icontains=priority)
            
        if category:
            queryset = queryset.filter(category__name__icontains=category)
            
        # 決算期タスクのフィルタリング
        if is_fiscal_task is not None:
            is_fiscal = is_fiscal_task.lower() == 'true'
            queryset = queryset.filter(is_fiscal_task=is_fiscal)
            
        # クライアントでフィルタリング
        if client:
            queryset = queryset.filter(client_id=client)
            
        if search_term:
            queryset = queryset.filter(
                Q(title__icontains=search_term) | 
                Q(description__icontains=search_term)
            )
            
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a task."""
        # リクエストデータの詳細デバッグ
        print("REQUEST DATA TYPE:", type(request.data))
        print("REQUEST DATA CONTENT:", request.data)
        print("REQUEST METHOD:", request.method)
        print("REQUEST PATH:", request.path)
        print("REQUEST CONTENT TYPE:", request.content_type)
        print("REQUEST USER:", request.user)
        print("REQUEST USER BUSINESS:", request.user.business)
        
        try:
            # ワークスペースの取得
            workspace = request.user.business.workspaces.first()
            if not workspace:
                print("NO WORKSPACE FOUND")
                return Response(
                    {"detail": "No workspace found for this business"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print("WORKSPACE:", workspace.id, workspace.name)
            
            # 新しいデータディクショナリを作成（元のデータを変更しない）
            data_dict = dict(request.data.items())
            data_dict['workspace'] = workspace.id
            data_dict['business'] = request.user.business.id
            
            print("DATA DICT:", data_dict)
            
            # シリアライザでデータをバリデーション
            serializer = self.get_serializer(data=data_dict)
            
            if not serializer.is_valid():
                print("VALIDATION ERRORS:", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # タスク作成
            task = serializer.save(business=request.user.business, creator=request.user)
            print("TASK CREATED:", task.id, task.title)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print("ERROR CREATING TASK:", str(e))
            print("ERROR TYPE:", type(e))
            import traceback
            print("TRACEBACK:")
            traceback.print_exc()
            return Response(
                {"detail": f"Error creating task: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        task = self.get_object()
        task.mark_complete(user=request.user)
        serializer = self.get_serializer(task)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='timers/start')
    def start_timer(self, request, pk=None):
        task = self.get_object()
        timer = TaskTimer.objects.create(
            task=task,
            user=request.user,
            start_time=timezone.now()
        )
        return Response({
            'id': timer.id, 
            'status': 'timer started',
            'active_timer': True
        })
    
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
        return Response({
            'id': timer.id, 
            'status': 'timer stopped',
            'active_timer': False,
            'duration': str(timer.duration)
        })


class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return categories for the authenticated user's business."""
        return TaskCategory.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class TaskStatusViewSet(viewsets.ModelViewSet):
    queryset = TaskStatus.objects.all()
    serializer_class = TaskStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return statuses for the authenticated user's business."""
        return TaskStatus.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class TaskPriorityViewSet(viewsets.ModelViewSet):
    queryset = TaskPriority.objects.all()
    serializer_class = TaskPrioritySerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return priorities for the authenticated user's business."""
        return TaskPriority.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class TaskCommentViewSet(viewsets.ModelViewSet):
    queryset = TaskComment.objects.all()
    serializer_class = TaskCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return comments for tasks in the authenticated user's business."""
        return TaskComment.objects.filter(task__business=self.request.user.business)


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAttachment.objects.all()
    serializer_class = TaskAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return attachments for tasks in the authenticated user's business."""
        return TaskAttachment.objects.filter(task__business=self.request.user.business)


class TaskTimerViewSet(viewsets.ModelViewSet):
    queryset = TaskTimer.objects.all()
    serializer_class = TaskTimerSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return timers for tasks in the authenticated user's business."""
        return TaskTimer.objects.filter(task__business=self.request.user.business)


class TaskTemplateViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.filter(is_template=True)
    serializer_class = TaskSerializer
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
        
        serializer = self.get_serializer(new_task)
        return Response(serializer.data)
