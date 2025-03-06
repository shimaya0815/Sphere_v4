from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from clients.models import Client
from django.test import override_settings

User = get_user_model()

# テスト用にhotsヘッダーチェックをスキップする
@override_settings(ALLOWED_HOSTS=['*'])
def test_client_creation():
    user = User.objects.first()
    if not user:
        print("No users found")
        return
        
    client = APIClient()
    client.force_authenticate(user=user)
    
    # クライアント作成のリクエスト
    response = client.post('/api/clients/', {'name': 'Test Client'}, format='json')
    
    print(f"Status code: {response.status_code}")
    print(f"Response content: {response.content.decode()}")
    
    return response

result = test_client_creation()
