# Generated by Django 4.2.7 on 2025-03-03 04:45

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0004_alter_client_client_code_and_more'),
        ('tasks', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='fiscal_year',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tasks', to='clients.fiscalyear'),
        ),
        migrations.AddField(
            model_name='task',
            name='is_fiscal_task',
            field=models.BooleanField(default=False, verbose_name='is fiscal year task'),
        ),
    ]
