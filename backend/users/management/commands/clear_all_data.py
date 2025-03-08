from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from business.models import Business, Workspace
from chat.models import Channel, Message
from clients.models import Client
from tasks.models import Task, TaskStatus, TaskComment, TaskNotification
from time_management.models import TimeEntry
from wiki.models import WikiPage

User = get_user_model()

class Command(BaseCommand):
    help = 'データベース内のすべてのユーザー関連データを削除します（テスト/開発用）'

    def add_arguments(self, parser):
        # オプションでSuperUserを残すかどうかを選択可能
        parser.add_argument(
            '--keep-superuser',
            action='store_true',
            help='スーパーユーザーを削除対象から除外する',
        )

    def handle(self, *args, **options):
        keep_superuser = options['keep_superuser']
        
        self.stdout.write(self.style.WARNING('警告: すべてのユーザーデータを削除します。このコマンドは開発環境でのみ使用してください。'))
        
        confirm = input('本当に続行しますか？ [y/N]: ')
        if confirm.lower() != 'y':
            self.stdout.write(self.style.SUCCESS('操作をキャンセルしました。'))
            return
        
        try:
            with transaction.atomic():
                # 各モデルのデータをクリア
                # 削除順序は外部キー制約を考慮しています
                
                # タスク関連
                self.stdout.write('タスク通知を削除中...')
                count = TaskNotification.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                self.stdout.write('タスクコメントを削除中...')
                count = TaskComment.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                self.stdout.write('タスクを削除中...')
                count = Task.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                self.stdout.write('タスクステータスを削除中...')
                count = TaskStatus.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # チャット関連
                self.stdout.write('チャットメッセージを削除中...')
                count = Message.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                self.stdout.write('チャンネルを削除中...')
                count = Channel.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # 時間管理
                self.stdout.write('時間記録を削除中...')
                count = TimeEntry.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # Wiki
                self.stdout.write('Wikiページを削除中...')
                count = WikiPage.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # クライアント
                self.stdout.write('クライアントを削除中...')
                count = Client.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # ワークスペース
                self.stdout.write('ワークスペースを削除中...')
                count = Workspace.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # ビジネス
                self.stdout.write('ビジネスを削除中...')
                count = Business.objects.all().delete()
                self.stdout.write(f'  削除: {count}')
                
                # ユーザー
                query = User.objects.all()
                if keep_superuser:
                    self.stdout.write('スーパーユーザーを除外してユーザーを削除中...')
                    query = query.filter(is_superuser=False)
                else:
                    self.stdout.write('全ユーザーを削除中...')
                    
                count = query.delete()
                self.stdout.write(f'  削除: {count}')
                
            self.stdout.write(self.style.SUCCESS('すべてのデータが正常に削除されました。'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'エラーが発生しました: {str(e)}'))
            self.stdout.write(self.style.ERROR('トランザクションはロールバックされました。'))