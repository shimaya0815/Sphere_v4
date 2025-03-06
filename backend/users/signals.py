from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from chat.models import Channel, ChannelMembership
from business.models import Workspace

User = get_user_model()

@receiver(post_save, sender=User)
def create_task_channel(sender, instance, created, **kwargs):
    """
    新規ユーザー作成時にタスクチャンネルを自動作成する
    """
    if created and instance.business:
        # ビジネスのデフォルトワークスペースを取得
        workspace = instance.business.workspaces.first()
        if not workspace:
            return
        
        # タスクチャンネルが既に存在するか確認
        task_channel = Channel.objects.filter(
            workspace=workspace,
            name='タスク通知'
        ).first()
        
        # タスクチャンネルが存在しない場合は新規作成
        if not task_channel:
            task_channel = Channel.objects.create(
                name='タスク通知',
                description='タスクのコメントやステータス変更の通知を受け取るチャンネルです',
                workspace=workspace,
                channel_type='public',
                created_by=instance
            )
        
        # 新規ユーザーをチャンネルのメンバーとして追加
        ChannelMembership.objects.get_or_create(
            channel=task_channel,
            user=instance,
            defaults={
                'is_admin': instance == task_channel.created_by
            }
        )