from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone
import calendar
from datetime import timedelta
from dateutil.relativedelta import relativedelta

User = get_user_model()


class TaskCategory(models.Model):
    """Category for tasks."""
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_categories'
    )
    name = models.CharField(_('name'), max_length=100)
    color = models.CharField(_('color'), max_length=20, default='#3B82F6')  # Default blue
    description = models.TextField(_('description'), blank=True)
    
    class Meta:
        verbose_name = _('task category')
        verbose_name_plural = _('task categories')
        ordering = ['name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name
        
    @classmethod
    def create_defaults(cls, business):
        """Create default categories for a business."""
        categories = [
            {'name': '一般', 'color': '#3B82F6', 'description': '一般的なタスク'},
            {'name': '税務顧問', 'color': '#10B981', 'description': '税務関連のタスク'},
            {'name': '記帳代行', 'color': '#F59E0B', 'description': '記帳関連のタスク'},
            {'name': '決算・申告', 'color': '#8B5CF6', 'description': '決算・申告関連のタスク'},
            {'name': '給与計算', 'color': '#EC4899', 'description': '給与計算関連のタスク'},
        ]
        
        for category in categories:
            cls.objects.get_or_create(
                business=business,
                name=category['name'],
                defaults={
                    'color': category['color'],
                    'description': category['description']
                }
            )


class TaskStatus(models.Model):
    """Status for tasks."""
    
    # ステータスに応じた担当者タイプ
    ASSIGNEE_TYPES = (
        ('worker', _('作業者')),
        ('reviewer', _('レビュー担当者')),
        ('approver', _('承認者')),
        ('none', _('なし')),
    )
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_statuses'
    )
    name = models.CharField(_('name'), max_length=100)
    color = models.CharField(_('color'), max_length=20, default='#3B82F6')  # Default blue
    description = models.TextField(_('description'), blank=True)
    order = models.PositiveIntegerField(_('order'), default=0)
    assignee_type = models.CharField(
        _('assignee type'),
        max_length=20,
        choices=ASSIGNEE_TYPES,
        default='worker',
        help_text=_('このステータスで担当となるユーザータイプ')
    )
    
    class Meta:
        verbose_name = _('task status')
        verbose_name_plural = _('task statuses')
        ordering = ['order', 'name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name
        
    @classmethod
    def create_defaults(cls, business):
        """Create default statuses for a business."""
        statuses = [
            {
                'name': '未着手', 
                'color': '#9CA3AF', 
                'order': 1, 
                'description': 'タスクがまだ開始されていない状態',
                'assignee_type': 'worker'
            },
            {
                'name': '作業中', 
                'color': '#3B82F6', 
                'order': 2, 
                'description': '作業者がタスクを現在進行している状態',
                'assignee_type': 'worker'
            },
            {
                'name': '作業者完了', 
                'color': '#F59E0B', 
                'order': 3, 
                'description': '作業者の対応が完了し、レビュー待ちの状態',
                'assignee_type': 'worker'
            },
            {
                'name': 'レビュー中', 
                'color': '#A78BFA', 
                'order': 4, 
                'description': 'レビュー担当者が現在レビューを行っている状態',
                'assignee_type': 'reviewer'
            },
            {
                'name': 'レビュー完了', 
                'color': '#8B5CF6', 
                'order': 5, 
                'description': 'レビュー担当者が確認を完了し、承認待ちの状態',
                'assignee_type': 'reviewer'
            },
            {
                'name': '差戻中', 
                'color': '#EF4444', 
                'order': 6, 
                'description': 'レビューで指摘された内容について、作業者がまだ対応を開始していない状態',
                'assignee_type': 'worker'
            },
            {
                'name': '差戻対応中', 
                'color': '#FB7185', 
                'order': 7, 
                'description': '差戻された内容に対して、作業者が対応を進めている状態',
                'assignee_type': 'worker'
            },
            {
                'name': '差戻対応済', 
                'color': '#FCD34D', 
                'order': 8, 
                'description': '作業者が差戻内容の対応を完了し、再レビュー待ちの状態',
                'assignee_type': 'worker'
            },
            {
                'name': '承認中', 
                'color': '#10B981', 
                'order': 9, 
                'description': '承認者による最終確認を行っている状態',
                'assignee_type': 'approver'
            },
            {
                'name': '承認完了（クローズ）', 
                'color': '#059669', 
                'order': 10, 
                'description': 'タスクが全ての作業、レビュー、承認を完了して完全に終了した状態',
                'assignee_type': 'approver'
            },
        ]
        
        for status in statuses:
            cls.objects.get_or_create(
                business=business,
                name=status['name'],
                defaults={
                    'color': status['color'],
                    'order': status['order'],
                    'description': status['description'],
                    'assignee_type': status['assignee_type']
                }
            )


class Task(models.Model):
    """Task model."""
    
    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True, null=True)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    workspace = models.ForeignKey(
        'business.Workspace',
        on_delete=models.CASCADE,
        related_name='tasks',
        null=True,  # Allow null temporarily to fix existing data
        blank=True
    )
    status = models.ForeignKey(
        TaskStatus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    category = models.ForeignKey(
        TaskCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks'
    )
    # 現在の担当者（ステータスに基づいて自動的に変化）
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    # 作業担当者（ワーカー）
    worker = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='worker_tasks',
        verbose_name=_('worker')
    )
    # レビュー担当者
    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewer_tasks',
        verbose_name=_('reviewer')
    )
    # 承認者（従来のapproverを維持しつつ、より明確な名前に）
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks_to_approve'
    )
    # 優先度値（数値が小さいほど優先度が高い）
    priority_value = models.PositiveIntegerField(
        _('priority value'),
        default=50,
        null=True,
        blank=True,
        help_text=_('優先度値（1〜100、数値が小さいほど優先度が高い）')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    due_date = models.DateTimeField(_('due date'), null=True, blank=True)
    start_date = models.DateTimeField(_('start date'), null=True, blank=True)
    completed_at = models.DateTimeField(_('completed at'), null=True, blank=True)
    estimated_hours = models.DecimalField(
        _('estimated hours'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Optional link to a client
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    # 決算期参照
    fiscal_year = models.ForeignKey(
        'clients.FiscalYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    # For recurring tasks
    is_recurring = models.BooleanField(_('is recurring'), default=False)
    recurrence_pattern = models.CharField(
        _('recurrence pattern'),
        max_length=50,
        choices=(
            ('daily', _('Daily')),
            ('weekly', _('Weekly')),
            ('monthly', _('Monthly')),
            ('yearly', _('Yearly')),
        ),
        null=True,
        blank=True
    )
    recurrence_end_date = models.DateTimeField(_('recurrence end date'), null=True, blank=True)
    
    # 週次繰り返しの曜日指定（0=月曜日、1=火曜日、...、6=日曜日）
    weekday = models.IntegerField(
        _('weekday for weekly recurrence'), 
        null=True, 
        blank=True,
        help_text=_('週次繰り返しの曜日指定（0=月曜日、1=火曜日、...、6=日曜日）')
    )
    
    # 週次繰り返しの複数曜日指定（カンマ区切りの数値を保存: "0,2,4" = 月,水,金）
    weekdays = models.CharField(
        _('weekdays for weekly recurrence'), 
        max_length=20, 
        null=True, 
        blank=True,
        help_text=_('週次繰り返しの複数曜日指定（カンマ区切りの数値を保存: "0,2,4" = 月,水,金）')
    )
    
    # 月次繰り返しの日指定（1-31の数値）
    monthday = models.IntegerField(
        _('day of month for monthly recurrence'), 
        null=True, 
        blank=True,
        help_text=_('毎月の特定の日に実行する場合に設定（例：15日）')
    )
    
    # 月次繰り返しの営業日指定（1=第1営業日、2=第2営業日、...）
    business_day = models.IntegerField(
        _('business day of month for monthly recurrence'), 
        null=True, 
        blank=True,
        help_text=_('毎月の特定の営業日（平日）に実行する場合に設定（例：第5営業日）')
    )
    
    # 営業日計算時に祝日を考慮するかどうか
    consider_holidays = models.BooleanField(
        _('consider holidays in business day calculation'),
        default=True,
        help_text=_('営業日計算時に祝日を考慮するかどうか（Trueの場合、土日と祝日をスキップ）')
    )
    
    # 年次繰り返しの月指定（1-12の数値）
    yearly_month = models.IntegerField(
        _('month for yearly recurrence'), 
        null=True, 
        blank=True,
        help_text=_('毎年の特定の月に実行する場合に設定（例：4月）')
    )
    
    # 年次繰り返しの日指定（1-31の数値）
    yearly_day = models.IntegerField(
        _('day for yearly recurrence'), 
        null=True, 
        blank=True,
        help_text=_('毎年の特定の日に実行する場合に設定（例：1日）')
    )
    
    # 繰り返しタスクのインスタンス管理のための追加フィールド
    parent_task = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='recurring_instances'
    )
    recurrence_frequency = models.PositiveIntegerField(_('recurrence frequency'), default=1)
    last_generated_date = models.DateTimeField(_('last generated date'), null=True, blank=True)
    
    # For template tasks
    is_template = models.BooleanField(_('is template'), default=False)
    template_name = models.CharField(_('template name'), max_length=255, blank=True)
    
    class Meta:
        verbose_name = _('task')
        verbose_name_plural = _('tasks')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Override save method to handle status changes and assignee updates."""
        # Ensure workspace is set if business is provided - 強化版
        if not self.workspace and self.business:
            # Get the default workspace for this business
            default_workspace = self.business.workspaces.first()
            if default_workspace:
                self.workspace = default_workspace
            else:
                # ワークスペースが見つからない場合、作成する（シグナルで作成されるはず）
                from business.models import Workspace
                default_workspace = Workspace.objects.create(
                    business=self.business,
                    name='デフォルト',
                    description='自動作成されたデフォルトワークスペース'
                )
                self.workspace = default_workspace

        if self.pk:
            # 既存のタスクの場合、ステータス変更を検出
            try:
                old_task = Task.objects.get(pk=self.pk)
                if self.status and (not old_task.status or old_task.status.id != self.status.id):
                    self._update_assignee_based_on_status()
                    
                    # 履歴記録
                    TaskHistory.objects.create(
                        task=self,
                        user=kwargs.pop('user', None),
                        field_name='status',
                        old_value=old_task.status.name if old_task.status else None,
                        new_value=self.status.name if self.status else None
                    )
            except Task.DoesNotExist:
                # 新規作成の場合は何もしない
                pass
        else:
            # 新規タスク作成時
            if self.status:
                self._update_assignee_based_on_status()
        
        # タスクを保存
        super().save(*args, **kwargs)
    
    def _update_assignee_based_on_status(self):
        """ステータスに基づいて担当者を更新"""
        if not self.status:
            return
            
        # ステータスのassignee_typeに基づいて担当者を設定
        if self.status.assignee_type == 'worker' and self.worker:
            self.assignee = self.worker
        elif self.status.assignee_type == 'reviewer' and self.reviewer:
            self.assignee = self.reviewer
        elif self.status.assignee_type == 'approver' and self.approver:
            self.assignee = self.approver
        elif self.status.assignee_type == 'none':
            self.assignee = None
    
    def mark_complete(self, user=None):
        """Mark the task as complete."""
        self.completed_at = timezone.now()
        if self.status:
            # Find a "Completed" status or similar
            completed_status = TaskStatus.objects.filter(
                business=self.business,
                name='完了'
            ).first()
            
            if not completed_status:
                # "完了"がない場合はnameに'complete'が含まれるものを探す
                completed_status = TaskStatus.objects.filter(
                    business=self.business,
                    name__icontains='complete'
                ).first()
                
            if completed_status:
                old_status = self.status
                self.status = completed_status
                self._update_assignee_based_on_status()
                self.save(user=user)
                
                # 履歴はsaveメソッド内で自動作成されるため、ここでは不要
    
    def generate_next_instance(self):
        """
        繰り返しタスクの次回インスタンスを生成する
        """
        print(f"[DEBUG] generate_next_instance called for task {self.id} ({self.title})")
        print(f"[DEBUG] is_recurring: {self.is_recurring}, recurrence_pattern: {self.recurrence_pattern}, completed_at: {self.completed_at}")
        
        if not self.is_recurring or not self.recurrence_pattern or self.completed_at is None:
            print(f"[DEBUG] Task {self.id} cannot generate next instance: recurring={self.is_recurring}, pattern={self.recurrence_pattern}, completed_at={self.completed_at}")
            return None
            
        # 繰り返し終了日をチェック
        if self.recurrence_end_date and timezone.now() > self.recurrence_end_date:
            print(f"[DEBUG] Task {self.id} cannot generate next instance: recurrence_end_date {self.recurrence_end_date} is in the past")
            return None
            
        # 次回の日付を計算
        if self.due_date:
            next_due_date = self._calculate_next_date(self.due_date)
            print(f"[DEBUG] Task {self.id} calculated next_due_date: {next_due_date} from current due_date: {self.due_date}")
        else:
            next_due_date = None
            print(f"[DEBUG] Task {self.id} has no due_date, next_due_date will be None")
            
        if self.start_date:
            next_start_date = self._calculate_next_date(self.start_date)
            print(f"[DEBUG] Task {self.id} calculated next_start_date: {next_start_date} from current start_date: {self.start_date}")
        else:
            next_start_date = None
            print(f"[DEBUG] Task {self.id} has no start_date, next_start_date will be None")
            
        # 新しいタスクインスタンスを作成
        default_status = TaskStatus.objects.filter(business=self.business, name='未着手').first()
        print(f"[DEBUG] Task {self.id} found default_status: {default_status.id if default_status else None}")
        
        try:
            # 既存タスクのコピーを作成
            new_task = Task.objects.create(
                title=self.title,
                description=self.description,
                business=self.business,
                workspace=self.workspace,
                status=default_status,
                due_date=next_due_date,
                start_date=next_start_date,
                estimated_hours=self.estimated_hours,
                client=self.client,
                fiscal_year=self.fiscal_year,
                is_recurring=self.is_recurring,
                recurrence_pattern=self.recurrence_pattern,
                recurrence_end_date=self.recurrence_end_date,
                weekday=self.weekday,
                weekdays=self.weekdays,
                monthday=self.monthday,
                business_day=self.business_day,
                parent_task=self,
                recurrence_frequency=self.recurrence_frequency
            )
            
            print(f"[DEBUG] Task {self.id} successfully created next recurring task: {new_task.id}")
            
            # 最終生成日を更新
            self.last_generated_date = timezone.now()
            self.save(update_fields=['last_generated_date'])
            print(f"[DEBUG] Task {self.id} updated last_generated_date to {self.last_generated_date}")
            
            return new_task
        except Exception as e:
            print(f"[ERROR] Failed to create next recurring task for {self.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def _calculate_next_date(self, date):
        """
        指定された日付から次の繰り返し日を計算する
        """
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        import calendar
        
        if not date:
            return None
            
        # 頻度の取得（デフォルトは1）
        frequency = getattr(self, 'recurrence_frequency', 1) or 1
        
        # 月末を計算するヘルパー関数
        def get_month_end(year, month):
            _, last_day = calendar.monthrange(year, month)
            return date.replace(year=year, month=month, day=last_day)
        
        # 繰り返しパターンに応じて日付を計算
        if self.recurrence_pattern == 'daily':
            return date + timedelta(days=frequency)
        elif self.recurrence_pattern == 'weekly':
            # 週次の場合、曜日指定を考慮
            if self.weekdays:
                # 複数曜日指定の場合
                try:
                    weekdays = [int(day) for day in self.weekdays.split(',')]
                    
                    # 次の曜日を探す
                    current_weekday = date.weekday()
                    
                    # 現在の曜日より大きい曜日を探す
                    next_weekdays = [day for day in weekdays if day > current_weekday]
                    
                    if next_weekdays:
                        # 今週で次の曜日がある場合
                        days_to_add = min(next_weekdays) - current_weekday
                    else:
                        # 次の週の最初の曜日に
                        days_to_add = 7 - current_weekday + min(weekdays)
                    
                    return date + timedelta(days=days_to_add)
                except:
                    # 変換エラーがあれば単純に7日後
                    return date + timedelta(days=7 * frequency)
            elif self.weekday is not None:
                # 単一曜日指定の場合
                current_weekday = date.weekday()
                target_weekday = self.weekday
                
                if target_weekday > current_weekday:
                    # 今週で次の曜日がある場合
                    days_to_add = target_weekday - current_weekday
                else:
                    # 次の週の同じ曜日
                    days_to_add = 7 - current_weekday + target_weekday
                
                return date + timedelta(days=days_to_add)
            else:
                # 曜日指定がない場合は単純に7日後
                return date + timedelta(days=7 * frequency)
        elif self.recurrence_pattern == 'monthly':
            next_date = date
            
            # 月次の場合、日指定または営業日指定を考慮
            if self.business_day is not None:
                # 営業日指定の場合
                # 次の月初日を計算
                next_month_start = date.replace(day=1) + relativedelta(months=frequency)
                
                # 次の月の指定営業日を計算
                business_day_target = self.business_day
                consider_holidays = getattr(self, 'consider_holidays', True)
                
                # 営業日カウンター
                business_day_count = 0
                current_date = next_month_start
                
                # 月内の各日をチェック
                while current_date.month == next_month_start.month:
                    # 週末でない場合
                    if current_date.weekday() < 5:  # 0=月曜、4=金曜
                        # 祝日判定（ここではスタブ）
                        is_holiday = False
                        if consider_holidays:
                            # 実際には祝日判定ロジックが必要
                            # TODO: 祝日チェックを実装
                            pass
                            
                        if not is_holiday:
                            business_day_count += 1
                            
                            # 目標の営業日に達したら
                            if business_day_count == business_day_target:
                                return current_date
                    
                    # 次の日に進む
                    current_date += timedelta(days=1)
                    
                # 指定営業日が月内に存在しない場合は月末を返す
                return next_month_start + relativedelta(day=31)
            elif self.monthday is not None:
                # 日指定の場合
                target_day = min(self.monthday, 28)  # 安全のため28日までに制限
                
                try:
                    # 次の月の同じ日
                    next_date = date.replace(day=1) + relativedelta(months=frequency)
                    
                    # 日付が月末を超える可能性を考慮
                    month_end = get_month_end(next_date.year, next_date.month)
                    
                    # 指定日または月末のいずれか小さい方
                    target_day = min(self.monthday, month_end.day)
                    
                    return next_date.replace(day=target_day)
                except ValueError:
                    # 例: 2月30日など存在しない日付の場合
                    # 月末日を使用
                    next_month = date.month + frequency
                    next_year = date.year + (next_month - 1) // 12
                    next_month = ((next_month - 1) % 12) + 1
                    
                    # 次の月の月末を計算
                    if next_month in [4, 6, 9, 11]:
                        return date.replace(year=next_year, month=next_month, day=30)
                    elif next_month == 2:
                        if (next_year % 4 == 0 and next_year % 100 != 0) or (next_year % 400 == 0):
                            return date.replace(year=next_year, month=next_month, day=29)
                        else:
                            return date.replace(year=next_year, month=next_month, day=28)
                    else:
                        return date.replace(year=next_year, month=next_month, day=31)
            else:
                # 指定がない場合は同じ日付で月だけ進める
                return date + relativedelta(months=frequency)
        elif self.recurrence_pattern == 'yearly':
            # 毎年の繰り返し設定
            if self.yearly_month is not None and self.yearly_day is not None:
                # 月と日が指定されている場合
                try:
                    # 次の年の指定された月日
                    next_year = date.year + frequency
                    return date.replace(year=next_year, month=self.yearly_month, day=self.yearly_day)
                except ValueError:
                    # 例: 2月30日など存在しない日付の場合
                    # 月末日を使用
                    next_year = date.year + frequency
                    month = self.yearly_month
                    
                    # 月末を計算
                    if month in [4, 6, 9, 11]:
                        day = min(self.yearly_day, 30)
                    elif month == 2:
                        if (next_year % 4 == 0 and next_year % 100 != 0) or (next_year % 400 == 0):
                            day = min(self.yearly_day, 29)
                        else:
                            day = min(self.yearly_day, 28)
                    else:
                        day = min(self.yearly_day, 31)
                    
                    return date.replace(year=next_year, month=month, day=day)
            else:
                # 指定がない場合は同じ月日で年だけ進める
                return date + relativedelta(years=frequency)
        
        return None
        
    @property
    def child_tasks_count(self):
        """
        このテンプレートに関連付けられた内包タスクの数を返す
        """
        if not self.is_template:
            return 0
            
        return self.child_tasks.count()
        
    def generate_task_from_template(self, user=None, client=None, fiscal_year=None, **kwargs):
        """
        テンプレートから実際のタスクを生成する
        """
        if not self.is_template:
            return None
            
        # スケジュール設定
        schedule = None
        if hasattr(self, 'schedule') and self.schedule:
            schedule = self.schedule
            
        # 基準日
        reference_date = timezone.now()
        
        # 作成日と期限日を計算
        creation_date = reference_date
        due_date = None
        
        if schedule:
            creation_date = schedule.calculate_creation_date(reference_date)
            due_date = schedule.calculate_deadline_date(
                creation_date=creation_date,
                reference_date=reference_date,
                fiscal_year=fiscal_year
            )
            
        # タスク作成
        task_data = {
            'title': self.title,
            'description': self.description,
            'business': self.business,
            'workspace': self.workspace,
            'category': self.category,
            'status': self.status or TaskStatus.objects.filter(business=self.business, name='未着手').first(),
            'estimated_hours': self.estimated_hours,
            'worker': self.worker,
            'reviewer': self.reviewer,
            'creator': user or self.creator,
            'client': client,
            'fiscal_year': fiscal_year,
            'is_recurring': self.is_recurring,
            'recurrence_pattern': self.recurrence_pattern,
            'recurrence_end_date': self.recurrence_end_date,
            'weekday': self.weekday,
            'weekdays': self.weekdays,
            'monthday': self.monthday,
            'business_day': self.business_day,
            'parent_task': self,
            'recurrence_frequency': self.recurrence_frequency
        }
        
        # 追加のタスクデータがあれば上書き
        task_data.update(kwargs)
        
        # タスク作成
        task = Task.objects.create(**task_data)
        
        # 内包タスクを生成
        child_tasks = self.child_tasks.all()
        for child_task in child_tasks:
            child_task.generate_task(
                parent_task=task,
                reference_date=reference_date,
                fiscal_year=fiscal_year
            )
            
        return task


class TaskComment(models.Model):
    """Comments on tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_comments'
    )
    content = models.TextField(_('content'))
    html_content = models.TextField(_('html content'), blank=True, null=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # For @mentions
    mentioned_users = models.ManyToManyField(
        User,
        related_name='mentioned_in_comments',
        blank=True
    )
    
    class Meta:
        verbose_name = _('task comment')
        verbose_name_plural = _('task comments')
        ordering = ['-created_at']  # 新しいコメントが最初に来るように変更
    
    def __str__(self):
        return f"Comment by {self.user.get_full_name()} on {self.task.title}"


class TaskAttachment(models.Model):
    """Attachments for tasks and comments."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    comment = models.ForeignKey(
        TaskComment,
        on_delete=models.CASCADE,
        related_name='attachments',
        null=True,
        blank=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_attachments'
    )
    file = models.FileField(_('file'), upload_to='task_attachments/')
    filename = models.CharField(_('filename'), max_length=255)
    file_type = models.CharField(_('file type'), max_length=100)
    file_size = models.PositiveIntegerField(_('file size'))
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('task attachment')
        verbose_name_plural = _('task attachments')
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.filename


class TaskHistory(models.Model):
    """History of changes to tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='history'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_history_entries'
    )
    timestamp = models.DateTimeField(_('timestamp'), auto_now_add=True)
    field_name = models.CharField(_('field name'), max_length=100)
    old_value = models.TextField(_('old value'), blank=True, null=True)
    new_value = models.TextField(_('new value'), blank=True, null=True)
    
    class Meta:
        verbose_name = _('task history')
        verbose_name_plural = _('task history entries')
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.field_name} changed on {self.task.title}"


class TaskTimer(models.Model):
    """Timer for tracking time spent on tasks."""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='timers'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_timers'
    )
    start_time = models.DateTimeField(_('start time'))
    end_time = models.DateTimeField(_('end time'), null=True, blank=True)
    duration = models.DurationField(_('duration'), null=True, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    
    class Meta:
        verbose_name = _('task timer')
        verbose_name_plural = _('task timers')
        ordering = ['-start_time']
    
    def __str__(self):
        return f"Timer for {self.task.title} by {self.user.get_full_name()}"
    
    def stop_timer(self):
        """Stop the timer and calculate duration."""
        if not self.end_time:
            self.end_time = timezone.now()
            self.duration = self.end_time - self.start_time
            self.save()
    
    def resume_timer(self):
        """Resume a stopped timer."""
        self.end_time = None
        self.save()


class TaskSchedule(models.Model):
    """Schedule settings for task templates."""
    
    SCHEDULE_TYPES = (
        ('monthly_start', _('月初作成・当月締め切り')),
        ('monthly_end', _('月末作成・翌月締め切り')),
        ('fiscal_relative', _('決算日基準')),
        ('custom', _('カスタム設定')),
    )
    
    RECURRENCE_CHOICES = (
        ('once', _('一度のみ')),
        ('daily', _('毎日')),
        ('weekly', _('毎週')),
        ('monthly', _('毎月')),
        ('quarterly', _('四半期ごと')),
        ('yearly', _('毎年')),
        ('with_parent', _('親テンプレートと同時')),
    )
    
    REFERENCE_DATE_TYPES = (
        ('execution_date', _('実行日（バッチ処理実行日）')),
        ('fiscal_start', _('決算期開始日')),
        ('fiscal_end', _('決算期終了日')),
        ('month_start', _('当月初日')),
        ('month_end', _('当月末日')),
        ('parent_creation', _('親タスク作成日')),
    )
    
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_schedules'
    )
    name = models.CharField(_('name'), max_length=255)
    schedule_type = models.CharField(
        _('schedule type'),
        max_length=30,
        choices=SCHEDULE_TYPES,
        default='monthly_start'
    )
    recurrence = models.CharField(
        _('recurrence'),
        max_length=20,
        choices=RECURRENCE_CHOICES,
        default='monthly'
    )
    
    # 月初/月末パターン用
    creation_day = models.IntegerField(_('creation day'), null=True, blank=True)
    deadline_day = models.IntegerField(_('deadline day'), null=True, blank=True)
    deadline_next_month = models.BooleanField(_('deadline next month'), default=False)
    
    # 決算日基準用
    fiscal_date_reference = models.CharField(
        _('fiscal date reference'),
        max_length=20,
        choices=(
            ('start_date', _('開始日')),
            ('end_date', _('終了日')),
        ),
        default='end_date'
    )
    
    # カスタム設定用
    reference_date_type = models.CharField(
        _('reference date type'),
        max_length=30,
        choices=REFERENCE_DATE_TYPES,
        default='execution_date'
    )
    creation_date_offset = models.IntegerField(_('creation date offset'), default=0)
    deadline_date_offset = models.IntegerField(_('deadline date offset'), default=5)
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('task schedule')
        verbose_name_plural = _('task schedules')
        ordering = ['name']
    
    def __str__(self):
        return self.name
        
    def calculate_creation_date(self, reference_date=None):
        """
        基準日から作成日を計算する
        """
        from datetime import datetime, timedelta
        from dateutil.relativedelta import relativedelta
        
        # 基準日が指定されていない場合は現在日時
        if not reference_date:
            reference_date = timezone.now()
            
        if self.schedule_type == 'monthly_start' and self.creation_day:
            # 月初パターン: 毎月X日に作成
            return reference_date.replace(day=min(self.creation_day, 28))
            
        elif self.schedule_type == 'monthly_end' and self.creation_day:
            # 月末パターン: 月末からX日前に作成
            last_day = reference_date.replace(day=1) + relativedelta(months=1, days=-1)
            return last_day - timedelta(days=min(self.creation_day, 15))
            
        elif self.schedule_type == 'fiscal_relative':
            # 決算日基準は別途計算
            return None
            
        elif self.schedule_type == 'custom':
            # カスタム: 基準日タイプに応じた日付を計算
            return reference_date + timedelta(days=self.creation_date_offset)
            
        return reference_date
        
    def calculate_deadline_date(self, creation_date=None, reference_date=None, fiscal_year=None):
        """
        作成日または基準日から期限日を計算する
        """
        from datetime import datetime, timedelta
        from dateutil.relativedelta import relativedelta
        
        # 作成日が指定されていない場合は現在日時
        if not creation_date:
            creation_date = self.calculate_creation_date(reference_date)
            
        if not creation_date:
            return None
            
        if self.schedule_type == 'monthly_start' and self.deadline_day:
            # 月初パターン: 毎月X日が期限
            result = creation_date.replace(day=min(self.deadline_day, 28))
            if result < creation_date:  # 作成日より前の日付になる場合
                result = result + relativedelta(months=1)
            return result
            
        elif self.schedule_type == 'monthly_end' and self.deadline_day:
            # 月末パターン: 翌月X日が期限
            if self.deadline_next_month:
                next_month = creation_date + relativedelta(months=1)
                return next_month.replace(day=min(self.deadline_day, 28))
            else:
                return creation_date.replace(day=min(self.deadline_day, 28))
                
        elif self.schedule_type == 'fiscal_relative' and fiscal_year:
            # 決算日基準: 決算開始日または終了日からの相対日
            if self.fiscal_date_reference == 'start_date':
                base_date = fiscal_year.start_date
            else:
                base_date = fiscal_year.end_date
                
            return base_date + timedelta(days=self.deadline_day or 0)
            
        elif self.schedule_type == 'custom':
            # カスタム: 作成日からのオフセット
            return creation_date + timedelta(days=self.deadline_date_offset)
            
        return None


class TemplateChildTask(models.Model):
    """内包タスクモデル（テンプレートの子タスク）"""
    
    parent_template = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='child_tasks',
        limit_choices_to={'is_template': True}
    )
    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='template_child_tasks'
    )
    category = models.ForeignKey(
        TaskCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='template_child_tasks'
    )
    status = models.ForeignKey(
        TaskStatus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='template_child_tasks'
    )
    estimated_hours = models.DecimalField(
        _('estimated hours'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # 実行順序
    order = models.PositiveIntegerField(_('order'), default=1)
    
    # カスタムスケジュール
    has_custom_schedule = models.BooleanField(_('has custom schedule'), default=False)
    schedule = models.ForeignKey(
        TaskSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='template_child_tasks'
    )
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('template child task')
        verbose_name_plural = _('template child tasks')
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.title} (子: {self.parent_template.title})"
    
    def generate_task(self, parent_task, reference_date=None, fiscal_year=None):
        """
        この内包タスク定義から実際のタスクを生成する
        
        parent_task: 親タスク（テンプレートから生成されたタスク）
        reference_date: 基準日
        fiscal_year: 関連する決算期
        """
        # 基準日がなければ現在時刻
        if not reference_date:
            reference_date = timezone.now()
            
        # スケジュール計算
        creation_date = None
        due_date = None
        
        if self.has_custom_schedule and self.schedule:
            # カスタムスケジュールを使用
            creation_date = self.schedule.calculate_creation_date(reference_date)
            due_date = self.schedule.calculate_deadline_date(
                creation_date=creation_date,
                reference_date=reference_date,
                fiscal_year=fiscal_year
            )
        else:
            # 親タスクと同じ日程
            creation_date = timezone.now()
            due_date = parent_task.due_date
            
        # 担当者は親タスクから引き継ぐ
        worker = parent_task.worker
        reviewer = parent_task.reviewer
            
        # タスク作成
        task = Task.objects.create(
            title=self.title,
            description=self.description,
            business=self.business,
            workspace=parent_task.workspace,
            category=self.category,
            status=self.status or TaskStatus.objects.filter(business=self.business, name='未着手').first(),
            estimated_hours=self.estimated_hours,
            worker=worker,
            reviewer=reviewer,
            creator=parent_task.creator,
            client=parent_task.client,
            fiscal_year=fiscal_year,
            is_recurring=parent_task.is_recurring,
            recurrence_pattern=parent_task.recurrence_pattern,
            recurrence_end_date=parent_task.recurrence_end_date,
            weekday=parent_task.weekday,
            weekdays=parent_task.weekdays,
            monthday=parent_task.monthday,
            business_day=parent_task.business_day,
            parent_task=parent_task
        )
        
        return task


class TaskNotification(models.Model):
    """Notifications related to tasks."""
    
    TYPE_CHOICES = (
        ('assignment', _('Task Assignment')),
        ('due_soon', _('Task Due Soon')),
        ('overdue', _('Task Overdue')),
        ('comment', _('New Comment')),
        ('mention', _('Mention')),
        ('status_change', _('Status Change')),
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_notifications'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(_('type'), max_length=20, choices=TYPE_CHOICES)
    content = models.TextField(_('content'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    read = models.BooleanField(_('read'), default=False)
    
    class Meta:
        verbose_name = _('task notification')
        verbose_name_plural = _('task notifications')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} notification for {self.user.get_full_name()}"
