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
        
    def apply_default_templates(self, fiscal_year=None):
        """
        Apply default templates to this client.
        This creates tasks based on default templates (templates marked as default).
        
        Args:
            fiscal_year: Optional FiscalYear object. If provided, fiscal-related templates will use this.
            
        Returns:
            List of tasks created
        """
        from tasks.models import Task
        
        created_tasks = []
        
        # Get client templates that are active
        client_templates = self.task_templates.filter(is_active=True)
        
        # If no client-specific templates, use default templates
        if not client_templates.exists():
            # Use business-wide default templates
            templates = Task.objects.filter(
                business=self.business,
                is_template=True
            ).exclude(
                client_templates__client=self  # Exclude those already customized by this client
            )
            
            # Create default client templates from business templates
            for template in templates:
                client_template = ClientTaskTemplate.objects.create(
                    client=self,
                    template=template,
                    title=template.title,
                    description=template.description,
                    deadline_type='calendar_days',
                    deadline_value=30,  # Default 30 days
                    category=template.category,
                    priority=template.priority,
                    estimated_hours=template.estimated_hours
                )
                task = client_template.create_task(fiscal_year=fiscal_year)
                created_tasks.append(task)
        else:
            # Use client's custom templates
            for client_template in client_templates:
                task = client_template.create_task(fiscal_year=fiscal_year)
                created_tasks.append(task)
                
        return created_tasks
        
    def copy_default_templates(self):
        """
        Copy default templates to client custom templates.
        This allows the client to customize the templates.
        
        Returns:
            List of ClientTaskTemplate objects created
        """
        from tasks.models import Task
        
        # Get default templates from business
        default_templates = Task.objects.filter(
            business=self.business, 
            is_template=True
        )
        
        created_templates = []
        
        for template in default_templates:
            # Check if this client already has this template
            existing = ClientTaskTemplate.objects.filter(
                client=self,
                template=template
            ).first()
            
            if not existing:
                # Create a new client template based on the default
                client_template = ClientTaskTemplate.objects.create(
                    client=self,
                    template=template,
                    title=template.title,
                    description=template.description,
                    deadline_type='calendar_days',
                    deadline_value=30,  # Default 30 days
                    category=template.category,
                    priority=template.priority,
                    estimated_hours=template.estimated_hours
                )
                created_templates.append(client_template)
                
        return created_templates


class ClientCheckSetting(models.Model):
    """Client check settings for different task types."""
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='check_settings'
    )
    
    CHECK_TYPE_CHOICES = (
        ('monthly', _('月次チェック')),
        ('bookkeeping', _('記帳代行')),
        ('tax_return', _('税務申告書作成')),
        ('withholding_tax', _('源泉所得税対応')),
        ('other', _('その他')),
    )
    check_type = models.CharField(_('チェック種別'), max_length=50, choices=CHECK_TYPE_CHOICES)
    is_enabled = models.BooleanField(_('有効フラグ'), default=True)
    
    CYCLE_CHOICES = (
        ('monthly', _('毎月')),
        ('yearly', _('毎年')),
    )
    cycle = models.CharField(_('サイクル'), max_length=20, choices=CYCLE_CHOICES, default='monthly')
    create_day = models.PositiveIntegerField(_('作成日'), validators=[MinValueValidator(1), MaxValueValidator(31)])
    template = models.ForeignKey(
        'tasks.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_check_settings'
    )
    
    class Meta:
        verbose_name = _('client check setting')
        verbose_name_plural = _('client check settings')
        unique_together = ('client', 'check_type')
    
    def __str__(self):
        return f"{self.client.name} - {self.get_check_type_display()}"


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


class ClientTaskTemplate(models.Model):
    """Client-specific task template settings."""
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='task_templates'
    )
    template = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='client_templates',
        help_text=_('Reference to the original template task')
    )
    
    # カスタマイズフィールド
    title = models.CharField(_('タイトル'), max_length=255)
    description = models.TextField(_('説明'), blank=True)
    
    # 期限設定
    DEADLINE_TYPE_CHOICES = (
        ('business_days', _('営業日')),
        ('calendar_days', _('カレンダー日付')),
        ('fiscal_date', _('決算日基準')),
    )
    deadline_type = models.CharField(
        _('期限タイプ'),
        max_length=20,
        choices=DEADLINE_TYPE_CHOICES,
        default='calendar_days'
    )
    deadline_value = models.IntegerField(
        _('期限値'),
        help_text=_('営業日/カレンダー日の場合は日数、決算日基準の場合は±日数'),
        default=0
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
    
    # カテゴリ・優先度
    category = models.ForeignKey(
        'tasks.TaskCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_templates'
    )
    priority = models.ForeignKey(
        'tasks.TaskPriority',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='client_templates'
    )
    
    # 工数見積もり
    estimated_hours = models.DecimalField(
        _('見積工数'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # 管理用フィールド
    is_active = models.BooleanField(_('有効'), default=True)
    order = models.PositiveIntegerField(_('順序'), default=0)
    created_at = models.DateTimeField(_('作成日時'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新日時'), auto_now=True)
    
    class Meta:
        verbose_name = _('client task template')
        verbose_name_plural = _('client task templates')
        ordering = ['order', 'title']
        unique_together = ('client', 'template')
    
    def __str__(self):
        return f"{self.client.name} - {self.title}"
        
    def create_task(self, fiscal_year=None):
        """
        Create a task based on this client template
        
        Args:
            fiscal_year: Optional FiscalYear object. If provided and deadline_type is fiscal_date,
                        the due date will be calculated based on this fiscal year's end date.
        
        Returns:
            Task object that was created
        """
        from datetime import timedelta
        from django.utils import timezone
        from tasks.models import Task
        
        # Calculate due date
        due_date = None
        if self.deadline_type == 'business_days':
            # Simple implementation - just add weekdays, ignoring holidays
            current_date = timezone.now().date()
            days_added = 0
            while days_added < self.deadline_value:
                current_date += timedelta(days=1)
                if current_date.weekday() < 5:  # Monday to Friday
                    days_added += 1
            due_date = current_date
        elif self.deadline_type == 'calendar_days':
            due_date = timezone.now().date() + timedelta(days=self.deadline_value)
        elif self.deadline_type == 'fiscal_date' and fiscal_year:
            # Calculate based on fiscal year end date
            due_date = fiscal_year.end_date + timedelta(days=self.deadline_value)
        
        # Create the task
        task = Task.objects.create(
            title=self.title,
            description=self.description,
            business=self.client.business,
            workspace=self.template.workspace,
            status=self.template.status,
            priority=self.priority or self.template.priority,
            category=self.category or self.template.category,
            creator=self.template.creator,
            worker=self.worker,
            reviewer=self.reviewer,
            client=self.client,
            is_fiscal_task=True if fiscal_year else False,
            fiscal_year=fiscal_year,
            due_date=due_date,
            estimated_hours=self.estimated_hours or self.template.estimated_hours,
        )
        
        return task
