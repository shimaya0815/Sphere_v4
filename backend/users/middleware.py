from django.db.models.signals import post_save
from django.contrib.auth import get_user_model
from .signals import create_default_channels
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class SignalInspectionMiddleware:
    """
    シグナルが期待通りに動作しているか確認し、必要に応じて手動でトリガーするミドルウェア
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # リクエスト処理前の処理
        
        # レスポンス取得
        response = self.get_response(request)
        
        # リクエスト処理後の処理
        # ユーザー作成エンドポイントへのPOSTリクエストだった場合
        if (request.method == 'POST' and 
            (request.path == '/auth/users/' or request.path == '/api/auth/users/')):
            
            # レスポンスが成功（201 Created）の場合
            if response.status_code == 201:
                # レスポンスから新しいユーザーIDを取得
                try:
                    user_data = response.data
                    user_id = user_data.get('id')
                    
                    if user_id:
                        logger.info(f"User created: {user_id}. Checking channels...")
                        
                        # ユーザーを取得
                        try:
                            user = User.objects.get(id=user_id)
                            
                            # シグナルハンドラを明示的に呼び出す
                            create_default_channels(sender=User, instance=user, created=True)
                            logger.info(f"Manual signal trigger for user {user.email}")
                        except User.DoesNotExist:
                            logger.error(f"User {user_id} not found in database")
                except Exception as e:
                    logger.error(f"Error in SignalInspectionMiddleware: {str(e)}")
        
        return response