from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

User = get_user_model()


class Channel(models.Model):
    """Channel model for chat."""
    
    CHANNEL_TYPE_CHOICES = (
        ('public', _('Public')),
        ('private', _('Private')),
        ('direct', _('Direct Message')),
    )
    
    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    workspace = models.ForeignKey(
        'business.Workspace',
        on_delete=models.CASCADE,
        related_name='channels'
    )
    channel_type = models.CharField(_('type'), max_length=20, choices=CHANNEL_TYPE_CHOICES, default='public')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_channels'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # For direct messages
    is_direct_message = models.BooleanField(_('is direct message'), default=False)
    
    # Members (for private channels and DMs)
    members = models.ManyToManyField(
        User,
        related_name='channels',
        through='ChannelMembership'
    )
    
    class Meta:
        verbose_name = _('channel')
        verbose_name_plural = _('channels')
        ordering = ['name']
        unique_together = ('workspace', 'name')
    
    def __str__(self):
        return self.name


class ChannelMembership(models.Model):
    """Membership in a channel."""
    
    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='channel_memberships'
    )
    joined_at = models.DateTimeField(_('joined at'), auto_now_add=True)
    is_admin = models.BooleanField(_('is admin'), default=False)
    
    # Notification preferences
    muted = models.BooleanField(_('muted'), default=False)
    
    class Meta:
        verbose_name = _('channel membership')
        verbose_name_plural = _('channel memberships')
        unique_together = ('channel', 'user')
    
    def __str__(self):
        return f"{self.user.email} in {self.channel.name}"


class Message(models.Model):
    """Message model for chat."""
    
    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    content = models.TextField(_('content'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    is_edited = models.BooleanField(_('is edited'), default=False)
    
    # For threads
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='thread_messages'
    )
    
    # For @mentions
    mentioned_users = models.ManyToManyField(
        User,
        related_name='mentioned_in_messages',
        blank=True
    )
    
    class Meta:
        verbose_name = _('message')
        verbose_name_plural = _('messages')
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message by {self.user.email} in {self.channel.name}"


class MessageAttachment(models.Model):
    """Attachment for messages."""
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(_('file'), upload_to='chat_attachments/')
    filename = models.CharField(_('filename'), max_length=255)
    file_type = models.CharField(_('file type'), max_length=100)
    file_size = models.PositiveIntegerField(_('file size'))
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('message attachment')
        verbose_name_plural = _('message attachments')
        ordering = ['uploaded_at']
    
    def __str__(self):
        return self.filename


class MessageReaction(models.Model):
    """Reaction to a message."""
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_reactions'
    )
    emoji = models.CharField(_('emoji'), max_length=50)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('message reaction')
        verbose_name_plural = _('message reactions')
        unique_together = ('message', 'user', 'emoji')
    
    def __str__(self):
        return f"{self.emoji} by {self.user.email}"
