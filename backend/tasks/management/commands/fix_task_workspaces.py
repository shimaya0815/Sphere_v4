from django.core.management.base import BaseCommand
from tasks.models import Task
from business.models import Workspace

class Command(BaseCommand):
    help = 'Fix task workspaces that are null'

    def handle(self, *args, **options):
        # Get tasks with null workspace
        tasks = Task.objects.filter(workspace__isnull=True)
        count = 0
        
        self.stdout.write(f"Found {tasks.count()} tasks with null workspace")
        
        for task in tasks:
            # Get the default workspace for the business
            default_workspace = Workspace.objects.filter(business=task.business).first()
            
            if default_workspace:
                task.workspace = default_workspace
                task.save()
                count += 1
                self.stdout.write(f"Fixed workspace for task: {task.title}")
            else:
                self.stdout.write(self.style.WARNING(f"No workspace found for task: {task.title} in business {task.business.name}"))
        
        self.stdout.write(self.style.SUCCESS(f"Fixed {count} tasks"))