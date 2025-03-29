from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserManager(BaseUserManager):
    """Manager for custom user model."""
    
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        """Create, save and return a new user."""
        # username引数が渡されても、emailフィールドが必須
        if not email:
            if username and '@' in username:
                email = username  # usernameがメールアドレスの形式なら、emailとして使用
            else:
                raise ValueError(_('The Email field must be set'))
        
        # usernameが設定されていなければemailをusernameとして使用
        if not username:
            username = email
            
        email = self.normalize_email(email)
        
        # ここで重要な変更：usernameをextra_fieldsから削除
        if 'username' in extra_fields:
            del extra_fields['username']
            
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        
        return user
    
    def create_superuser(self, username=None, email=None, password=None, **extra_fields):
        """Create and return a new superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        # usernameがなければemail、どちらもなければエラー
        if not username and not email:
            raise ValueError(_('Either username or email must be set'))
        elif not email and username:
            # usernameからemailを推測（メールアドレス形式なら）
            if '@' in username:
                email = username
            else:
                email = f"{username}@example.com"  # ダミーのメールアドレス
        
        # usernameをextra_fieldsから削除して、create_userを呼び出す
        if 'username' in extra_fields:
            del extra_fields['username']
            
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model that uses email instead of username."""
    
    # ManyToManyFieldsの関連名を上書きしてDjangoの標準Userモデルとの衝突を防ぐ
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name='user_custom_set',  # 関連名を変更
        related_query_name='user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='user_custom_set',  # 関連名を変更
        related_query_name='user',
    )
    
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    
    # Business fields
    business = models.ForeignKey(
        'business.Business', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='users'
    )
    position = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name if self.first_name else self.email.split('@')[0]


class UserPreferences(models.Model):
    """User preferences for application settings."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=20, default='light')
    notification_email = models.BooleanField(default=True)
    notification_web = models.BooleanField(default=True)
    language = models.CharField(max_length=10, default='en')
    task_filters = models.JSONField(null=True, blank=True, default=dict)
    saved_filters = models.JSONField(null=True, blank=True, default=dict)
    saved_task_filters = models.JSONField(null=True, blank=True, default=dict)
    default_task_filter = models.CharField(max_length=255, blank=True, default='')
    
    class Meta:
        verbose_name = _('user preference')
        verbose_name_plural = _('user preferences')
    
    def __str__(self):
        return f"Preferences for {self.user.email}"


@receiver(post_save, sender=User)
def create_user_preferences(sender, instance, created, **kwargs):
    """ユーザー作成時に設定を作成"""
    if created:
        UserPreferences.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def add_user_to_channels(sender, instance, created, **kwargs):
    """ユーザー作成時に、所属するビジネスのデフォルトワークスペースのチャンネルに追加する"""
    if created and instance.business:
        try:
            # ビジネスのデフォルトワークスペース（最初のワークスペース）を探す
            from business.models import Workspace
            default_workspace = Workspace.objects.filter(
                business=instance.business
            ).first()
            
            if default_workspace:
                try:
                    # タスクチャンネルを作成または既存のチャンネルを取得
                    from chat.models import Channel, ChannelMembership
                    
                    # 「タスク」という名前のチャンネルを探す
                    task_channel = Channel.objects.filter(
                        workspace=default_workspace,
                        name='タスク'
                    ).first()
                    
                    # なければ作成
                    if not task_channel:
                        task_channel = Channel.objects.create(
                            name='タスク',
                            description='タスク関連の通知チャンネルです',
                            workspace=default_workspace,
                            channel_type='public',
                            created_by=instance
                        )
                    
                    # 「全体」という名前のチャンネルを探す
                    general_channel = Channel.objects.filter(
                        workspace=default_workspace,
                        name='全体'
                    ).first()
                    
                    # なければ作成
                    if not general_channel:
                        general_channel = Channel.objects.create(
                            name='全体',
                            description='全体向けのチャンネルです',
                            workspace=default_workspace,
                            channel_type='public',
                            created_by=instance
                        )
                    
                    # ユーザーをチャンネルに追加
                    channels = [task_channel, general_channel]
                    for channel in channels:
                        # すでにメンバーでなければ追加
                        if not ChannelMembership.objects.filter(
                            channel=channel,
                            user=instance
                        ).exists():
                            ChannelMembership.objects.create(
                                channel=channel,
                                user=instance
                            )
                    
                    print(f"Added user {instance.email} to default channels")
                except Exception as e:
                    print(f"Error adding user to channels: {str(e)}")
        except Exception as e:
            print(f"Error setting up channels for user: {str(e)}")
