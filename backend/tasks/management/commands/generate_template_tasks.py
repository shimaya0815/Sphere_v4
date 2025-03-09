from django.core.management.base import BaseCommand
from django.utils import timezone
from clients.models import ClientTaskTemplate, TaskTemplateSchedule
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Generate tasks from client templates based on schedule settings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force generation of tasks regardless of schedule',
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        day_of_month = today.day
        force = options['force']
        
        self.stdout.write(f"Starting task generation for templates on {today}")
        
        # Get active templates
        templates = ClientTaskTemplate.objects.filter(is_active=True)
        total_templates = templates.count()
        generated_count = 0
        
        for template in templates:
            try:
                should_generate = False
                
                # Skip if template has no schedule
                if not template.schedule:
                    continue
                    
                # Check if should generate based on schedule type
                if template.schedule.schedule_type == 'monthly_start' and day_of_month == 1:
                    should_generate = True
                elif template.schedule.schedule_type == 'monthly_end' and day_of_month == 25:
                    should_generate = True
                elif template.schedule.schedule_type == 'fiscal_relative':
                    # For fiscal templates, we need additional logic to check if today is the generation day
                    fiscal_year = template.client.fiscal_years.filter(is_current=True).first()
                    if fiscal_year:
                        if template.schedule.fiscal_date_reference == 'start_date':
                            ref_date = fiscal_year.start_date
                        else:  # end_date
                            ref_date = fiscal_year.end_date
                            
                        # If creation_day is set, check if today is the generation day
                        if template.schedule.creation_day is not None:
                            generation_date = ref_date + timedelta(days=template.schedule.creation_day)
                            if today == generation_date.date():
                                should_generate = True
                
                # Handle recurrence pattern - skip if already generated based on recurrence
                if should_generate and template.last_generated_at:
                    if template.schedule.recurrence == 'monthly':
                        # Check if we already generated this month
                        last_month = template.last_generated_at.month
                        current_month = today.month
                        if last_month == current_month and template.last_generated_at.year == today.year:
                            should_generate = False
                            self.stdout.write(f"  Skipping template {template.id} ({template.title}) - already generated this month")
                    elif template.schedule.recurrence == 'quarterly':
                        # Check if we already generated this quarter
                        last_quarter = (template.last_generated_at.month - 1) // 3 + 1
                        current_quarter = (today.month - 1) // 3 + 1
                        if last_quarter == current_quarter and template.last_generated_at.year == today.year:
                            should_generate = False
                            self.stdout.write(f"  Skipping template {template.id} ({template.title}) - already generated this quarter")
                    elif template.schedule.recurrence == 'yearly':
                        # Check if we already generated this year
                        if template.last_generated_at.year == today.year:
                            should_generate = False
                            self.stdout.write(f"  Skipping template {template.id} ({template.title}) - already generated this year")
                    elif template.schedule.recurrence == 'once':
                        # Generate only once
                        should_generate = False
                        self.stdout.write(f"  Skipping template {template.id} ({template.title}) - one-time template already generated")
                
                # Force generation if requested
                if force:
                    should_generate = True
                
                # Generate task if conditions are met
                if should_generate:
                    # Prevent duplicate generation on the same day
                    if template.last_generated_at and template.last_generated_at.date() == today:
                        self.stdout.write(f"  Already generated task for template {template.id} ({template.title}) today")
                        continue
                        
                    task = template.generate_task()
                    if task:
                        generated_count += 1
                        self.stdout.write(f"  Generated task {task.id} from template {template.id} ({template.title})")
                    else:
                        self.stdout.write(self.style.WARNING(f"  Failed to generate task from template {template.id} ({template.title})"))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Error generating task from template {template.id}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f"Task generation complete. Generated {generated_count} tasks from {total_templates} templates."))