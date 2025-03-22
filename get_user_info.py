#!/usr/bin/env python
# ユーザー、ビジネス、ワークスペース情報を取得する

# Djangoセットアップ
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sphere.settings')
django.setup()

# モデルをインポート
from users.models import User
from business.models import Business, Workspace

# ユーザー情報取得
user = User.objects.filter(email='shimaya@smy-cpa.com').first()
if user:
    print(f'User: {user.email} (ID: {user.id})')
    
    # ビジネス情報
    if user.business:
        print(f'Business: {user.business.name} (ID: {user.business.id})')
        
        # ワークスペース情報
        print('Workspaces:')
        for ws in user.business.workspaces.all():
            print(f'- {ws.name} (ID: {ws.id})')
    else:
        print('User has no business assigned')
else:
    print(f'User with email shimaya@smy-cpa.com not found')

# すべてのビジネスとワークスペースを表示
print("\nAll Businesses and Workspaces:")
for business in Business.objects.all():
    print(f'Business: {business.name} (ID: {business.id})')
    for workspace in business.workspaces.all():
        print(f'  - Workspace: {workspace.name} (ID: {workspace.id})') 