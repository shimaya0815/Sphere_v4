from django.core.management.base import BaseCommand
from django.utils import timezone
from tasks.models import Task, TaskNotification
from django.db.models import Q

class Command(BaseCommand):
    help = '繰り返しタスクを生成するコマンド'

    def handle(self, *args, **options):
        """繰り返しタスクの新しいインスタンスを生成する"""
        self.stdout.write('繰り返しタスクの生成を開始しています...')
        
        # 繰り返し設定があり、完了済みで次のタスクがまだ生成されていないタスクを検索
        recurring_tasks = Task.objects.filter(
            is_recurring=True,  # 繰り返しタスク
            completed_at__isnull=False,  # 完了済み
            # 未完了の子タスクがない、または最後の生成から一定時間経過しているもの
            Q(last_generated_date__isnull=True) | 
            Q(last_generated_date__lt=timezone.now() - timezone.timedelta(hours=12))
        ).exclude(
            # リサイクル終了日を過ぎたものは除外
            Q(recurrence_end_date__isnull=False) & Q(recurrence_end_date__lt=timezone.now())
        )
        
        self.stdout.write(f'繰り返し生成対象のタスク数: {recurring_tasks.count()}')
        
        # 各タスクの次のインスタンスを生成
        created_count = 0
        for task in recurring_tasks:
            try:
                new_task = task.generate_next_instance()
                if new_task:
                    created_count += 1
                    self.stdout.write(f'タスク生成完了: {new_task.title} (ID: {new_task.id})')
                    
                    # タスク割り当ての通知を作成
                    if new_task.assignee:
                        TaskNotification.objects.create(
                            user=new_task.assignee,
                            task=new_task,
                            notification_type='assignment',
                            content=f'新しい繰り返しタスク「{new_task.title}」が割り当てられました。'
                        )
            except Exception as e:
                self.stderr.write(f'タスク「{task.title}」(ID: {task.id})の生成中にエラー: {str(e)}')
                
        self.stdout.write(f'繰り返しタスク生成完了: {created_count}件生成')