from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from business.models import Business
from tasks.models import TaskCategory, TaskStatus, TaskPriority, Task

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates default task metadata (categories, statuses, priorities) and example tasks for all businesses'

    def handle(self, *args, **kwargs):
        businesses = Business.objects.all()
        
        if not businesses.exists():
            self.stdout.write(self.style.WARNING('No businesses found. Please create businesses first.'))
            return
        
        # Create task metadata for each business
        for business in businesses:
            self.stdout.write(f'Creating task metadata for business: {business.name}')
            
            # Create default categories
            TaskCategory.create_defaults(business)
            self.stdout.write(self.style.SUCCESS(f'Created default task categories for {business.name}'))
            
            # Create default statuses
            TaskStatus.create_defaults(business)
            self.stdout.write(self.style.SUCCESS(f'Created default task statuses for {business.name}'))
            
            # Create default priorities
            TaskPriority.create_defaults(business)
            self.stdout.write(self.style.SUCCESS(f'Created default task priorities for {business.name}'))
            
            # Create some example tasks if none exist
            if not Task.objects.filter(business=business).exists():
                self.create_example_tasks(business)
                self.stdout.write(self.style.SUCCESS(f'Created example tasks for {business.name}'))
        
        self.stdout.write(self.style.SUCCESS('Task metadata creation completed successfully'))
    
    def create_example_tasks(self, business):
        """Create example tasks for demo purposes."""
        # Get default workspace
        workspace = business.workspaces.first()
        if not workspace:
            self.stdout.write(self.style.WARNING(f'No workspace found for {business.name}, skipping example tasks'))
            return
        
        # Get users for assignment
        users = User.objects.filter(business=business)
        if not users.exists():
            self.stdout.write(self.style.WARNING(f'No users found for {business.name}, skipping example tasks'))
            return
        
        # Get example statuses, categories, priorities
        statuses = TaskStatus.objects.filter(business=business)
        categories = TaskCategory.objects.filter(business=business)
        priorities = TaskPriority.objects.filter(business=business)
        
        if not all([statuses.exists(), categories.exists(), priorities.exists()]):
            self.stdout.write(self.style.WARNING(f'Missing metadata for {business.name}, skipping example tasks'))
            return
        
        # Example tasks
        example_tasks = [
            {
                'title': '年度決算書類の作成',
                'description': 'クライアントの年度決算処理を行い、必要な書類を全て作成する。\n\n- 貸借対照表\n- 損益計算書\n- キャッシュフロー計算書\n- 勘定科目内訳書',
                'status': statuses.filter(name__icontains='作業中').first() or statuses.first(),
                'priority': priorities.filter(name__icontains='高').first() or priorities.first(),
                'category': categories.filter(name__icontains='決算').first() or categories.first(),
                'is_fiscal_task': True,
                'estimated_hours': 12,
            },
            {
                'title': '月次試算表チェック',
                'description': '本月の会計データをチェックし、試算表を作成する。異常値がある場合は修正し、クライアントに報告する。',
                'status': statuses.filter(name__icontains='未着手').first() or statuses.first(),
                'priority': priorities.filter(name__icontains='中').first() or priorities.first(),
                'category': categories.filter(name__icontains='記帳').first() or categories.first(),
                'is_fiscal_task': False,
                'estimated_hours': 4,
            },
            {
                'title': '法人税申告書の作成',
                'description': '確定した決算書に基づいて法人税申告書を作成する。税額控除や特例の適用可能性を検討すること。',
                'status': statuses.filter(name__icontains='レビュー').first() or statuses.first(),
                'priority': priorities.filter(name__icontains='高').first() or priorities.first(),
                'category': categories.filter(name__icontains='税務').first() or categories.first(),
                'is_fiscal_task': True,
                'estimated_hours': 8,
            },
            {
                'title': '給与計算処理',
                'description': '今月分の給与計算を行い、給与明細を作成する。所得税や社会保険料の控除を正確に計算すること。',
                'status': statuses.filter(name__icontains='完了').first() or statuses.last(),
                'priority': priorities.filter(name__icontains='中').first() or priorities.first(),
                'category': categories.filter(name__icontains='給与').first() or categories.first(),
                'is_fiscal_task': False,
                'estimated_hours': 3,
            },
        ]
        
        for i, task_data in enumerate(example_tasks):
            # Assign users in rotation
            creator = users[i % users.count()]
            worker = users[(i + 1) % users.count()]
            reviewer = users[(i + 2) % users.count()]
            
            Task.objects.create(
                business=business,
                workspace=workspace,
                creator=creator,
                worker=worker,
                reviewer=reviewer,
                **task_data
            )