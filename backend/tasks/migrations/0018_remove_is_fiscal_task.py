# Generated by Django 4.2.7 on 2025-03-16 10:47

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0017_task_consider_holidays_alter_task_business_day_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='is_fiscal_task',
        ),
    ]
