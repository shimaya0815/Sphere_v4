from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
from tasks.models import TaskComment, TaskNotification
from .models import Channel, Message

User = get_user_model()

@receiver(post_save, sender=TaskComment)
def send_comment_to_task_channel(sender, instance, created, **kwargs):
    """
    タスクコメントが作成されたとき、タスク通知チャンネルにメッセージを送信する
    """
    if created:
        # ビジネスのデフォルトワークスペースを取得
        business = instance.task.business
        workspace = business.workspaces.first()
        
        if not workspace:
            return
        
        # タスク通知チャンネルを取得
        task_channel = Channel.objects.filter(
            workspace=workspace,
            name='タスク通知'
        ).first()
        
        if not task_channel:
            # チャンネルが存在しない場合は作成
            owner = User.objects.filter(business=business).first()
            if not owner:
                return
                
            task_channel = Channel.objects.create(
                name='タスク通知',
                description='タスクのコメントやステータス変更の通知を受け取るチャンネルです',
                workspace=workspace,
                channel_type='public',
                created_by=owner
            )
        
        # チャンネルにメッセージを送信
        task_title = instance.task.title
        user_name = instance.user.get_full_name() or instance.user.username
        
        message_content = f"🔔 **タスクコメント通知**\n\n**タスク**: {task_title}\n**コメント者**: {user_name}\n\n{instance.content}"
        
        Message.objects.create(
            channel=task_channel,
            user=instance.user,
            content=message_content
        )

@receiver(post_save, sender=TaskNotification)
def send_notification_to_task_channel(sender, instance, created, **kwargs):
    """
    タスク通知が作成されたとき、通知の種類に応じてタスク通知チャンネルにメッセージを送信する
    """
    if created and instance.notification_type in ['status_change', 'assignment']:
        # ビジネスのデフォルトワークスペースを取得
        business = instance.task.business
        workspace = business.workspaces.first()
        
        if not workspace:
            return
        
        # タスク通知チャンネルを取得
        task_channel = Channel.objects.filter(
            workspace=workspace,
            name='タスク通知'
        ).first()
        
        if not task_channel:
            return
        
        # チャンネルにメッセージを送信
        task_title = instance.task.title
        
        emoji = "🔄" if instance.notification_type == 'status_change' else "👤"
        message_content = f"{emoji} **タスク通知**\n\n**タスク**: {task_title}\n\n{instance.content}"
        
        # システムメッセージの送信者としてタスクの作業者またはタスクの作成者を使用
        sender_user = instance.task.worker or instance.task.creator
        if not sender_user:
            # タスクの担当者がいない場合はデフォルトユーザーを使用
            sender_user = User.objects.filter(business=business).first()
        
        Message.objects.create(
            channel=task_channel,
            user=sender_user,
            content=message_content
        )