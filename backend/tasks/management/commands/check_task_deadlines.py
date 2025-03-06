from django.core.management.base import BaseCommand
from django.utils import timezone
from tasks.models import Task, TaskNotification
from django.db.models import Q

class Command(BaseCommand):
    help = 'タスクの期限をチェックし、通知を作成するコマンド'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-before',
            type=int,
            default=3,
            help='期限切れ前の通知を送信する日数（デフォルト: 3日前）'
        )

    def handle(self, *args, **options):
        """タスクの期限をチェックし、通知を作成する"""
        days_before = options['days_before']
        self.stdout.write(f'タスク期限のチェックを開始しています（期限切れ{days_before}日前に通知）...')
        
        # 現在時刻と期限切れ予測時点の時刻を取得
        now = timezone.now()
        due_soon_threshold = now + timezone.timedelta(days=days_before)
        
        # 未完了かつ期限間近のタスク
        due_soon_tasks = Task.objects.filter(
            completed_at__isnull=True,  # 未完了
            due_date__lte=due_soon_threshold,  # 期限切れまで days_before 日以内
            due_date__gt=now,  # まだ期限切れではない
        ).exclude(
            # 既に「due_soon」タイプの通知があるタスクは除外
            id__in=TaskNotification.objects.filter(
                notification_type='due_soon', 
                created_at__gte=now - timezone.timedelta(days=1)  # 24時間以内に通知済み
            ).values_list('task_id', flat=True)
        )
        
        self.stdout.write(f'期限間近のタスク数: {due_soon_tasks.count()}')
        
        # 期限間近のタスクに通知を作成
        due_soon_count = 0
        for task in due_soon_tasks:
            try:
                if task.assignee:
                    TaskNotification.objects.create(
                        user=task.assignee,
                        task=task,
                        notification_type='due_soon',
                        content=f'タスク「{task.title}」の期限が近づいています（{days_before}日以内）'
                    )
                    due_soon_count += 1
                    
                # 作業者とレビュー担当者（担当者と異なる場合）にも通知
                if task.worker and task.worker != task.assignee:
                    TaskNotification.objects.create(
                        user=task.worker,
                        task=task,
                        notification_type='due_soon',
                        content=f'タスク「{task.title}」の期限が近づいています（{days_before}日以内）'
                    )
                    due_soon_count += 1
                    
                if task.reviewer and task.reviewer != task.assignee and task.reviewer != task.worker:
                    TaskNotification.objects.create(
                        user=task.reviewer,
                        task=task,
                        notification_type='due_soon',
                        content=f'タスク「{task.title}」の期限が近づいています（{days_before}日以内）'
                    )
                    due_soon_count += 1
            except Exception as e:
                self.stderr.write(f'タスク「{task.title}」(ID: {task.id})の期限通知作成中にエラー: {str(e)}')
        
        # 期限切れのタスク
        overdue_tasks = Task.objects.filter(
            completed_at__isnull=True,  # 未完了
            due_date__lt=now,  # 期限切れ
        ).exclude(
            # 既に「overdue」タイプの通知があるタスクは除外
            id__in=TaskNotification.objects.filter(
                notification_type='overdue', 
                created_at__gte=now - timezone.timedelta(days=1)  # 24時間以内に通知済み
            ).values_list('task_id', flat=True)
        )
        
        self.stdout.write(f'期限切れのタスク数: {overdue_tasks.count()}')
        
        # 期限切れのタスクに通知を作成
        overdue_count = 0
        for task in overdue_tasks:
            try:
                if task.assignee:
                    TaskNotification.objects.create(
                        user=task.assignee,
                        task=task,
                        notification_type='overdue',
                        content=f'【重要】タスク「{task.title}」が期限切れです'
                    )
                    overdue_count += 1
                    
                # 作業者とレビュー担当者（担当者と異なる場合）にも通知
                if task.worker and task.worker != task.assignee:
                    TaskNotification.objects.create(
                        user=task.worker,
                        task=task,
                        notification_type='overdue',
                        content=f'【重要】タスク「{task.title}」が期限切れです'
                    )
                    overdue_count += 1
                    
                if task.reviewer and task.reviewer != task.assignee and task.reviewer != task.worker:
                    TaskNotification.objects.create(
                        user=task.reviewer,
                        task=task,
                        notification_type='overdue',
                        content=f'【重要】タスク「{task.title}」が期限切れです'
                    )
                    overdue_count += 1
                    
                # 上司（承認者）にも通知
                if task.approver and task.approver != task.assignee and task.approver != task.worker and task.approver != task.reviewer:
                    TaskNotification.objects.create(
                        user=task.approver,
                        task=task,
                        notification_type='overdue',
                        content=f'【重要】タスク「{task.title}」が期限切れです（担当: {task.assignee.get_full_name() if task.assignee else "未割当"}）'
                    )
                    overdue_count += 1
            except Exception as e:
                self.stderr.write(f'タスク「{task.title}」(ID: {task.id})の期限切れ通知作成中にエラー: {str(e)}')
                
        self.stdout.write(f'処理完了: 期限間近の通知 {due_soon_count}件、期限切れの通知 {overdue_count}件を作成')