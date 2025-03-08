from django.core.management.base import BaseCommand
from chat.models import Channel, ChannelMembership
from business.models import Workspace
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'タスクチャンネルの管理 - タスク通知チャンネルを削除し、taskチャンネルがない場合は作成する'

    def handle(self, *args, **options):
        self.stdout.write('タスクチャンネル管理処理を開始...')
        
        # 全ワークスペースを取得
        workspaces = Workspace.objects.all()
        self.stdout.write(f'ワークスペース数: {workspaces.count()}')
        
        for workspace in workspaces:
            self.stdout.write(f'ワークスペース {workspace.name} (ID: {workspace.id}) を処理中...')
            
            # ワークスペース内のチャンネルを確認
            existing_channels = Channel.objects.filter(workspace=workspace)
            self.stdout.write(f'既存チャンネル: {[c.name for c in existing_channels]}')
            
            # 「タスク通知」チャンネルを削除
            task_notification_channel = existing_channels.filter(name='タスク通知').first()
            if task_notification_channel:
                self.stdout.write(f'「タスク通知」チャンネルを削除します (ID: {task_notification_channel.id})')
                try:
                    # メッセージも一緒に削除されるようにCASCADEがモデルで設定されていることを前提としています
                    task_notification_channel.delete()
                    self.stdout.write(self.style.SUCCESS('「タスク通知」チャンネルを削除しました'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'「タスク通知」チャンネル削除中にエラーが発生しました: {str(e)}'))
            
            # taskチャンネルが存在するか確認
            task_channel = existing_channels.filter(name__iexact='task').first()
            
            if not task_channel:
                self.stdout.write(f'ワークスペース {workspace.id} にtaskチャンネルが見つかりませんでした。作成します。')
                
                # ビジネスオーナーを取得
                owner = workspace.business.owner
                
                if not owner:
                    # オーナーが存在しない場合は、ビジネスに関連するユーザーの中から最初のユーザーを使用
                    owner = User.objects.filter(business=workspace.business).first()
                
                if owner:
                    try:
                        # taskチャンネル作成
                        task_channel = Channel.objects.create(
                            workspace=workspace,
                            name='task',
                            description='タスク関連の通知や議論のための共通チャンネルです',
                            channel_type='public',
                            created_by=owner,
                            is_direct_message=False
                        )
                        
                        # オーナーをメンバーに追加
                        ChannelMembership.objects.create(
                            channel=task_channel,
                            user=owner,
                            is_admin=True
                        )
                        
                        self.stdout.write(self.style.SUCCESS(f'taskチャンネルを作成しました (ID: {task_channel.id})'))
                        
                        # ビジネスの全ユーザーをチャンネルのメンバーに追加
                        users = User.objects.filter(business=workspace.business)
                        for user in users:
                            if user != owner:  # オーナーは既に追加済み
                                ChannelMembership.objects.get_or_create(
                                    channel=task_channel,
                                    user=user,
                                    defaults={'is_admin': False}
                                )
                        
                        self.stdout.write(f'{users.count()} 人のユーザーをチャンネルに追加しました')
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'taskチャンネル作成中にエラーが発生しました: {str(e)}'))
                else:
                    self.stdout.write(self.style.WARNING(f'ワークスペース {workspace.id} のビジネスにユーザーが見つかりません'))
            else:
                self.stdout.write(f'taskチャンネルはすでに存在します (ID: {task_channel.id})')
        
        self.stdout.write(self.style.SUCCESS('タスクチャンネル管理処理が完了しました'))