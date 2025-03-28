# Generated by Django 4.2.7 on 2025-03-27 01:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0005_alter_task_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='archived at'),
        ),
        migrations.AddField(
            model_name='task',
            name='is_archived',
            field=models.BooleanField(default=False, help_text='タスクがアーカイブされているかどうか', verbose_name='is archived'),
        ),
    ]
