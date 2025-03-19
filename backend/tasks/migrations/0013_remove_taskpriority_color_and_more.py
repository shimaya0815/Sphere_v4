# Generated by Django 4.2.7 on 2025-03-14 00:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0012_taskschedule_templatechildtask'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='taskpriority',
            name='color',
        ),
        migrations.RemoveField(
            model_name='taskpriority',
            name='description',
        ),
        migrations.RemoveField(
            model_name='taskpriority',
            name='name',
        ),
        migrations.AlterField(
            model_name='taskpriority',
            name='priority_value',
            field=models.PositiveIntegerField(default=100, verbose_name='priority value'),
        ),
    ]
