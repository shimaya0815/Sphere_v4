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
def create_default_channels(sender, instance, created, **kwargs):
    """
    新規ユーザー作成時にデフォルトチャンネルを自動作成する
    1. タスク通知チャンネル
    2. task チャンネル
    3. general チャンネル
    4. random チャンネル
    """
    try:
        logger.info(f"User signal triggered for {instance.email}, created={created}")
        
        if created and instance.business:
            logger.info(f"Creating default channels for new user {instance.email}")
            
            # ビジネスのデフォルトワークスペースを取得
            workspace = instance.business.workspaces.first()
            if not workspace:
                logger.warning(f"No workspace found for business {instance.business.name}")
                return
            
            # 1. タスク通知チャンネルの作成・参加
            task_channel = Channel.objects.filter(
                workspace=workspace,
                name='タスク通知'
            ).first()
            
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
            membership1, created1 = ChannelMembership.objects.get_or_create(
                channel=task_channel,
                user=instance,
                defaults={
                    'is_admin': instance == task_channel.created_by
                }
            )
            logger.info(f"User {instance.email} {'added to' if created1 else 'already in'} task notification channel")
            
            # 2. taskチャンネル（明示的に検索とロギング）
            logger.info(f"Searching for task channel in workspace {workspace.name}")
            try:
                # まず正確な名前で検索
                task_common_channel = Channel.objects.filter(
                    workspace=workspace, 
                    name='task'
                ).first()
                
                if task_common_channel:
                    logger.info(f"Found task channel with exact name: {task_common_channel.id}")
                else:
                    # 次に大文字小文字を区別せずに検索（念のため）
                    task_common_channel = Channel.objects.filter(
                        workspace=workspace
                    ).filter(name__iexact='task').first()
                    
                    if task_common_channel:
                        logger.info(f"Found task channel with case-insensitive search: {task_common_channel.id}")
                    else:
                        logger.info("No task channel found, creating new one")
            except Exception as e:
                logger.error(f"Error searching for task channel: {str(e)}")
                task_common_channel = None
            
            if not task_common_channel:
                logger.info(f"Creating task channel in workspace {workspace.name}")
                try:
                    # まずDjangoのORMを使って試してみる
                    task_common_channel = Channel.objects.create(
                        name='task',
                        description='タスク関連の通知や議論のための共通チャンネルです',
                        workspace=workspace,
                        channel_type='public',
                        created_by=instance
                    )
                    logger.info(f"Successfully created task channel with ORM, ID: {task_common_channel.id}")
                except Exception as orm_error:
                    logger.error(f"Error creating task channel via ORM: {str(orm_error)}")
                    
                    # ORMが失敗した場合、SQL直接実行を試みる
                    try:
                        from django.db import connection
                        
                        # DBトランザクションを開始
                        with connection.cursor() as cursor:
                            # Channel作成のSQLを直接実行
                            cursor.execute(
                                """
                                INSERT INTO chat_channel 
                                (name, description, workspace_id, channel_type, created_by_id, created_at, updated_at, is_direct_message) 
                                VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), false)
                                RETURNING id
                                """,
                                ['task', 'タスク関連の通知や議論のための共通チャンネルです', workspace.id, 'public', instance.id]
                            )
                            channel_id = cursor.fetchone()[0]
                            
                            # メンバーシップの作成
                            cursor.execute(
                                """
                                INSERT INTO chat_channelmembership
                                (channel_id, user_id, is_admin, muted, joined_at, last_read_at)
                                VALUES (%s, %s, true, false, NOW(), NOW())
                                """,
                                [channel_id, instance.id]
                            )
                        
                        # 作成されたチャンネルを取得
                        task_common_channel = Channel.objects.get(id=channel_id)
                        logger.info(f"Successfully created task channel via SQL, ID: {task_common_channel.id}")
                    except Exception as sql_error:
                        logger.error(f"Error creating task channel via SQL: {str(sql_error)}")
                        # どちらの方法も失敗した場合は、続行できないので終了
                        return
            
            # 新規ユーザーをチャンネルのメンバーとして追加
            if task_common_channel:
                try:
                    membership2, created2 = ChannelMembership.objects.get_or_create(
                        channel=task_common_channel,
                        user=instance,
                        defaults={
                            'is_admin': instance == task_common_channel.created_by
                        }
                    )
                    logger.info(f"User {instance.email} {'added to' if created2 else 'already in'} task channel")
                except Exception as e:
                    logger.error(f"Error adding user to task channel: {str(e)}")
            else:
                logger.error("Cannot add user to task channel because channel creation failed")
            
            # 3. general チャンネル
            general_channel = Channel.objects.filter(
                workspace=workspace,
                name='general'
            ).first()
            
            if not general_channel:
                logger.info(f"Creating general channel in workspace {workspace.name}")
                general_channel = Channel.objects.create(
                    name='general',
                    description='全般的な会話のためのチャンネルです',
                    workspace=workspace,
                    channel_type='public',
                    created_by=instance
                )
            
            # 新規ユーザーをチャンネルのメンバーとして追加
            membership3, created3 = ChannelMembership.objects.get_or_create(
                channel=general_channel,
                user=instance,
                defaults={
                    'is_admin': instance == general_channel.created_by
                }
            )
            logger.info(f"User {instance.email} {'added to' if created3 else 'already in'} general channel")
            
            # 4. random チャンネル
            random_channel = Channel.objects.filter(
                workspace=workspace,
                name='random'
            ).first()
            
            if not random_channel:
                logger.info(f"Creating random channel in workspace {workspace.name}")
                random_channel = Channel.objects.create(
                    name='random',
                    description='雑談のためのチャンネルです',
                    workspace=workspace,
                    channel_type='public',
                    created_by=instance
                )
            
            # 新規ユーザーをチャンネルのメンバーとして追加
            membership4, created4 = ChannelMembership.objects.get_or_create(
                channel=random_channel,
                user=instance,
                defaults={
                    'is_admin': instance == random_channel.created_by
                }
            )
            logger.info(f"User {instance.email} {'added to' if created4 else 'already in'} random channel")
            
            # ウェルカムメッセージの送信
            from chat.models import Message
            
            # generalチャンネルにウェルカムメッセージを送信
            Message.objects.create(
                channel=general_channel,
                user=instance,
                content=f"👋 {instance.get_full_name() or instance.email}さん、Sphereへようこそ！"
            )
            
            # taskチャンネルにもウェルカムメッセージを送信
            Message.objects.create(
                channel=task_common_channel,
                user=instance,
                content=f"🔔 このチャンネルではタスクの通知やタスクに関する議論を行います。{instance.get_full_name() or instance.email}さん、タスク管理をお楽しみください！"
            )
            
    except Exception as e:
        logger.error(f"Error in create_default_channels signal: {str(e)}")