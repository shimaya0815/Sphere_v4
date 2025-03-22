from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tasks.models import TaskCategory

User = get_user_model()

class Command(BaseCommand):
    help = '特定のユーザーが所属するビジネスのカテゴリーデータをクリアします'

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
            
            # ビジネスに関連するカテゴリーを削除
            categories = TaskCategory.objects.filter(business=business)
            count = categories.count()
            
            # カテゴリー一覧を表示
            self.stdout.write('削除予定のカテゴリー:')
            for category in categories:
                self.stdout.write(f'  - ID: {category.id}, 名前: {category.name}')
                
            # 削除実行
            categories.delete()
            
            self.stdout.write(self.style.SUCCESS(f'ビジネス {business.name} から {count} 件のカテゴリーを削除しました'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'ユーザー {email} が見つかりません')) 