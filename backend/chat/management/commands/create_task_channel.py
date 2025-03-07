from django.core.management.base import BaseCommand
from chat.models import Channel, ChannelMembership
from business.models import Workspace
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'taskチャンネルを作成するコマンド'

    def handle(self, *args, **options):
        self.stdout.write('taskチャンネル作成処理を開始...')
        
        # ユーザーとワークスペースの取得
        user = User.objects.first()
        workspace = Workspace.objects.first()
        
        if not user:
            self.stdout.write(self.style.ERROR('ユーザーが見つかりません'))
            return
            
        if not workspace:
            self.stdout.write(self.style.ERROR('ワークスペースが見つかりません'))
            return
            
        # 現在のチャンネル一覧を表示
        existing_channels = Channel.objects.all()
        self.stdout.write(f'現在のチャンネル: {[c.name for c in existing_channels]}')
        
        # taskチャンネルの作成
        task_channel, created = Channel.objects.get_or_create(
            workspace=workspace,
            name='task',
            defaults={
                'description': 'タスク関連の通知や議論のための共通チャンネルです',
                'channel_type': 'public',
                'created_by': user,
                'is_direct_message': False
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'taskチャンネルを作成しました (ID: {task_channel.id})'))
            
            # ユーザーをメンバーに追加
            membership, membership_created = ChannelMembership.objects.get_or_create(
                channel=task_channel,
                user=user,
                defaults={
                    'is_admin': True
                }
            )
            
            if membership_created:
                self.stdout.write(f'ユーザーをチャンネルに追加しました: {user.email}')
            else:
                self.stdout.write(f'ユーザーは既にチャンネルのメンバーです: {user.email}')
        else:
            self.stdout.write(f'taskチャンネルは既に存在します (ID: {task_channel.id})')
            
        # 最終的なチャンネル一覧を表示
        final_channels = Channel.objects.all()
        self.stdout.write(f'最終的なチャンネル: {[c.name for c in final_channels]}')