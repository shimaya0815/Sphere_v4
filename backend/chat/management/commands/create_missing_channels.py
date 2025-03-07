from django.core.management.base import BaseCommand
from chat.models import Channel, ChannelMembership
from business.models import Workspace
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = '必須のチャンネルを作成するコマンド'

    def handle(self, *args, **options):
        self.stdout.write('必須チャンネル作成処理を開始...')
        
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
        
        # 作成するチャンネル定義
        channels_to_create = [
            ('task', 'タスク関連の通知や議論のための共通チャンネルです'),
            ('general', '一般的な会話用チャンネルです')
        ]
        
        created_channels = []
        
        # チャンネル作成
        for channel_name, description in channels_to_create:
            # 既存チャンネル検索（大文字小文字を区別しない）
            existing_channel = Channel.objects.filter(
                workspace=workspace,
                name__iexact=channel_name
            ).first()
            
            if existing_channel:
                self.stdout.write(f'チャンネル {channel_name} は既に存在します (ID: {existing_channel.id})')
                channel = existing_channel
            else:
                # 新規作成
                channel = Channel.objects.create(
                    workspace=workspace,
                    name=channel_name,
                    description=description,
                    channel_type='public',
                    created_by=user,
                    is_direct_message=False
                )
                self.stdout.write(self.style.SUCCESS(f'チャンネル {channel_name} を作成しました (ID: {channel.id})'))
                created_channels.append(channel)
            
            # 全ユーザーをチャンネルに追加
            for system_user in User.objects.all():
                membership, created = ChannelMembership.objects.get_or_create(
                    channel=channel,
                    user=system_user,
                    defaults={
                        'is_admin': system_user == user,  # 最初のユーザーを管理者に
                    }
                )
                
                if created:
                    self.stdout.write(f'ユーザー {system_user.email} をチャンネル {channel_name} に追加しました')
        
        # 最終的なチャンネル一覧を表示
        final_channels = Channel.objects.all()
        self.stdout.write(f'最終的なチャンネル: {[c.name for c in final_channels]}')