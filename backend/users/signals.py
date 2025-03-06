from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from chat.models import Channel, ChannelMembership
from business.models import Workspace
import logging

# ロギング設定
logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=User)
def create_task_channel(sender, instance, created, **kwargs):
    """
    新規ユーザー作成時にタスクチャンネルを自動作成する
    """
    try:
        logger.info(f"User signal triggered for {instance.email}, created={created}")
        
        if created and instance.business:
            logger.info(f"Creating task channel for new user {instance.email}")
            
            # ビジネスのデフォルトワークスペースを取得
            workspace = instance.business.workspaces.first()
            if not workspace:
                logger.warning(f"No workspace found for business {instance.business.name}")
                return
            
            # タスクチャンネルが既に存在するか確認
            task_channel = Channel.objects.filter(
                workspace=workspace,
                name='タスク通知'
            ).first()
            
            # タスクチャンネルが存在しない場合は新規作成
            if not task_channel:
                logger.info(f"Creating new Task notification channel in workspace {workspace.name}")
                task_channel = Channel.objects.create(
                    name='タスク通知',
                    description='タスクのコメントやステータス変更の通知を受け取るチャンネルです',
                    workspace=workspace,
                    channel_type='public',
                    created_by=instance
                )
            
            # 新規ユーザーをチャンネルのメンバーとして追加
            membership, created = ChannelMembership.objects.get_or_create(
                channel=task_channel,
                user=instance,
                defaults={
                    'is_admin': instance == task_channel.created_by
                }
            )
            logger.info(f"User {instance.email} {'added to' if created else 'already in'} task channel")
            
    except Exception as e:
        logger.error(f"Error in create_task_channel signal: {str(e)}")