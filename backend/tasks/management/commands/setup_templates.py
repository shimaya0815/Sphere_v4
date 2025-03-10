from django.core.management.base import BaseCommand
from django.utils import timezone
from tasks.models import Task, TemplateChildTask, TaskStatus, TaskCategory, TaskPriority, TaskSchedule
from business.models import Business, Workspace


def create_template_for_business(business):
    """
    指定されたビジネスに対してテンプレートタスクと内包タスクを作成
    """
    print(f"\n=== ビジネス: {business.name} (ID: {business.id}) ===")
    
    # カテゴリ、ステータス、優先度を取得
    categories = TaskCategory.objects.filter(business=business)
    statuses = TaskStatus.objects.filter(business=business)
    priorities = TaskPriority.objects.filter(business=business)
    
    # デフォルト値を設定
    default_category = categories.filter(name='一般').first() or categories.first()
    bookkeeping_category = categories.filter(name='記帳代行').first() or default_category
    tax_category = categories.filter(name='税務顧問').first() or categories.filter(name='決算・申告').first() or default_category
    default_status = statuses.filter(name='未着手').first() or statuses.first()
    default_priority = priorities.filter(priority_value=50).first() or priorities.first()
    
    # ワークスペースを確認
    workspace = business.workspaces.first()
    if not workspace:
        # ワークスペースがなければ作成
        workspace = Workspace.objects.create(
            business=business,
            name="Default Workspace",
            description="Default workspace created automatically"
        )
    
    # 標準テンプレート構成を作成
    template_configs = [
        {
            "name": "決算・法人税申告業務",
            "description": "決算期の法人税申告書作成業務を行います。",
            "category": tax_category,
            "tasks": [
                {
                    "title": "決算資料の確認",
                    "description": "決算に必要な資料が揃っているか確認します。",
                    "estimated_hours": 1.0,
                    "order": 1
                },
                {
                    "title": "決算整理仕訳",
                    "description": "減価償却費や引当金など、決算整理仕訳を行います。",
                    "estimated_hours": 3.0,
                    "order": 2
                },
                {
                    "title": "決算書の作成",
                    "description": "貸借対照表、損益計算書などの決算書を作成します。",
                    "estimated_hours": 4.0,
                    "order": 3
                },
                {
                    "title": "法人税申告書の作成",
                    "description": "法人税申告書を作成します。",
                    "estimated_hours": 5.0,
                    "order": 4
                },
                {
                    "title": "地方税申告書の作成",
                    "description": "法人住民税・事業税の申告書を作成します。",
                    "estimated_hours": 3.0,
                    "order": 5
                },
                {
                    "title": "消費税申告書の作成",
                    "description": "消費税申告書を作成します。",
                    "estimated_hours": 2.0,
                    "order": 6
                },
                {
                    "title": "クライアントへの説明",
                    "description": "決算内容をクライアントに説明します。",
                    "estimated_hours": 1.5,
                    "order": 7
                },
                {
                    "title": "電子申告の実施",
                    "description": "e-Taxで電子申告を行います。",
                    "estimated_hours": 1.0,
                    "order": 8
                }
            ]
        },
        {
            "name": "源泉所得税納付業務",
            "description": "毎月の源泉所得税の納付手続きを行います。",
            "category": tax_category,
            "tasks": [
                {
                    "title": "給与支払い額の確認",
                    "description": "当月の給与支払い総額を確認します。",
                    "estimated_hours": 0.5,
                    "order": 1
                },
                {
                    "title": "源泉所得税額の計算",
                    "description": "源泉所得税額を計算します。",
                    "estimated_hours": 1.0,
                    "order": 2
                },
                {
                    "title": "納付書の作成",
                    "description": "源泉所得税の納付書を作成します。",
                    "estimated_hours": 0.5,
                    "order": 3
                },
                {
                    "title": "納付手続きの実施",
                    "description": "源泉所得税を納付します。",
                    "estimated_hours": 0.5,
                    "order": 4
                }
            ]
        },
        {
            "name": "住民税納付業務",
            "description": "従業員の住民税特別徴収の納付手続きを行います。",
            "category": tax_category,
            "tasks": [
                {
                    "title": "住民税通知書の確認",
                    "description": "市区町村からの特別徴収税額通知書を確認します。",
                    "estimated_hours": 0.5,
                    "order": 1
                },
                {
                    "title": "従業員ごとの住民税額の確認",
                    "description": "従業員ごとの住民税額を確認します。",
                    "estimated_hours": 1.0,
                    "order": 2
                },
                {
                    "title": "給与システムへの反映",
                    "description": "給与システムに住民税額を反映します。",
                    "estimated_hours": 1.0,
                    "order": 3
                },
                {
                    "title": "納付書の作成",
                    "description": "住民税の納付書を作成します。",
                    "estimated_hours": 0.5,
                    "order": 4
                },
                {
                    "title": "納付手続きの実施",
                    "description": "住民税を納付します。",
                    "estimated_hours": 0.5,
                    "order": 5
                }
            ]
        },
        {
            "name": "社会保険手続き",
            "description": "社会保険関連の各種手続きを行います。",
            "category": tax_category,
            "tasks": [
                {
                    "title": "資格取得届の作成",
                    "description": "新入社員の社会保険資格取得届を作成します。",
                    "estimated_hours": 1.0,
                    "order": 1
                },
                {
                    "title": "標準報酬月額の算定",
                    "description": "社会保険の標準報酬月額の算定を行います。",
                    "estimated_hours": 2.0,
                    "order": 2
                },
                {
                    "title": "賞与支払届の作成",
                    "description": "賞与を支給した際の賞与支払届を作成します。",
                    "estimated_hours": 1.0,
                    "order": 3
                },
                {
                    "title": "被保険者報酬月額算定基礎届の作成",
                    "description": "毎年7月に提出する算定基礎届を作成します。",
                    "estimated_hours": 2.0,
                    "order": 4
                }
            ]
        }
    ]
    
    # テンプレートタスクの作成
    created_templates = []
    for template_config in template_configs:
        # 既存のテンプレートを探す
        existing_template = Task.objects.filter(
            business=business,
            is_template=True,
            title=template_config["name"]
        ).first()
        
        if existing_template:
            template = existing_template
            print(f"既存テンプレート「{template.title}」を更新します")
            template.description = template_config["description"]
            template.category = template_config["category"]
            template.save()
        else:
            # スケジュールを作成
            schedule_name = f"{template_config['name']}スケジュール"
            
            # 既存のスケジュールを探す
            existing_schedule = TaskSchedule.objects.filter(
                business=business,
                name=schedule_name
            ).first()
            
            if existing_schedule:
                schedule = existing_schedule
            else:
                # 新規スケジュール作成
                # テンプレート名と一致するスケジュール設定
                schedule_settings = {
                    "決算・法人税申告業務": {"type": "fiscal_relative", "recurrence": "yearly"},
                    "源泉所得税納付業務": {"type": "monthly_end", "recurrence": "monthly"},
                    "住民税納付業務": {"type": "monthly_start", "recurrence": "monthly"},
                    "社会保険手続き": {"type": "monthly_start", "recurrence": "monthly"}
                }
                
                # 設定を取得（見つからない場合はデフォルト値を使用）
                if template_config["name"] in schedule_settings:
                    schedule_type = schedule_settings[template_config["name"]]["type"]
                    recurrence = schedule_settings[template_config["name"]]["recurrence"]
                else:
                    schedule_type = "monthly_start"
                    recurrence = "monthly"
                    
                schedule = TaskSchedule.objects.create(
                    business=business,
                    name=schedule_name,
                    schedule_type=schedule_type,
                    recurrence=recurrence,
                    reference_date_type="execution_date",
                    creation_date_offset=0,
                    deadline_date_offset=5
                )
                print(f"スケジュール「{schedule.name}」を作成しました")
            
            # テンプレートタスクを作成
            template = Task.objects.create(
                business=business,
                workspace=workspace,
                title=template_config["name"],
                description=template_config["description"],
                category=template_config["category"],
                status=default_status,
                priority=default_priority,
                is_template=True,
                template_name=template_config["name"],
                created_at=timezone.now()
            )
            print(f"テンプレート「{template.title}」を作成しました")
        
        created_templates.append(template)
        
        # 既存の内包タスクを削除
        existing_tasks = TemplateChildTask.objects.filter(parent_template=template)
        if existing_tasks.exists():
            print(f"既存の内包タスク {existing_tasks.count()}件 を削除します")
            existing_tasks.delete()
        
        # 内包タスクを作成
        created_tasks = []
        for task_data in template_config["tasks"]:
            task = TemplateChildTask.objects.create(
                parent_template=template,
                business=business,
                title=task_data["title"],
                description=task_data["description"],
                estimated_hours=task_data["estimated_hours"],
                order=task_data["order"],
                category=template_config["category"],
                status=default_status,
                priority=default_priority,
                has_custom_schedule=False
            )
            created_tasks.append(task)
            print(f"  内包タスク「{task.title}」を作成しました")
        
        print(f"テンプレート「{template.title}」に {len(created_tasks)} 件の内包タスクを作成しました")
    
    return created_templates


class Command(BaseCommand):
    help = 'デフォルトのタスクテンプレートと内包タスクを作成します'
    
    def add_arguments(self, parser):
        parser.add_argument('--business_id', type=int, help='特定のビジネスIDを指定して実行')
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== デフォルトテンプレート作成処理を開始します ==='))
        
        business_id = options.get('business_id')
        
        if business_id:
            # 特定のビジネスのみ処理
            try:
                business = Business.objects.get(id=business_id)
                self.stdout.write(f"ビジネス {business.name} (ID: {business_id}) のみ処理します")
                templates = create_template_for_business(business)
                self.stdout.write(self.style.SUCCESS(f"{len(templates)} 件のテンプレートを作成または更新しました"))
            except Business.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"ID {business_id} のビジネスは存在しません"))
        else:
            # すべてのビジネスを処理
            businesses = Business.objects.all()
            
            if not businesses.exists():
                self.stdout.write(self.style.WARNING("ビジネスが存在しません。ビジネスを先に作成してください。"))
                return
            
            total_templates = 0
            
            for business in businesses:
                templates = create_template_for_business(business)
                total_templates += len(templates)
            
            self.stdout.write(self.style.SUCCESS(f"\n=== 合計 {total_templates} 件のテンプレートを作成または更新しました ===" ))