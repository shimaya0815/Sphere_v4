# Generated by Django 4.2.7 on 2025-03-22 10:59

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0012_merge_0010_contractservice_clientcontract_0011_tasktemplateschedule_clienttasktemplate'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='clienttasktemplate',
            name='priority',
        ),
    ]
