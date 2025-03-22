from django.core.management.base import BaseCommand
from tasks.models import TaskCategory

class Command(BaseCommand):
    help = 'すべてのビジネスからデフォルトカテゴリーを削除します'

    def handle(self, *args, **kwargs):
        # デフォルトのカテゴリー名リスト
        default_category_names = [
            '一般',
            '税務顧問',
            '記帳代行',
            '決算・申告',
            '給与計算',
        ]
        
        # 各カテゴリー名に対して削除を実行
        for category_name in default_category_names:
            deleted_count, _ = TaskCategory.objects.filter(name=category_name).delete()
            self.stdout.write(f'カテゴリー "{category_name}" を {deleted_count} 件削除しました')
        
        self.stdout.write(self.style.SUCCESS('デフォルトカテゴリーの削除が完了しました')) 