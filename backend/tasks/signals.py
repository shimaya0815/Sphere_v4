from django.db.models.signals import post_save
from django.dispatch import receiver
from business.models import Business
from .models import TaskCategory, TaskStatus, TaskPriority, Task


@receiver(post_save, sender=Business)
def create_default_task_metadata(sender, instance, created, **kwargs):
    """
    ビジネスが作成された時にデフォルトのタスクメタデータを作成する
    """
    if created:
        # デフォルトのカテゴリー、ステータス、優先度を作成
        TaskCategory.create_defaults(instance)
        TaskStatus.create_defaults(instance)
        TaskPriority.create_defaults(instance)
        
        # デフォルトのテンプレートを作成
        default_status = TaskStatus.objects.filter(business=instance, name='未着手').first()
        default_priority = TaskPriority.objects.filter(business=instance, name='中').first()
        default_category = TaskCategory.objects.filter(business=instance, name='一般').first()
        
        # 月次チェックのテンプレート
        Task.objects.create(
            business=instance,
            workspace=instance.workspaces.first(),  # デフォルトワークスペース
            title='月次チェック',
            description='月次チェックのテンプレートです。クライアントごとに利用してください。',
            status=default_status,
            priority=default_priority,
            category=default_category,
            is_template=True,
            template_name='標準月次チェック',
            estimated_hours=2.0
        )
        
        # 記帳代行のテンプレート
        Task.objects.create(
            business=instance,
            workspace=instance.workspaces.first(),  # デフォルトワークスペース
            title='記帳代行',
            description='記帳代行のテンプレートです。月次で対応が必要なクライアントに設定してください。',
            status=default_status,
            priority=default_priority,
            category=TaskCategory.objects.filter(business=instance, name='記帳代行').first() or default_category,
            is_template=True,
            template_name='記帳代行作業',
            estimated_hours=3.0
        )