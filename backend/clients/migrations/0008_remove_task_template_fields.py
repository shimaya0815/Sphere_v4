# Generated by Django 4.2.7 on 2025-03-08 08:10

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0007_taxrulehistory'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='client',
            name='task_template_type',
        ),
        migrations.RemoveField(
            model_name='client',
            name='task_template_usage',
        ),
    ]
