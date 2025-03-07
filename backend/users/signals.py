from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
import logging

# ロギング設定
logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=User)
def create_default_channels(sender, instance, created, **kwargs):
    """
    新規ユーザー作成時にデフォルトチャンネルを自動作成する機能

    注意: このシグナルは無効化されています。
    UserCreateViewでチャンネル作成処理を一元化しているため、
    シグナルでのチャンネル作成は行わず、重複作成を防止しています。
    """
    # UserCreateView で明示的にチャンネル作成を行うため、シグナルでは作成しない
    logger.info(f"Signal handler called but bypassed for {instance.email}")
    return