from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import (
    Task, TaskCategory, TaskStatus, TaskComment, 
    TaskAttachment, TaskTimer, TaskHistory, TaskNotification,
    TaskSchedule, TemplateChildTask
)
from .serializers import (
    TaskSerializer, TaskCategorySerializer, TaskStatusSerializer, 
    TaskCommentSerializer, TaskAttachmentSerializer, 
    TaskTimerSerializer, TaskHistorySerializer, TaskNotificationSerializer,
    TaskTemplateSerializer, TaskScheduleSerializer, TemplateChildTaskSerializer
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
    ordering_fields = ['created_at', 'due_date', 'start_date', 'completed_at', 'updated_at']
    ordering = ['-created_at']
    
    def update(self, request, *args, **kwargs):
        """Custom update method to handle task updates properly"""
        print(f"⭐ TASK UPDATE CALLED WITH: {request.data}")
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Extract and save the old status for history tracking
        old_status = instance.status
        old_status_id = old_status.id if old_status else None
        new_status_id = request.data.get('status')
        
        # Convert status ID to integer if it's a string
        if new_status_id and isinstance(new_status_id, str) and new_status_id.isdigit():
            new_status_id = int(new_status_id)
            
        print(f"⭐ Old status: {old_status_id}, New status: {new_status_id}")
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_update(serializer)
            
            # Get the updated instance for returning the complete data
            updated_instance = self.get_object()
            print(f"⭐ Updated task status: {updated_instance.status.id if updated_instance.status else None}")
            
            # チェック: タスクが完了ステータスに変更された場合、かつcompleted_atがまだ設定されていない場合
            if updated_instance.status and updated_instance.status.name == '完了' and not updated_instance.completed_at:
                # 完了日時を設定
                print(f"⭐ Setting completed_at for task {updated_instance.id}")
                updated_instance.completed_at = timezone.now()
                updated_instance.save(update_fields=['completed_at'])
                
                # 繰り返しタスクの場合、次のタスクインスタンスを生成
                if updated_instance.is_recurring and updated_instance.recurrence_pattern:
                    next_task = updated_instance.generate_next_instance()
                    if next_task:
                        print(f"⭐ Generated next recurring task: {next_task.id}")
            
            # Create a serialized response with the fully updated task
            response_serializer = self.get_serializer(updated_instance)
            return Response(response_serializer.data)
            
        except Exception as e:
            print(f"⭐ Error updating task: {e}")
            return Response(
                {"detail": f"タスクの更新に失敗しました: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
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
            
            # ステータスの処理 - 文字列からIDへの変換
            if 'status' in data_dict:
                status_value = data_dict['status']
                if status_value and isinstance(status_value, str) and not status_value.isdigit():
                    # 文字列ステータスからIDへの変換を試みる
                    from tasks.models import TaskStatus
                    
                    # フロントエンドからのコード名をマッピング
                    status_code_map = {
                        'todo': '未着手',
                        'in_progress': '作業中',
                        'review': 'レビュー中',
                        'complete': '完了'
                    }
                    
                    # マッピングにある場合は変換、なければそのまま検索
                    status_name = status_code_map.get(status_value, status_value)
                    
                    # 名前の部分一致で検索
                    status_obj = TaskStatus.objects.filter(
                        business=request.user.business, 
                        name__icontains=status_name
                    ).first()
                    
                    if status_obj:
                        data_dict['status'] = status_obj.id
                        print(f"VIEW: ステータス文字列 '{status_value}' をID {status_obj.id} ({status_obj.name}) に変換しました")
                    else:
                        # ステータスが見つからない場合は削除して、未着手ステータスが自動設定されるようにする
                        print(f"VIEW: ステータス '{status_value}' が見つかりません。削除してデフォルト設定に任せます")
                        data_dict.pop('status')
            
            # 優先度の処理 - 文字列からの変換
            if 'priority' in data_dict:
                # 優先度は単なる参照用文字列なので削除して、priority_valueだけを使う
                priority_value = data_dict.pop('priority')
                print(f"VIEW: 優先度文字列 '{priority_value}' を削除し、priority_value のみを使用します")
                
                # priority_valueが未設定で、優先度文字列がある場合はデフォルト値を設定
                if (not data_dict.get('priority_value') or data_dict.get('priority_value') == '') and priority_value:
                    # 優先度文字列からデフォルト値を割り当て
                    priority_map = {
                        'high': 25,
                        'medium': 50,
                        'low': 75
                    }
                    data_dict['priority_value'] = priority_map.get(priority_value, 50)
                    print(f"VIEW: 優先度値を '{priority_value}' から {data_dict['priority_value']} に設定しました")
            
            # statusがnullまたは未指定の場合に未着手ステータスを設定
            if 'status' not in data_dict or data_dict.get('status') is None:
                from tasks.models import TaskStatus
                default_status = TaskStatus.objects.filter(business=request.user.business, name='未着手').first()
                if default_status:
                    data_dict['status'] = default_status.id
                    print(f"VIEW: デフォルトステータス「未着手」を設定: {default_status.id}")
            
            print("DATA DICT:", data_dict)
            
            # シリアライザでデータをバリデーション
            serializer = self.get_serializer(data=data_dict)
            
            if not serializer.is_valid():
                print("VALIDATION ERRORS:", serializer.errors)
                # エラーの詳細情報を追加
                error_detail = {}
                for field, errors in serializer.errors.items():
                    error_detail[field] = [str(error) for error in errors]
                    print(f"Field '{field}' errors: {errors}")
                
                # ステータスフィールドにエラーがある場合、利用可能なステータス一覧を表示
                if 'status' in serializer.errors:
                    from tasks.models import TaskStatus
                    statuses = TaskStatus.objects.filter(business=request.user.business)
                    status_info = [{'id': s.id, 'name': s.name} for s in statuses]
                    error_detail['available_statuses'] = status_info
                    print(f"Available statuses: {status_info}")
                
                return Response(
                    {
                        "detail": "Validation error",
                        "errors": serializer.errors,
                        "error_detail": error_detail,
                        "received_data": data_dict
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
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
                {
                    "detail": f"Error creating task: {str(e)}",
                    "error_type": str(type(e)),
                    "request_data": dict(request.data.items()) if hasattr(request.data, 'items') else str(request.data)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        task = self.get_object()
        print(f"[DEBUG] mark_complete called for task {task.id} ({task.title})")
        print(f"[DEBUG] Before mark_complete - recurring: {task.is_recurring}, pattern: {task.recurrence_pattern}, completed_at: {task.completed_at}")
        
        task.mark_complete(user=request.user)
        print(f"[DEBUG] After mark_complete - completed_at now set to: {task.completed_at}")
        
        # 繰り返しタスクの場合、次のタスクインスタンスを生成
        if task.is_recurring and task.recurrence_pattern:
            print(f"[DEBUG] Task {task.id} is recurring with pattern {task.recurrence_pattern}, monthday={task.monthday}")
            next_task = task.generate_next_instance()
            if next_task:
                print(f"[DEBUG] 繰り返しタスクの次のインスタンスを生成しました: ID={next_task.id}, due_date={next_task.due_date}")
            else:
                print(f"[DEBUG] 次のタスクインスタンスを生成できませんでした")
        else:
            print(f"[DEBUG] Task {task.id} is not recurring or has no pattern - recurring: {task.is_recurring}, pattern: {task.recurrence_pattern}")
        
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
            if (new_status.name == '完了' or 
                new_status.name == '承認完了（クローズ）' or 
                new_status.name == 'クローズ') and not task.completed_at:
                task.completed_at = timezone.now()
                task.save(user=request.user)
                print(f"[DEBUG] Task {task.id} marked as completed via status change - set completed_at to {task.completed_at}")
                
                # 繰り返しタスクの場合、次のタスクインスタンスを生成
                if task.is_recurring and task.recurrence_pattern:
                    print(f"[DEBUG] Task {task.id} is recurring with pattern {task.recurrence_pattern}, monthday={task.monthday}")
                    next_task = task.generate_next_instance()
                    if next_task:
                        print(f"[DEBUG] 繰り返しタスクの次のインスタンスを生成しました: ID={next_task.id}, due_date={next_task.due_date}")
                    else:
                        print(f"[DEBUG] 次のタスクインスタンスを生成できませんでした")
                else:
                    print(f"[DEBUG] Task {task.id} is not recurring or has no pattern - recurring: {task.is_recurring}, pattern: {task.recurrence_pattern}")
            
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
    
    @action(detail=True, methods=['post'], url_path='create-next-recurring')
    def create_next_recurring(self, request, pk=None):
        """
        完了したタスクの次の繰り返しインスタンスを生成するエンドポイント
        """
        task = self.get_object()
        print(f"[DEBUG] create_next_recurring called for task {task.id} ({task.title})")
        print(f"[DEBUG] Task details: is_recurring={task.is_recurring}, recurrence_pattern={task.recurrence_pattern}, completed_at={task.completed_at}")
        print(f"[DEBUG] Monthly settings: monthday={task.monthday}, business_day={task.business_day}")
        print(f"[DEBUG] Monthly details: monthday_type={type(task.monthday)}, business_day_type={type(task.business_day)}")
        
        if task.recurrence_pattern == 'monthly':
            if task.business_day is not None and task.business_day > 0:
                print(f"[DEBUG] 月次営業日指定が有効です: {task.business_day}営業日目")
            elif task.monthday is not None and task.monthday > 0:
                print(f"[DEBUG] 月次日付指定が有効です: {task.monthday}日")
            else:
                print(f"[DEBUG] 月次設定が不完全です: monthday={task.monthday}, business_day={task.business_day}")
        
        # タスクが繰り返し設定を持っているか確認
        if not task.is_recurring or not task.recurrence_pattern:
            print(f"[DEBUG] Task {task.id} does not have recurring settings: is_recurring={task.is_recurring}, recurrence_pattern={task.recurrence_pattern}")
            return Response(
                {"detail": "このタスクは繰り返し設定がありません"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # タスクが完了しているか確認
        if not task.completed_at:
            print(f"[DEBUG] Task {task.id} is not completed (completed_at is None)")
            return Response(
                {"detail": "タスクが完了していません。完了したタスクのみ次のインスタンスを生成できます"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 次のインスタンスを生成
        print(f"[DEBUG] Generating next instance for task {task.id}")
        next_task = task.generate_next_instance()
        
        if not next_task:
            print(f"[DEBUG] Failed to generate next instance for task {task.id}")
            return Response(
                {"detail": "次のタスクを生成できませんでした。繰り返し終了日を過ぎている可能性があります"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"[DEBUG] Successfully generated next instance: task_id={next_task.id}, due_date={next_task.due_date}")
        
        # 生成したタスクのデータを返す
        serializer = self.get_serializer(next_task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='calculate-next-dates')
    def calculate_next_dates(self, request, pk=None):
        """
        タスクの次回の日付を計算するエンドポイント
        """
        task = self.get_object()
        
        # タスクが繰り返し設定を持っているか確認
        if not task.is_recurring or not task.recurrence_pattern:
            return Response(
                {"detail": "このタスクは繰り返し設定がありません"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 次回の日付を計算
        next_dates = {
            "current_due_date": task.due_date,
            "current_start_date": task.start_date,
        }
        
        if task.due_date:
            next_dates["next_due_date"] = task._calculate_next_date(task.due_date)
        
        if task.start_date:
            next_dates["next_start_date"] = task._calculate_next_date(task.start_date)
        
        return Response(next_dates)


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
        
        # メンションされたユーザーを追加
        if comment.mentioned_users.exists():
            for mentioned_user in comment.mentioned_users.all():
                if mentioned_user != self.request.user:
                    recipients.add(mentioned_user)
        
        # それぞれに通知を作成
        for recipient in recipients:
            # 通知タイプとメッセージを判断
            notification_type = 'comment'
            content = f'{self.request.user.get_full_name()}さんがタスク「{task.title}」にコメントしました。'
            
            # メンションされたユーザーには特別な通知を作成
            if comment.mentioned_users.filter(id=recipient.id).exists():
                notification_type = 'mention'
                content = f'{self.request.user.get_full_name()}さんがタスク「{task.title}」のコメントであなたをメンションしました。'
            
            TaskNotification.objects.create(
                user=recipient,
                task=task,
                notification_type=notification_type,
                content=content
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
                "created_at": comment.created_at.isoformat(),
                "mentioned_user_ids": [user.id for user in comment.mentioned_users.all()]
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
    serializer_class = TaskTemplateSerializer
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
        
        # テンプレートから新しいタスクを生成
        new_task = template.generate_task_from_template(
            user=request.user,
            client_id=request.data.get('client_id'),
            fiscal_year_id=request.data.get('fiscal_year_id'),
            workspace_id=request.data.get('workspace_id'),
            title=request.data.get('title', template.title)
        )
        
        serializer = TaskSerializer(new_task)
        return Response(serializer.data)
        
    @action(detail=True, methods=['get'], url_path='tasks')
    def get_child_tasks(self, request, pk=None):
        """
        テンプレートに関連付けられた内包タスクを取得する
        """
        template = self.get_object()
        child_tasks = TemplateChildTask.objects.filter(parent_template=template)
        serializer = TemplateChildTaskSerializer(child_tasks, many=True)
        return Response(serializer.data)


class TaskPriorityViewSet(viewsets.ViewSet):
    """タスク優先度値の範囲情報を提供するAPI"""
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """
        優先度の値範囲情報を返す（数値が小さいほど優先度が高い）
        """
        priority_info = {
            'min_value': 1,
            'max_value': 100,
            'description': '数値が小さいほど優先度が高い（1〜100）'
        }
        return Response(priority_info)


class TaskScheduleViewSet(viewsets.ModelViewSet):
    """タスクスケジュール管理API"""
    
    queryset = TaskSchedule.objects.all()
    serializer_class = TaskScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return schedules for the authenticated user's business."""
        return TaskSchedule.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class TemplateChildTaskViewSet(viewsets.ModelViewSet):
    """テンプレート内包タスク管理API"""
    
    queryset = TemplateChildTask.objects.all()
    serializer_class = TemplateChildTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameBusiness]
    
    def get_queryset(self):
        """Return template child tasks for the authenticated user's business."""
        return TemplateChildTask.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)
    
    @action(detail=False, methods=['get'], url_path='template/(?P<template_id>\d+)')
    def get_by_template(self, request, template_id=None):
        """
        指定されたテンプレートIDに関連付けられた内包タスクを取得する
        """
        try:
            template = Task.objects.get(
                id=template_id, 
                is_template=True,
                business=request.user.business
            )
        except Task.DoesNotExist:
            return Response(
                {"detail": "Template not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        child_tasks = self.get_queryset().filter(parent_template=template)
        serializer = self.get_serializer(child_tasks, many=True)
        return Response(serializer.data)
