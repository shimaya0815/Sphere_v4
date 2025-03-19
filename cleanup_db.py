from django.contrib.auth import get_user_model
from business.models import Business, Workspace
from rest_framework.authtoken.models import Token

User = get_user_model()

# データベースクリーンアップ
print('データベースクリーンアップを開始...')

# すべてのトークンを削除
Token.objects.all().delete()
print('認証トークンを削除しました')

# すべてのワークスペースを削除
Workspace.objects.all().delete()
print('すべてのワークスペースを削除しました')

# すべてのビジネスを削除
Business.objects.all().delete()
print('すべてのビジネスを削除しました')

# すべてのユーザーを削除
User.objects.all().delete()
print('すべてのユーザーを削除しました')

# 新しい管理者ユーザーを作成
admin_user = User.objects.create_user(
    username='admin@example.com',
    email='admin@example.com', 
    password='adminpassword',
    first_name='Admin',
    last_name='User'
)
print(f'新しい管理者ユーザーを作成しました: {admin_user.email}')

# ビジネスを作成
business = Business.objects.create(
    name="Admin Business",
    owner=admin_user
)
admin_user.business = business
admin_user.save()
print(f'新しいビジネスを作成しました: {business.name}')

print('データベースクリーンアップと初期化が完了しました')
print('ログイン情報: メールアドレス=admin@example.com, パスワード=adminpassword') 