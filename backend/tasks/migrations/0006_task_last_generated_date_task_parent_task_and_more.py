# Generated by Django 4.2.7 on 2025-03-05 01:36

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0005_alter_task_workspace'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='last_generated_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='last generated date'),
        ),
        migrations.AddField(
            model_name='task',
            name='parent_task',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recurring_instances', to='tasks.task'),
        ),
        migrations.AddField(
            model_name='task',
            name='recurrence_frequency',
            field=models.PositiveIntegerField(default=1, verbose_name='recurrence frequency'),
        ),
    ]
