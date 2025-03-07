from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Task, TaskCategory, TaskStatus, TaskPriority, TaskComment, TaskAttachment, TaskTimer, TaskHistory, TaskNotification


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = '__all__'


class TaskStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskStatus
        fields = '__all__'


class TaskPrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskPriority
        fields = '__all__'


class TaskAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = '__all__'


class TaskCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.get_full_name')
    mentioned_user_names = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskComment
        fields = ('id', 'task', 'user', 'user_name', 'content', 'created_at', 'updated_at', 'mentioned_users', 'mentioned_user_names')
        read_only_fields = ('user', 'created_at', 'updated_at', 'mentioned_users', 'mentioned_user_names')

    def get_mentioned_user_names(self, obj):
        """メンションされたユーザー名のリストを返す"""
        return [user.get_full_name() for user in obj.mentioned_users.all()]

    def create(self, validated_data):
        """メンション処理を含むコメント作成"""
        user = self.context['request'].user
        content = validated_data.get('content', '')
        
        # コメント作成
        comment = TaskComment.objects.create(
            task=validated_data['task'],
            user=user,
            content=content
        )
        
        # メンション処理
        self._process_mentions(comment, content)
        
        return comment
        
    def _process_mentions(self, comment, content):
        """コメント内のメンションを処理する"""
        # @ユーザー名 のパターン検出（スペースまたは句読点で区切られたもの）
        import re
        mention_pattern = r'@(\w+(?:\s+\w+)*)'
        mentions = re.findall(mention_pattern, content)
        
        User = get_user_model()
        business_id = comment.user.business_id
        
        for mention in mentions:
            # ユーザー名で検索（名前が一致するビジネス内のユーザーを検索）
            # first_name + last_name でマッチングを試みる
            mentioned_users = User.objects.filter(
                business_id=business_id
            ).filter(
                # 複数の名前パターンを試す
                Q(first_name__icontains=mention) | 
                Q(last_name__icontains=mention) |
                Q(username__icontains=mention)
            ).distinct()
            
            # マッチしたユーザーにメンション関連付けと通知作成
            for mentioned_user in mentioned_users:
                # 同じユーザーは除外
                if mentioned_user.id != comment.user.id:
                    comment.mentioned_users.add(mentioned_user)
                    
                    # 通知作成
                    TaskNotification.objects.create(
                        user=mentioned_user,
                        task=comment.task,
                        notification_type='mention',
                        content=f'{comment.user.get_full_name()}さんがタスク「{comment.task.title}」のコメントであなたをメンションしました。'
                    )


class TaskTimerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTimer
        fields = '__all__'
        read_only_fields = ('user', 'start_time', 'end_time', 'duration')


class TaskHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskHistory
        fields = '__all__'
        read_only_fields = ('task', 'user', 'timestamp', 'field_name', 'old_value', 'new_value')


class TaskNotificationSerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='task.title')
    user_name = serializers.ReadOnlyField(source='user.get_full_name')
    
    class Meta:
        model = TaskNotification
        fields = ('id', 'user', 'user_name', 'task', 'task_title', 'notification_type', 'content', 'created_at', 'read')
        read_only_fields = ('user', 'task', 'notification_type', 'content', 'created_at')


class TaskSerializer(serializers.ModelSerializer):
    # 基本フィールド - リレーションシップからの名前を取得するリードオンリーフィールド
    category_name = serializers.ReadOnlyField(source='category.name', default=None)
    status_name = serializers.ReadOnlyField(source='status.name', default=None)
    priority_name = serializers.ReadOnlyField(source='priority.name', default=None)
    creator_name = serializers.ReadOnlyField(source='creator.get_full_name', default=None)
    assignee_name = serializers.ReadOnlyField(source='assignee.get_full_name', default=None)
    worker_name = serializers.ReadOnlyField(source='worker.get_full_name', default=None)
    reviewer_name = serializers.ReadOnlyField(source='reviewer.get_full_name', default=None)
    approver_name = serializers.ReadOnlyField(source='approver.get_full_name', default=None)
    client_name = serializers.ReadOnlyField(source='client.name', default=None)
    fiscal_period = serializers.ReadOnlyField(source='fiscal_year.fiscal_period', default=None)
    
    # 一貫した形式でフロントエンドに送信するための拡張フィールド
    # これにより、フロントエンドがリレーション処理を簡素化できる
    status_data = serializers.SerializerMethodField()
    priority_data = serializers.SerializerMethodField()
    category_data = serializers.SerializerMethodField()
    client_data = serializers.SerializerMethodField()
    fiscal_year_data = serializers.SerializerMethodField()
    worker_data = serializers.SerializerMethodField()
    reviewer_data = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'business', 'workspace', 
            'status', 'status_name', 'status_data',
            'priority', 'priority_name', 'priority_data',
            'category', 'category_name', 'category_data',
            'creator', 'creator_name', 'assignee', 'assignee_name', 
            'worker', 'worker_name', 'worker_data',
            'reviewer', 'reviewer_name', 'reviewer_data',
            'approver', 'approver_name', 'created_at', 'updated_at',
            'due_date', 'start_date', 'completed_at', 'estimated_hours', 
            'client', 'client_name', 'client_data',
            'is_fiscal_task', 'fiscal_year', 'fiscal_year_data', 'fiscal_period',  
            'is_recurring', 'recurrence_pattern', 'recurrence_end_date', 
            'is_template', 'template_name'
        ]
        read_only_fields = ('business', 'creator', 'created_at', 'updated_at')
    
    def get_status_data(self, obj):
        """ステータス情報を一貫した形式で返す"""
        if obj.status:
            return {
                'id': obj.status.id,
                'name': obj.status.name,
                'color': obj.status.color
            }
        return None
    
    def get_priority_data(self, obj):
        """優先度情報を一貫した形式で返す"""
        if obj.priority:
            return {
                'id': obj.priority.id,
                'name': str(obj.priority.priority_value),  # name フィールドは priority_value の文字列として扱う
                'color': obj.priority.color,
                'priority_value': obj.priority.priority_value
            }
        return None
    
    def get_category_data(self, obj):
        """カテゴリ情報を一貫した形式で返す"""
        if obj.category:
            return {
                'id': obj.category.id,
                'name': obj.category.name,
                'color': obj.category.color
            }
        return None
    
    def get_client_data(self, obj):
        """クライアント情報を一貫した形式で返す"""
        if obj.client:
            return {
                'id': obj.client.id,
                'name': obj.client.name,
                'client_code': obj.client.client_code
            }
        return None
    
    def get_fiscal_year_data(self, obj):
        """決算期情報を一貫した形式で返す"""
        if obj.fiscal_year:
            return {
                'id': obj.fiscal_year.id,
                'fiscal_period': obj.fiscal_year.fiscal_period,
                'start_date': obj.fiscal_year.start_date,
                'end_date': obj.fiscal_year.end_date
            }
        return None
        
    def get_worker_data(self, obj):
        """作業者情報を一貫した形式で返す"""
        if obj.worker:
            return {
                'id': obj.worker.id,
                'name': obj.worker.get_full_name() or obj.worker.username,
                'email': obj.worker.email
            }
        return None
        
    def get_reviewer_data(self, obj):
        """レビュアー情報を一貫した形式で返す"""
        if obj.reviewer:
            return {
                'id': obj.reviewer.id,
                'name': obj.reviewer.get_full_name() or obj.reviewer.username,
                'email': obj.reviewer.email
            }
        return None

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['business'] = user.business
        validated_data['creator'] = user
        
        # If no workspace is provided, use the default workspace
        if 'workspace' not in validated_data and user.business:
            default_workspace = user.business.workspaces.first()
            if default_workspace:
                validated_data['workspace'] = default_workspace
        
        return super().create(validated_data)