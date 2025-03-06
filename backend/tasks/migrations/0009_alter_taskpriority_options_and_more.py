# Generated by Django 4.2.7 on 2025-03-06 00:43

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('business', '0002_initial'),
        ('tasks', '0008_alter_taskpriority_priority_value'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='taskpriority',
            options={'ordering': ['priority_value'], 'verbose_name': 'task priority', 'verbose_name_plural': 'task priorities'},
        ),
        migrations.AlterUniqueTogether(
            name='taskpriority',
            unique_together={('business', 'priority_value')},
        ),
    ]
