from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class WikiPage(models.Model):
    """Wiki page model."""
    
    title = models.CharField(_('title'), max_length=255)
    slug = models.SlugField(_('slug'), max_length=255, blank=True)
    content = models.TextField(_('content'), blank=True)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='wiki_pages'
    )
    
    # Page hierarchy
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )
    order = models.PositiveIntegerField(_('order'), default=0)
    
    # Metadata
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_wiki_pages'
    )
    last_editor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='last_edited_wiki_pages'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # Page settings
    is_published = models.BooleanField(_('is published'), default=True)
    
    class Meta:
        verbose_name = _('wiki page')
        verbose_name_plural = _('wiki pages')
        ordering = ['parent__id', 'order', 'title']
        unique_together = ('business', 'slug')
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        
        # Create a new version when content changes
        if self.pk:
            try:
                old_page = WikiPage.objects.get(pk=self.pk)
                if old_page.content != self.content:
                    WikiPageVersion.objects.create(
                        page=self,
                        content=old_page.content,
                        editor=self.last_editor
                    )
            except WikiPage.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)


class WikiPageVersion(models.Model):
    """Version history for wiki pages."""
    
    page = models.ForeignKey(
        WikiPage,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    content = models.TextField(_('content'))
    editor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='wiki_page_edits'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('wiki page version')
        verbose_name_plural = _('wiki page versions')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Version of {self.page.title} at {self.created_at}"


class WikiAttachment(models.Model):
    """Attachment for wiki pages."""
    
    page = models.ForeignKey(
        WikiPage,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(_('file'), upload_to='wiki_attachments/')
    filename = models.CharField(_('filename'), max_length=255)
    file_type = models.CharField(_('file type'), max_length=100)
    file_size = models.PositiveIntegerField(_('file size'))
    uploader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='wiki_attachments'
    )
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('wiki attachment')
        verbose_name_plural = _('wiki attachments')
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.filename
