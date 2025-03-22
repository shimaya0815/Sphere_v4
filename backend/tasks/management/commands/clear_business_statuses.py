from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tasks.models import TaskStatus

User = get_user_model()

class Command(BaseCommand):
    help = '特定のユーザーが所属するビジネスのステータスデータをクリアします'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='ユーザーのメールアドレス')

    def handle(self, *args, **kwargs):
        email = kwargs['email']
        
        try:
            # ユーザーを検索
            user = User.objects.get(email=email)
            
            # ビジネスIDを取得
            business = user.business
            if not business:
                self.stdout.write(self.style.ERROR(f'ユーザー {email} はビジネスに所属していません'))
                return
                
            self.stdout.write(f'ユーザー {email} は ビジネス {business.name} (ID: {business.id}) に所属しています')
            
            # ビジネスに関連するステータスを削除
            statuses = TaskStatus.objects.filter(business=business)
            count = statuses.count()
            statuses.delete()
            
            self.stdout.write(self.style.SUCCESS(f'ビジネス {business.name} から {count} 件のステータスを削除しました'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'ユーザー {email} が見つかりません')) 