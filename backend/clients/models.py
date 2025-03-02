from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

User = get_user_model()


class Client(models.Model):
    """Client model for organizations/companies that are clients."""
    
    name = models.CharField(_('name'), max_length=255)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='clients'
    )
    address = models.TextField(_('address'), blank=True)
    phone = models.CharField(_('phone'), max_length=20, blank=True)
    email = models.EmailField(_('email'), blank=True)
    website = models.URLField(_('website'), blank=True)
    industry = models.CharField(_('industry'), max_length=100, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    
    # Client representative
    contact_name = models.CharField(_('contact name'), max_length=255, blank=True)
    contact_position = models.CharField(_('contact position'), max_length=100, blank=True)
    contact_email = models.EmailField(_('contact email'), blank=True)
    contact_phone = models.CharField(_('contact phone'), max_length=20, blank=True)
    
    # Client fiscal settings
    fiscal_year_end = models.DateField(_('fiscal year end'), null=True, blank=True)
    tax_id = models.CharField(_('tax ID'), max_length=50, blank=True)
    
    # Account manager
    account_manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_clients'
    )
    
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


class ClientContract(models.Model):
    """Contract with a client."""
    
    STATUS_CHOICES = (
        ('draft', _('Draft')),
        ('sent', _('Sent')),
        ('signed', _('Signed')),
        ('active', _('Active')),
        ('expired', _('Expired')),
        ('terminated', _('Terminated')),
    )
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    status = models.CharField(_('status'), max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Contract dates
    start_date = models.DateField(_('start date'))
    end_date = models.DateField(_('end date'), null=True, blank=True)
    
    # Contract value
    value = models.DecimalField(_('value'), max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(_('currency'), max_length=3, default='USD')
    
    # Billing
    billing_cycle = models.CharField(
        _('billing cycle'),
        max_length=20,
        choices=(
            ('one-time', _('One-time')),
            ('monthly', _('Monthly')),
            ('quarterly', _('Quarterly')),
            ('annually', _('Annually')),
        ),
        default='monthly'
    )
    
    # Contract document
    document = models.FileField(_('document'), upload_to='client_contracts/', null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_contracts'
    )
    
    class Meta:
        verbose_name = _('client contract')
        verbose_name_plural = _('client contracts')
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.title} - {self.client.name}"


class ClientNote(models.Model):
    """Notes for a client."""
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='client_notes'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='client_notes'
    )
    title = models.CharField(_('title'), max_length=255)
    content = models.TextField(_('content'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('client note')
        verbose_name_plural = _('client notes')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
