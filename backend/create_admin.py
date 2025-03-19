from django.contrib.auth import get_user_model
from business.models import Business

User = get_user_model()

# 管理者ユーザーを作成
username = 'admin@example.com'
email = 'admin@example.com'
password = 'adminpassword'

# 既存のユーザーを確認
if User.objects.filter(email=email).exists():
    print(f'ユーザー {email} は既に存在します')
    user = User.objects.get(email=email)
else:
    # 新しい管理者ユーザーを作成
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        first_name='Admin',
        last_name='User'
    )
    print(f'管理者ユーザーが作成されました: {email}')

# ビジネスが無い場合は作成
if not user.business:
    business = Business.objects.create(
        name="Admin Business",
        owner=user
    )
    user.business = business
    user.save()
    print(f'ビジネスが作成されました: {business.name}')
else:
    print(f'ユーザーは既にビジネスに所属しています: {user.business.name}')

print('完了: ユーザー名=admin@example.com, パスワード=adminpassword') 