from rest_framework import serializers
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
    class Meta:
        model = TaskComment
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


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
    class Meta:
        model = TaskNotification
        fields = '__all__'
        read_only_fields = ('user', 'task', 'notification_type', 'content', 'created_at', 'read')


class TaskSerializer(serializers.ModelSerializer):
    # 基本フィールド - リレーションシップからの名前を取得するリードオンリーフィールド
    category_name = serializers.ReadOnlyField(source='category.name', default=None)
    status_name = serializers.ReadOnlyField(source='status.name', default=None)
    priority_name = serializers.ReadOnlyField(source='priority.name', default=None)
    creator_name = serializers.ReadOnlyField(source='creator.get_full_name', default=None)
    assignee_name = serializers.ReadOnlyField(source='assignee.get_full_name', default=None)
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
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'business', 'workspace', 
            'status', 'status_name', 'status_data',
            'priority', 'priority_name', 'priority_data',
            'category', 'category_name', 'category_data',
            'creator', 'creator_name', 'assignee', 'assignee_name', 
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
                'name': obj.priority.name,
                'color': obj.priority.color
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