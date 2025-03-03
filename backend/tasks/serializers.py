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
    category_name = serializers.ReadOnlyField(source='category.name', default=None)
    status_name = serializers.ReadOnlyField(source='status.name', default=None)
    priority_name = serializers.ReadOnlyField(source='priority.name', default=None)
    creator_name = serializers.ReadOnlyField(source='creator.get_full_name', default=None)
    assignee_name = serializers.ReadOnlyField(source='assignee.get_full_name', default=None)
    approver_name = serializers.ReadOnlyField(source='approver.get_full_name', default=None)
    client_name = serializers.ReadOnlyField(source='client.name', default=None)
    fiscal_period = serializers.ReadOnlyField(source='fiscal_year.fiscal_period', default=None)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'business', 'workspace', 'status', 'status_name',
            'priority', 'priority_name', 'category', 'category_name', 'creator', 'creator_name',
            'assignee', 'assignee_name', 'approver', 'approver_name', 'created_at', 'updated_at',
            'due_date', 'start_date', 'completed_at', 'estimated_hours', 'client', 'client_name',
            'is_fiscal_task', 'fiscal_year', 'fiscal_period',  # 決算期関連フィールド追加
            'is_recurring', 'recurrence_pattern', 'recurrence_end_date', 'is_template', 'template_name'
        ]
        read_only_fields = ('business', 'creator', 'created_at', 'updated_at')

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