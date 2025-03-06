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
    ordering_fields = ['created_at', 'due_date', 'status__order', 'priority__level', 'assignee__first_name', 'category__name']
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
        
    def perform_update(self, serializer):
        """更新時に必要な関連処理を実行"""
        # ユーザー情報を保存して、履歴作成などに使用
        instance = serializer.save(user=self.request.user)
        
        # タスクが完了に設定された場合、completed_at を設定
        if instance.status and instance.status.name == '完了' and not instance.completed_at:
            instance.completed_at = timezone.now()
            instance.save()
    
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
            # ステータス名での検索とコード名での検索に対応
            if status in ['not_started', 'in_progress', 'in_review', 'completed']:
                # フロントエンドから送られてくるコード名に基づいてフィルタリング
                status_map = {
                    'not_started': '未着手',
                    'in_progress': '作業中',
                    'in_review': 'レビュー',  # "レビュー中"や"レビュー待ち"にも部分一致
                    'completed': '完了'
                }
                queryset = queryset.filter(status__name__icontains=status_map[status])
            else:
                # 直接名前または識別子でフィルタリング
                queryset = queryset.filter(Q(status__name__icontains=status) | Q(status__id=status if status.isdigit() else 0))
        
        if priority:
            # 優先度名での検索とコード名での検索に対応
            if priority in ['high', 'medium', 'low']:
                # フロントエンドから送られてくるコード名に基づいてフィルタリング
                priority_map = {
                    'high': '高',
                    'medium': '中',
                    'low': '低'
                }
                queryset = queryset.filter(priority__name__icontains=priority_map[priority])
            else:
                # 直接名前または識別子でフィルタリング
                queryset = queryset.filter(Q(priority__name__icontains=priority) | Q(priority__id=priority if priority.isdigit() else 0))
            
        if category:
            # カテゴリ名または識別子でフィルタリング
            queryset = queryset.filter(Q(category__name__icontains=category) | Q(category__id=category if category.isdigit() else 0))
            
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
        
    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        """タスクのステータスを変更するエンドポイント"""
        task = self.get_object()
        status_id = request.data.get('status_id')
        
        if not status_id:
            return Response(
                {"detail": "status_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            new_status = TaskStatus.objects.get(id=status_id, business=request.user.business)
            old_status = task.status
            
            # ステータス変更
            task.status = new_status
            task._update_assignee_based_on_status()
            task.save(user=request.user)
            
            # タスク完了ステータスに変更された場合、completed_atを設定
            if new_status.name == '完了' and not task.completed_at:
                task.completed_at = timezone.now()
                task.save(user=request.user)
            
            # 通知作成（ステータス変更）
            TaskNotification.objects.create(
                user=task.assignee if task.assignee else task.creator,
                task=task,
                notification_type='status_change',
                content=f'タスク「{task.title}」のステータスが「{old_status.name if old_status else "未設定"}」から「{new_status.name}」に変更されました。'
            )
            
            # WebSocketでステータス変更を通知
            try:
                import requests
                import json
                
                # FastAPIサーバーのエンドポイント
                websocket_url = "http://websocket:8001/api/notify_task_status"
                
                # 通知データを作成
                notification_data = {
                    "type": "status_change",
                    "task_id": task.id,
                    "task_title": task.title,
                    "old_status": old_status.name if old_status else "未設定",
                    "new_status": new_status.name,
                    "user_name": request.user.get_full_name() or request.user.username
                }
                
                # FastAPIサーバーに通知を送信
                requests.post(
                    websocket_url,
                    json=notification_data,
                    timeout=2
                )
            except Exception as e:
                print(f"WebSocket通知の送信に失敗しました: {str(e)}")
            
            serializer = self.get_serializer(task)
            return Response(serializer.data)
            
        except TaskStatus.DoesNotExist:
            return Response(
                {"detail": "Invalid status_id"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
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
        
    @action(detail=False, methods=['post'], url_path='create-for-value')
    def create_for_value(self, request):
        """指定された優先度値に基づいて新規TaskPriorityレコードを作成する"""
        priority_value = request.data.get('priority_value')
        
        try:
            priority_value = int(priority_value)
            if priority_value < 1 or priority_value > 100:
                return Response(
                    {"error": "優先度は1から100の間で指定してください"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (TypeError, ValueError):
            return Response(
                {"error": "有効な数値を指定してください"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 同じ優先度値のレコードがすでに存在するか確認
        existing = TaskPriority.objects.filter(
            business=request.user.business,
            priority_value=priority_value
        ).first()
        
        if existing:
            # 既存のレコードを返す
            serializer = self.get_serializer(existing)
            return Response(serializer.data)
        
        # 新しい優先度レコードを作成
        new_priority = TaskPriority.objects.create(
            business=request.user.business,
            name=str(priority_value),
            priority_value=priority_value,
            color='#3B82F6'  # デフォルト色
        )
        
        serializer = self.get_serializer(new_priority)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TaskCommentViewSet(viewsets.ModelViewSet):
    queryset = TaskComment.objects.all()
    serializer_class = TaskCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, OrderingFilter]
    search_fields = ['content']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return comments for tasks in the authenticated user's business."""
        queryset = TaskComment.objects.filter(task__business=self.request.user.business)
        
        # タスクIDでフィルタリング
        task_id = self.request.query_params.get('task', None)
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """コメント作成と通知処理"""
        # コメント作成
        comment = serializer.save(user=self.request.user)
        task = comment.task
        
        # ステータス変更通知の処理
        current_status = task.status
        if 'status_change' in comment.content.lower():
            # コメント内容にステータス変更の記述があれば通知
            TaskNotification.objects.create(
                user=task.assignee or task.creator,
                task=task,
                notification_type='status_change',
                content=f'{self.request.user.get_full_name()}さんがタスク「{task.title}」のステータスを変更しました。'
            )
        
        # コメント通知を作成
        # コメントした人以外のタスク関係者に通知
        recipients = set()
        
        # タスク作成者
        if task.creator and task.creator != self.request.user:
            recipients.add(task.creator)
            
        # 現在の担当者
        if task.assignee and task.assignee != self.request.user:
            recipients.add(task.assignee)
            
        # 作業者
        if task.worker and task.worker != self.request.user:
            recipients.add(task.worker)
            
        # レビュアー
        if task.reviewer and task.reviewer != self.request.user:
            recipients.add(task.reviewer)
            
        # それぞれに通知を作成
        for recipient in recipients:
            TaskNotification.objects.create(
                user=recipient,
                task=task,
                notification_type='comment',
                content=f'{self.request.user.get_full_name()}さんがタスク「{task.title}」にコメントしました。'
            )
        
        # コメント作成をWebSocketに通知
        try:
            import requests
            import json
            from django.conf import settings
            
            # FastAPIサーバーのエンドポイント
            # 環境変数から取得するか、settings.pyに設定しておくのが理想的だが、
            # 今回は直接指定する簡易実装
            websocket_url = "http://websocket:8001/api/notify_task_comment"
            
            # 通知データを作成
            notification_data = {
                "type": "comment",
                "task_id": task.id,
                "task_title": task.title,
                "comment_id": comment.id,
                "user_name": self.request.user.get_full_name() or self.request.user.username,
                "content": comment.content,
                "created_at": comment.created_at.isoformat()
            }
            
            # FastAPIサーバーに通知を送信
            requests.post(
                websocket_url,
                json=notification_data,
                timeout=2  # タイムアウト設定
            )
        except Exception as e:
            print(f"WebSocket通知の送信に失敗しました: {str(e)}")
        
        return comment
        
    def perform_destroy(self, instance):
        """コメント削除時の処理"""
        # 削除前にコメント情報を取得
        task = instance.task
        user = self.request.user
        
        # コメントを削除
        instance.delete()
        
        # 必要であれば削除通知を作成
        # 今回は削除通知はスキップ


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


class TaskNotificationViewSet(viewsets.ModelViewSet):
    queryset = TaskNotification.objects.all()
    serializer_class = TaskNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    ordering_fields = ['created_at', 'read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return notifications for the authenticated user."""
        return TaskNotification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """すべての通知を既読にする"""
        notifications = self.get_queryset().filter(read=False)
        count = notifications.count()
        notifications.update(read=True)
        return Response({'status': 'success', 'marked_count': count})
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """特定の通知を既読にする"""
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """未読通知の数を取得する"""
        count = self.get_queryset().filter(read=False).count()
        return Response({'unread_count': count})


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
