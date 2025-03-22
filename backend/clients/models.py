from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()


class Client(models.Model):
    """Client model for organizations/companies that are clients."""
    
    # 基本情報
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_clients'
    )
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='clients'
    )
    
    # 契約・顧客管理情報
    CONTRACT_STATUS_CHOICES = (
        ('active', _('契約中')),
        ('suspended', _('休止中')),
        ('terminated', _('解約')),
        ('preparing', _('契約準備中')),
    )
    contract_status = models.CharField(_('契約状況'), max_length=20, choices=CONTRACT_STATUS_CHOICES, default='active')
    client_code = models.CharField(_('クライアントコード'), max_length=50, unique=True)
    name = models.CharField(_('名前'), max_length=255)
    
    # 法人・個人情報
    ENTITY_CHOICES = (
        ('corporate', _('法人')),
        ('individual', _('個人')),
    )
    corporate_individual = models.CharField(_('法人または個人'), max_length=20, choices=ENTITY_CHOICES, default='corporate')
    corporate_number = models.CharField(_('法人番号'), max_length=13, blank=True)
    
    # 住所情報
    postal_code = models.CharField(_('郵便番号'), max_length=8, blank=True)
    prefecture = models.CharField(_('都道府県'), max_length=20, blank=True)
    city = models.CharField(_('市区町村'), max_length=50, blank=True)
    street_address = models.CharField(_('番地'), max_length=100, blank=True)
    building = models.CharField(_('建物名・部屋番号'), max_length=100, blank=True)
    
    # 連絡先
    phone = models.CharField(_('電話番号'), max_length=20, blank=True)
    email = models.EmailField(_('Email'), blank=True)
    website = models.URLField(_('Webサイト'), max_length=255, blank=True)
    
    # 会社情報
    capital = models.DecimalField(_('資本金'), max_digits=15, decimal_places=0, null=True, blank=True)
    establishment_date = models.DateField(_('設立日・開業日'), null=True, blank=True)
    
    # 税務情報
    tax_eTax_ID = models.CharField(_('eTax ID'), max_length=50, blank=True)
    tax_eLTAX_ID = models.CharField(_('eLTAX ID'), max_length=50, blank=True)
    tax_taxpayer_confirmation_number = models.CharField(_('納税者確認番号'), max_length=50, blank=True)
    tax_invoice_no = models.CharField(_('インボイスNo'), max_length=50, blank=True)
    tax_invoice_registration_date = models.DateField(_('インボイス登録日'), null=True, blank=True)
    
    # 給与情報
    salary_closing_day = models.IntegerField(_('給与締め日'), validators=[MinValueValidator(1), MaxValueValidator(31)], null=True, blank=True)
    SALARY_PAYMENT_MONTH_CHOICES = (
        ('current', _('当月')),
        ('next', _('翌月')),
    )
    salary_payment_month = models.CharField(_('給与支払月'), max_length=10, choices=SALARY_PAYMENT_MONTH_CHOICES, default='next', blank=True)
    salary_payment_day = models.IntegerField(_('給与支払日'), validators=[MinValueValidator(1), MaxValueValidator(31)], null=True, blank=True)
    attendance_management_software = models.CharField(_('勤怠管理ソフト'), max_length=100, blank=True)
    
    # 決算情報
    fiscal_year = models.PositiveIntegerField(_('決算期（期）'), null=True, blank=True)
    fiscal_date = models.DateField(_('決算日'), null=True, blank=True)
    
    # タスクテンプレート設定は削除
    # 以前は task_template_usage と task_template_type フィールドがここにありました
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('client')
        verbose_name_plural = _('clients')
        ordering = ['name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name


class TaskTemplateSchedule(models.Model):
    """Scheduling configuration for task templates - when to generate tasks and deadlines."""
    
    # Schedule types
    SCHEDULE_TYPE_CHOICES = (
        ('monthly_start', _('月初作成・当月締め切り')),  # 1日作成、5日締め切り
        ('monthly_end', _('月末作成・翌月締め切り')),    # 25日作成、翌月10日締め切り
        ('fiscal_relative', _('決算日基準')),           # 決算日基準の相対日
        ('custom', _('カスタム設定')),                 # カスタム設定
    )
    
    # For monthly_start: generate on 1st, due on 5th
    # For monthly_end: generate on 25th, due on 10th of next month
    # For fiscal_relative: generate/due based on days relative to fiscal year start/end
    
    name = models.CharField(_('スケジュール名'), max_length=100)
    schedule_type = models.CharField(_('スケジュールタイプ'), max_length=20, choices=SCHEDULE_TYPE_CHOICES)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='task_template_schedules'
    )
    
    # 作成日設定
    # For monthly types, this is the day of month to create tasks
    # For fiscal_relative, this is days relative to fiscal_date_reference (+ or -)
    creation_day = models.IntegerField(_('タスク作成日'), null=True, blank=True)
    
    # 期限日設定
    # For monthly types, this is the day of month for the deadline
    # For fiscal_relative, this is days relative to fiscal_date_reference (+ or -)
    deadline_day = models.IntegerField(_('タスク期限日'), null=True, blank=True)
    
    # For fiscal_relative schedule type
    FISCAL_REFERENCE_CHOICES = (
        ('start_date', _('開始日基準')),
        ('end_date', _('終了日基準')),
    )
    fiscal_date_reference = models.CharField(
        _('決算日参照タイプ'), 
        max_length=20, 
        choices=FISCAL_REFERENCE_CHOICES,
        null=True, 
        blank=True
    )
    
    # For next_month deadline (e.g., generate on 25th, due on 10th of next month)
    deadline_next_month = models.BooleanField(_('期限日を翌月に設定'), default=False)
    
    # 繰り返し設定
    RECURRENCE_CHOICES = (
        ('monthly', _('毎月')),
        ('quarterly', _('四半期ごと')),
        ('yearly', _('毎年')),
        ('once', _('一度のみ')),
    )
    recurrence = models.CharField(_('繰り返し'), max_length=20, choices=RECURRENCE_CHOICES, default='monthly')
    
    # メタデータ
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    class Meta:
        verbose_name = _('task template schedule')
        verbose_name_plural = _('task template schedules')
        ordering = ['name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name


class ClientTaskTemplate(models.Model):
    """Client-specific task template settings."""
    
    # 基本情報
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='task_templates'
    )
    title = models.CharField(_('タイトル'), max_length=255)
    description = models.TextField(_('説明'), blank=True)
    
    # スケジュール設定
    schedule = models.ForeignKey(
        TaskTemplateSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_templates'
    )
    
    # タスク設定
    template_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='client_templates',
        help_text=_('Reference to the original template task')
    )
    category = models.ForeignKey(
        'tasks.TaskCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_templates'
    )
    estimated_hours = models.DecimalField(
        _('見積工数'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # 担当者設定
    worker = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_template_worker',
        verbose_name=_('作業担当者')
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_template_reviewer',
        verbose_name=_('レビュー担当者')
    )
    
    # 有効・無効
    is_active = models.BooleanField(_('有効'), default=True)
    
    # 表示順
    order = models.PositiveIntegerField(_('順序'), default=0)
    
    # メタデータ
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    # 最終タスク生成日
    last_generated_at = models.DateTimeField(_('最終タスク生成日時'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('client task template')
        verbose_name_plural = _('client task templates')
        ordering = ['order', 'title']
        unique_together = ('client', 'template_task')
    
    def __str__(self):
        return f"{self.client.name} - {self.title}"
    
    def generate_task(self, reference_date=None):
        """Generate a task based on this template"""
        from django.utils import timezone
        from tasks.models import Task
        
        if not self.is_active:
            return None
            
        if not reference_date:
            reference_date = timezone.now().date()
            
        # Calculate due date based on schedule settings
        due_date = self._calculate_due_date(reference_date)
        
        # Get default task status
        default_status = self.client.business.task_statuses.filter(name='未着手').first()
        
        # Create new task
        new_task = Task.objects.create(
            title=self.title,
            description=self.description,
            business=self.client.business,
            workspace=self.client.business.workspaces.first(),  # Get default workspace
            status=default_status,
            category=self.category,
            worker=self.worker,
            reviewer=self.reviewer,
            due_date=due_date,
            estimated_hours=self.estimated_hours,
            client=self.client,
            is_template=False
        )
        
        # Update last generated timestamp
        self.last_generated_at = timezone.now()
        self.save(update_fields=['last_generated_at'])
        
        return new_task
    
    def _calculate_due_date(self, reference_date):
        """Calculate the due date based on the schedule settings"""
        import calendar
        from datetime import datetime, timedelta
        from dateutil.relativedelta import relativedelta
        
        if not self.schedule:
            return None
            
        # 基準日付
        date = reference_date
        
        # スケジュールタイプに基づいて期限日を計算
        if self.schedule.schedule_type == 'monthly_start':
            # 月初作成＆当月5日締め切り（1日作成、5日締め切り）
            current_month = date.replace(day=1)  # 当月1日
            due_date = current_month.replace(day=5)  # 当月5日
            
        elif self.schedule.schedule_type == 'monthly_end':
            # 月末作成＆翌月10日締め切り（25日作成、翌月10日締め切り）
            if date.day >= 25:
                # 既に25日以降なら来月の10日が期限
                next_month = date + relativedelta(months=1)
                due_date = next_month.replace(day=10)
            else:
                # まだ25日前なら当月の10日が期限
                due_date = date.replace(day=10)
                
        elif self.schedule.schedule_type == 'fiscal_relative':
            # 決算日を基準にした相対日
            fiscal_year = self.client.fiscal_years.filter(is_current=True).first()
            if not fiscal_year:
                return None
                
            # 基準日を決定
            if self.schedule.fiscal_date_reference == 'start_date':
                reference = fiscal_year.start_date
            else:  # end_date
                reference = fiscal_year.end_date
                
            # 相対日数を計算
            due_date = reference + timedelta(days=self.schedule.deadline_day)
            
        elif self.schedule.schedule_type == 'custom':
            # カスタム設定
            # 実装は省略 - 必要に応じて拡張
            return None
            
        else:
            return None
            
        return due_date


class FiscalYear(models.Model):
    """Fiscal year period for a client."""
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='fiscal_years'
    )
    fiscal_period = models.PositiveIntegerField(_('期'))
    start_date = models.DateField(_('開始日'))
    end_date = models.DateField(_('終了日'))
    description = models.TextField(_('備考'), blank=True)
    is_current = models.BooleanField(_('現在の期'), default=False)
    is_locked = models.BooleanField(_('ロック'), default=False)
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    class Meta:
        verbose_name = _('fiscal year')
        verbose_name_plural = _('fiscal years')
        ordering = ['-fiscal_period']
        unique_together = ('client', 'fiscal_period')
    
    def __str__(self):
        return f"{self.client.name} - 第{self.fiscal_period}期"
    
    def save(self, *args, **kwargs):
        # If this fiscal year is marked as current, ensure no other fiscal years 
        # for this client are marked as current
        if self.is_current:
            FiscalYear.objects.filter(client=self.client, is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class TaxRuleHistory(models.Model):
    """源泉所得税・住民税のルール履歴を管理するモデル"""
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='tax_rule_histories'
    )
    
    # 税の種類
    TAX_TYPE_CHOICES = (
        ('income', _('源泉所得税')),
        ('residence', _('住民税')),
    )
    tax_type = models.CharField(_('税種別'), max_length=20, choices=TAX_TYPE_CHOICES)
    
    # ルールの種類
    RULE_TYPE_CHOICES = (
        ('principle', _('原則')),
        ('exception', _('特例')),
    )
    rule_type = models.CharField(_('ルール種別'), max_length=20, choices=RULE_TYPE_CHOICES)
    
    # 適用期間
    start_date = models.DateField(_('開始日'))
    end_date = models.DateField(_('終了日'), null=True, blank=True)
    
    # 備考
    description = models.TextField(_('備考'), blank=True)
    
    # メタデータ
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    class Meta:
        verbose_name = _('税ルール履歴')
        verbose_name_plural = _('税ルール履歴')
        ordering = ['-start_date']
        unique_together = ('client', 'tax_type', 'start_date')
    
    def __str__(self):
        rule_type_display = dict(self.RULE_TYPE_CHOICES).get(self.rule_type)
        tax_type_display = dict(self.TAX_TYPE_CHOICES).get(self.tax_type)
        return f"{self.client.name} - {tax_type_display} ({rule_type_display}) {self.start_date}"
    
    def is_current(self):
        """現在適用されているルールかどうかを判定"""
        today = timezone.now().date()
        return self.start_date <= today and (self.end_date is None or self.end_date >= today)
    
    def save(self, *args, **kwargs):
        """
        重複期間を回避するために、保存前に同一クライアント・税種別の他のルールの期間を調整
        """
        # 終了日が指定されていない場合は無期限と見なす
        if not self.end_date:
            # 将来の別ルールの開始日の前日を終了日とする
            future_rules = TaxRuleHistory.objects.filter(
                client=self.client,
                tax_type=self.tax_type,
                start_date__gt=self.start_date
            ).order_by('start_date')
            
            if future_rules.exists() and not self.pk:
                future_rule = future_rules.first()
                # 開始日の前日を終了日とする
                from datetime import timedelta
                self.end_date = future_rule.start_date - timedelta(days=1)
        
        # 同じクライアント・税種別で期間が重複する既存のルールを調整
        existing_rules = TaxRuleHistory.objects.filter(
            client=self.client,
            tax_type=self.tax_type
        ).exclude(pk=self.pk)
        
        for rule in existing_rules:
            # この新しいルールが既存のルールの期間内に開始する場合
            if rule.start_date <= self.start_date and (rule.end_date is None or rule.end_date >= self.start_date):
                # 既存ルールの終了日を新ルールの開始日の前日に設定
                from datetime import timedelta
                rule.end_date = self.start_date - timedelta(days=1)
                rule.save()
        
        super().save(*args, **kwargs)


# ClientTaskTemplate モデルは削除されました

# 新しく追加するモデル
class ContractService(models.Model):
    """契約サービスの種類を定義するモデル"""
    
    name = models.CharField(_('サービス名'), max_length=100)
    description = models.TextField(_('説明'), blank=True)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='contract_services'
    )
    is_custom = models.BooleanField(_('カスタムサービス'), default=False)
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    class Meta:
        verbose_name = _('契約サービス')
        verbose_name_plural = _('契約サービス')
        ordering = ['name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return self.name


class ClientContract(models.Model):
    """クライアントとの契約情報を管理するモデル"""
    
    # 基本情報
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    service = models.ForeignKey(
        ContractService,
        on_delete=models.CASCADE,
        related_name='client_contracts'
    )
    
    # 契約状態
    CONTRACT_STATUS_CHOICES = (
        ('active', _('契約中')),
        ('suspended', _('休止中')),
        ('terminated', _('終了')),
        ('preparing', _('準備中')),
    )
    status = models.CharField(_('契約状態'), max_length=20, choices=CONTRACT_STATUS_CHOICES, default='active')
    
    # 契約期間
    start_date = models.DateField(_('開始日'))
    end_date = models.DateField(_('終了日'), null=True, blank=True)
    
    # 報酬情報
    fee = models.DecimalField(_('報酬額'), max_digits=12, decimal_places=0, null=True, blank=True)
    FEE_CYCLE_CHOICES = (
        ('monthly', _('月次')),
        ('quarterly', _('四半期')),
        ('yearly', _('年次')),
        ('one_time', _('一時金')),
    )
    fee_cycle = models.CharField(_('報酬サイクル'), max_length=20, choices=FEE_CYCLE_CHOICES, default='monthly')
    
    # その他
    notes = models.TextField(_('備考'), blank=True)
    
    # カスタムサービス名（「その他」の場合に使用）
    custom_service_name = models.CharField(_('カスタムサービス名'), max_length=100, blank=True)
    
    # メタデータ
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    class Meta:
        verbose_name = _('クライアント契約')
        verbose_name_plural = _('クライアント契約')
        ordering = ['-start_date']
    
    def __str__(self):
        service_name = self.custom_service_name if self.service.is_custom and self.custom_service_name else self.service.name
        return f"{self.client.name} - {service_name}"
    
    def is_active(self):
        """現在アクティブな契約かどうかをチェック"""
        today = timezone.now().date()
        if self.status != 'active':
            return False
        if self.end_date and self.end_date < today:
            return False
        return True
