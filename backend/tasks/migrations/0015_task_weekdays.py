# Generated by Django 4.2.7 on 2025-03-15 23:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0014_task_weekday'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='weekdays',
            field=models.CharField(blank=True, max_length=20, null=True, verbose_name='weekdays for weekly recurrence'),
        ),
    ]
