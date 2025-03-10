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
        
        # 注: 「標準月次チェック」と「記帳代行作業」のデフォルトテンプレートは
        # 要件に基づき削除しました。テンプレートは setup_templates コマンドで作成されます。