from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Business, Workspace

@receiver(post_save, sender=Business)
def ensure_workspace_exists(sender, instance, created, **kwargs):
    """Ensure that a business has at least one workspace."""
    if not instance.workspaces.exists():
        try:
            workspace = Workspace.objects.create(
                business=instance,
                name="Default Workspace",
                description="Default workspace created automatically"
            )
            print(f"Created default workspace for business: {instance.name} via signal")
        except Exception as e:
            print(f"Error creating workspace in signal: {e}")