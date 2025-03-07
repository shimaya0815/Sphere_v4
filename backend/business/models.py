from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify
import uuid


class Business(models.Model):
    """Business/organization model."""
    
    name = models.CharField(_('name'), max_length=255, unique=True)
    business_id = models.CharField(_('business ID'), max_length=50, unique=True, blank=True)
    description = models.TextField(_('description'), blank=True)
    logo = models.ImageField(upload_to='business_logos/', blank=True, null=True)
    owner = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='owned_businesses'
    )
    address = models.TextField(_('address'), blank=True)
    phone = models.CharField(_('phone'), max_length=20, blank=True)
    email = models.EmailField(_('email'), blank=True)
    website = models.URLField(_('website'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('business')
        verbose_name_plural = _('businesses')
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.business_id:
            # Generate a unique business ID if not provided
            slug = slugify(self.name)
            unique_id = str(uuid.uuid4())[:8]
            self.business_id = f"{slug}-{unique_id}"
        
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Create default workspace if this is a new business or no workspaces exist
        if is_new or not self.workspaces.exists():
            from django.db import transaction
            import logging
            logger = logging.getLogger(__name__)
            
            # トランザクションを使用して確実にコミットを行う
            with transaction.atomic():
                try:
                    # トランザクション内のクエリキャッシュをクリアするために再取得
                    refreshed_business = Business.objects.get(pk=self.pk)
                    if refreshed_business.workspaces.exists():
                        logger.info(f"WORKSPACE ALREADY EXISTS for business: {self.name}")
                        workspace = refreshed_business.workspaces.first()
                        logger.info(f"EXISTING WORKSPACE: {workspace.name} (ID: {workspace.id})")
                        return
                    
                    workspace = Workspace.objects.create(
                        business=self,
                        name="デフォルト",
                        description="自動作成されたデフォルトワークスペース"
                    )
                    logger.info(f"CREATED WORKSPACE: {workspace.name} (ID: {workspace.id}) for business: {self.name}")
                    
                    # 明示的にコミット
                    transaction.commit()
                    
                    # デフォルトチャンネルの作成
                    try:
                        from chat.models import Channel
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        
                        # ビジネスオーナーを取得
                        owner = self.owner
                        
                        if owner and workspace:
                            # 必須チャンネルを作成
                            task_channel, created = Channel.objects.get_or_create(
                                workspace=workspace,
                                name="task",
                                defaults={
                                    'description': "タスク関連の通知や議論のための共通チャンネルです",
                                    'channel_type': 'public',
                                    'created_by': owner,
                                    'is_direct_message': False
                                }
                            )
                            logger.info(f"BUSINESS SAVE: TASK CHANNEL {'CREATED' if created else 'EXISTS'}: {task_channel.id}")
                    except Exception as channel_error:
                        logger.error(f"Error creating default channels in business save: {str(channel_error)}")
                    
                except Exception as e:
                    logger.error(f"Error creating default workspace: {e}")
                    # すでに存在する場合はエラーを無視して続行


class Workspace(models.Model):
    """Workspace model within a business."""
    
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='workspaces'
    )
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('workspace')
        verbose_name_plural = _('workspaces')
        ordering = ['name']
        unique_together = ('business', 'name')
    
    def __str__(self):
        return f"{self.name} ({self.business.name})"


class BusinessInvitation(models.Model):
    """Invitation to join a business."""
    
    STATUS_CHOICES = (
        ('pending', _('Pending')),
        ('accepted', _('Accepted')),
        ('declined', _('Declined')),
        ('expired', _('Expired')),
    )
    
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    email = models.EmailField(_('email'))
    inviter = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    token = models.CharField(_('token'), max_length=100, unique=True, blank=True)
    status = models.CharField(_('status'), max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    expires_at = models.DateTimeField(_('expires at'))
    
    class Meta:
        verbose_name = _('business invitation')
        verbose_name_plural = _('business invitations')
        unique_together = ('business', 'email')
    
    def __str__(self):
        return f"Invitation to {self.email} for {self.business.name}"
    
    def save(self, *args, **kwargs):
        if not self.token:
            # Generate a unique token for the invitation
            self.token = str(uuid.uuid4())
        
        super().save(*args, **kwargs)
