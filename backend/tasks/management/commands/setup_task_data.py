from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tasks.models import TaskCategory, TaskStatus, TaskPriority
from business.models import Business
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Sets up default task categories, statuses and priorities for businesses'

    def handle(self, *args, **kwargs):
        businesses = Business.objects.all()
        
        if not businesses.exists():
            self.stdout.write(self.style.WARNING('No businesses found. Please create a business first.'))
            return
            
        # デフォルトのカテゴリー、ステータス、優先度を準備
        default_categories = [
            {'name': '業務', 'color': '#3B82F6', 'description': '一般的な業務タスク'},
            {'name': '開発', 'color': '#10B981', 'description': '開発関連のタスク'},
            {'name': '会議', 'color': '#6366F1', 'description': '会議や打ち合わせ'},
            {'name': '営業', 'color': '#F59E0B', 'description': '営業活動関連のタスク'},
            {'name': '経理', 'color': '#EC4899', 'description': '経理・財務関連のタスク'},
        ]
        
        default_statuses = [
            {'name': '未着手', 'color': '#6B7280', 'description': 'まだ開始していないタスク', 'order': 1},
            {'name': '進行中', 'color': '#3B82F6', 'description': '現在作業中のタスク', 'order': 2},
            {'name': 'レビュー中', 'color': '#F59E0B', 'description': 'レビュー待ちのタスク', 'order': 3},
            {'name': '完了', 'color': '#10B981', 'description': '完了したタスク', 'order': 4},
        ]
        
        default_priorities = [
            {'name': '高', 'color': '#EF4444', 'description': '優先度高', 'level': 3},
            {'name': '中', 'color': '#F59E0B', 'description': '優先度中', 'level': 2},
            {'name': '低', 'color': '#10B981', 'description': '優先度低', 'level': 1},
        ]
        
        # 各ビジネスに対してデフォルトデータを設定
        with transaction.atomic():
            for business in businesses:
                self.stdout.write(f'Setting up default task data for business: {business.name}')
                
                # カテゴリー作成
                for cat_data in default_categories:
                    TaskCategory.objects.get_or_create(
                        business=business,
                        name=cat_data['name'],
                        defaults={
                            'color': cat_data['color'],
                            'description': cat_data['description']
                        }
                    )
                    
                # ステータス作成
                for status_data in default_statuses:
                    TaskStatus.objects.get_or_create(
                        business=business,
                        name=status_data['name'],
                        defaults={
                            'color': status_data['color'],
                            'description': status_data['description'],
                            'order': status_data['order']
                        }
                    )
                    
                # 優先度作成
                for priority_data in default_priorities:
                    TaskPriority.objects.get_or_create(
                        business=business,
                        name=priority_data['name'],
                        defaults={
                            'color': priority_data['color'],
                            'description': priority_data['description'],
                            'level': priority_data['level']
                        }
                    )
                    
        self.stdout.write(self.style.SUCCESS('Successfully set up default task data for all businesses'))