from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from tasks.models import TaskComment, TaskNotification
from .models import Channel, Message, ChannelMembership
import logging

# ロギング設定
logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=TaskComment)
def send_comment_to_task_channel(sender, instance, created, **kwargs):
    """
    タスクコメントが作成されたとき、taskチャンネルにメッセージを送信する
    """
    try:
        if created:
            logger.info(f"Processing new task comment: {instance.id} for task: {instance.task.title}")
            
            # ビジネスのデフォルトワークスペースを取得
            business = instance.task.business
            workspace = business.workspaces.first()
            
            if not workspace:
                logger.warning(f"No workspace found for business {business.name}")
                return
            
            # 共通のtaskチャンネルを取得（大文字小文字を区別せず）
            task_channel_common = Channel.objects.filter(
                workspace=workspace
            ).filter(name__iexact='task').first()
            
            if not task_channel_common:
                # taskチャンネルが存在しない場合は作成
                owner = User.objects.filter(business=business).first()
                if not owner:
                    logger.warning(f"No users found for business {business.name}")
                    return
                    
                logger.info(f"Creating task channel for workspace {workspace.name}")
                task_channel_common = Channel.objects.create(
                    name='task',
                    description='タスク関連の通知や議論のための共通チャンネルです',
                    workspace=workspace,
                    channel_type='public',
                    created_by=owner
                )
                
                # ビジネスの全ユーザーをチャンネルメンバーとして追加
                for user in User.objects.filter(business=business):
                    ChannelMembership.objects.get_or_create(
                        channel=task_channel_common,
                        user=user,
                        defaults={
                            'is_admin': user == owner
                        }
                    )
            
            # taskチャンネルにメッセージを送信
            task_title = instance.task.title
            user_name = instance.user.get_full_name() or instance.user.username
            
            task_message_content = f"💬 **タスクコメント**\n\n**タスク**: {task_title}\n**コメント者**: {user_name}\n\n{instance.content}"
            
            task_message = Message.objects.create(
                channel=task_channel_common,
                user=instance.user,
                content=task_message_content
            )
            logger.info(f"Comment sent to task channel")
                
    except Exception as e:
        logger.error(f"Error in send_comment_to_task_channel signal: {str(e)}")

@receiver(post_save, sender=TaskNotification)
def send_notification_to_task_channel(sender, instance, created, **kwargs):
    """
    タスク通知が作成されたとき、通知の種類に応じてtaskチャンネルにメッセージを送信する
    """
    try:
        if created and instance.notification_type in ['status_change', 'assignment']:
            logger.info(f"Processing task notification: {instance.id}, type: {instance.notification_type}")
            
            # ビジネスのデフォルトワークスペースを取得
            business = instance.task.business
            workspace = business.workspaces.first()
            
            if not workspace:
                logger.warning(f"No workspace found for business {business.name}")
                return
            
            # 共通のtaskチャンネルを取得（大文字小文字を区別せず）
            task_channel_common = Channel.objects.filter(
                workspace=workspace
            ).filter(name__iexact='task').first()
            
            if not task_channel_common:
                # taskチャンネルが存在しない場合は作成
                owner = User.objects.filter(business=business).first()
                if not owner:
                    logger.warning(f"No users found for business {business.name}")
                    return
                    
                logger.info(f"Creating task channel for workspace {workspace.name}")
                task_channel_common = Channel.objects.create(
                    name='task',
                    description='タスク関連の通知や議論のための共通チャンネルです',
                    workspace=workspace,
                    channel_type='public',
                    created_by=owner
                )
                
                # ビジネスの全ユーザーをチャンネルメンバーとして追加
                for user in User.objects.filter(business=business):
                    ChannelMembership.objects.get_or_create(
                        channel=task_channel_common,
                        user=user,
                        defaults={
                            'is_admin': user == owner
                        }
                    )
            
            # 共通のtaskチャンネルにメッセージを送信
            task_title = instance.task.title
            
            emoji = "🔄" if instance.notification_type == 'status_change' else "👤"
            notification_type = "ステータス変更" if instance.notification_type == 'status_change' else "担当者変更"
            task_message_content = f"{emoji} **タスク{notification_type}**\n\n**タスク**: {task_title}\n\n{instance.content}"
            
            # システムメッセージの送信者としてタスクの作業者またはタスクの作成者を使用
            sender_user = instance.task.worker or instance.task.creator
            if not sender_user:
                # タスクの担当者がいない場合はデフォルトユーザーを使用
                sender_user = User.objects.filter(business=business).first()
            
            task_message = Message.objects.create(
                channel=task_channel_common,
                user=sender_user,
                content=task_message_content
            )
            logger.info(f"Task notification sent to task channel")
    except Exception as e:
        logger.error(f"Error in send_notification_to_task_channel signal: {str(e)}")