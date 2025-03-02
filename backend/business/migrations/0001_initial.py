# Generated by Django 4.2.7 on 2025-03-02 17:36

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Business',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, unique=True, verbose_name='name')),
                ('business_id', models.CharField(blank=True, max_length=50, unique=True, verbose_name='business ID')),
                ('description', models.TextField(blank=True, verbose_name='description')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='business_logos/')),
                ('address', models.TextField(blank=True, verbose_name='address')),
                ('phone', models.CharField(blank=True, max_length=20, verbose_name='phone')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='email')),
                ('website', models.URLField(blank=True, verbose_name='website')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
            ],
            options={
                'verbose_name': 'business',
                'verbose_name_plural': 'businesses',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Workspace',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='name')),
                ('description', models.TextField(blank=True, verbose_name='description')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workspaces', to='business.business')),
            ],
            options={
                'verbose_name': 'workspace',
                'verbose_name_plural': 'workspaces',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='BusinessInvitation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, verbose_name='email')),
                ('token', models.CharField(blank=True, max_length=100, unique=True, verbose_name='token')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined'), ('expired', 'Expired')], default='pending', max_length=20, verbose_name='status')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('expires_at', models.DateTimeField(verbose_name='expires at')),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invitations', to='business.business')),
            ],
            options={
                'verbose_name': 'business invitation',
                'verbose_name_plural': 'business invitations',
            },
        ),
    ]
