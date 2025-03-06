from django.core.management.base import BaseCommand
from business.models import Business, Workspace


class Command(BaseCommand):
    help = 'Ensures that all businesses have at least one workspace'

    def handle(self, *args, **options):
        businesses = Business.objects.all()
        count = 0
        
        self.stdout.write(f"Checking {businesses.count()} businesses...")
        
        for business in businesses:
            if not business.workspaces.exists():
                workspace, created = Workspace.objects.get_or_create(
                    business=business,
                    name="Default Workspace",
                    defaults={"description": "Default workspace created automatically"}
                )
                
                if created:
                    count += 1
                    self.stdout.write(f"Created workspace for business: {business.name}")
        
        self.stdout.write(self.style.SUCCESS(f"Created {count} workspaces for businesses that didn't have one"))