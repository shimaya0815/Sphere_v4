from django.contrib.auth import get_user_model
from tasks.models import Task, TaskCategory, TaskStatus
from business.models import Business, Workspace
from rest_framework.authtoken.models import Token
from chat.models import Channel, ChannelMembership, Message

User = get_user_model()

# メッセージの削除
print('削除中: メッセージ')
Message.objects.all().delete()

# チャンネルメンバーシップの削除
print('削除中: チャンネルメンバーシップ')
ChannelMembership.objects.all().delete()

# チャンネルの削除
print('削除中: チャンネル')
Channel.objects.all().delete()

# ユーザートークンの削除
print('削除中: トークン')
Token.objects.all().delete()

# タスク関連データの削除
print('削除中: タスク')
Task.objects.all().delete()
print('削除中: タスクカテゴリ')
TaskCategory.objects.all().delete()
print('削除中: タスクステータス')
TaskStatus.objects.all().delete()

# ワークスペースの削除
print('削除中: ワークスペース')
Workspace.objects.all().delete()

# ビジネスの削除
print('削除中: ビジネス')
Business.objects.all().delete()

# ユーザーの削除 (最後に削除)
print('削除中: ユーザー')
User.objects.all().delete()

print('すべてのデータが削除されました') 