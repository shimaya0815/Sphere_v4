from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

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
    
    # タスク設定
    some_task_flag = models.BooleanField(_('タスク設定フラグ'), default=False)
    
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
