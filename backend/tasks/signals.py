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
        
        # テンプレートは setup_templates コマンドで作成されるため、
        # ここでは基本的なタスクメタデータの作成のみを行う