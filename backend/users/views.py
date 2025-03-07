from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model, authenticate
from django.utils.text import slugify
import uuid
import logging
from .models import UserPreferences
from .serializers import UserSerializer, UserPreferencesSerializer
from business.models import Business

# ロギング設定
logger = logging.getLogger(__name__)

User = get_user_model()


class BusinessAuthTokenView(APIView):
    """Custom token authentication requiring business ID."""
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        from .serializers import AuthTokenWithBusinessSerializer
        
        # Validate credentials
        email = request.data.get('email')
        password = request.data.get('password')
        business_id = request.data.get('business_id')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Authenticate user
        user = authenticate(request=request, username=email, password=password)
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # ビジネスID処理
        if business_id:
            # 特定のビジネスIDが指定された場合
            try:
                business = Business.objects.get(business_id=business_id)
                
                # 指定されたビジネスに所属しているか確認
                if user.business and user.business != business:
                    return Response(
                        {'error': 'User is not authorized for this business'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
                # ユーザーがビジネスに所属していない場合は割り当て
                if not user.business:
                    user.business = business
                    user.save()
            except Business.DoesNotExist:
                return Response(
                    {'error': 'Invalid business ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif not user.business:
            # ビジネスIDが指定されておらず、ユーザーにビジネスがない場合はデフォルトビジネスを作成
            business_name = f"{user.get_full_name()}'s Business"
            if not business_name.strip():
                business_name = f"{user.email.split('@')[0]}'s Business"
                
            business = Business.objects.create(
                name=business_name,
                owner=user
            )
            
            user.business = business
            user.save()
            
            # ビジネスを作成した後、タスク関連のメタデータを作成
            from tasks.models import TaskCategory, TaskStatus, TaskPriority
            TaskCategory.create_defaults(business)
            TaskStatus.create_defaults(business)
            TaskPriority.create_defaults(business)
            
            # Ensure workspace exists
            from business.models import Workspace
            if not business.workspaces.exists():
                try:
                    Workspace.objects.create(
                        business=business,
                        name="Default Workspace",
                        description="Default workspace created automatically"
                    )
                    print(f"Created workspace for business in login view: {business.name}")
                except Exception as e:
                    print(f"Error creating workspace: {e}")
                    # 既に存在する場合は無視して続行する
                    pass
        
        # Generate the token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'business_id': user.business.business_id
        })


class UserMeView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating the current user's profile."""
    
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for user profiles."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


class UserPreferencesViewSet(viewsets.ModelViewSet):
    """ViewSet for user preferences."""
    
    queryset = UserPreferences.objects.all()
    serializer_class = UserPreferencesSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserPreferences.objects.filter(user=self.request.user)
    
    
class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for user profiles."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users should only see other users in the same business
        user = self.request.user
        if user.business:
            return User.objects.filter(business=user.business)
        return User.objects.filter(pk=user.pk)  # Only see themselves if no business
    
    @action(detail=False, methods=['patch'])
    def me(self, request):
        """Update the authenticated user's profile."""
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def upload_image(self, request):
        """Upload a profile image for the current user."""
        user = request.user
        
        if 'profile_image' not in request.FILES:
            return Response(
                {'error': 'No profile image provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user.profile_image = request.FILES['profile_image']
        user.save()
        
        return Response({'status': 'profile image updated'})


class UserCreateView(APIView):
    """
    ユーザー登録用のカスタムビュー。
    Djoserのデフォルトユーザー作成をオーバーライドして、チャンネル作成を確実に行う。
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        from djoser.serializers import UserCreateSerializer
        from django.db import transaction
        
        # Djoserシリアライザーを使用してユーザーを作成
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            # トランザクションを使用して、すべてのデータベース操作を確実にコミットする
            with transaction.atomic():
                user = serializer.save()
                logger.info(f"User created successfully: {user.email}")
                
                # ビジネスとワークスペースが設定されているか確認
                workspace = None
                if not user.business:
                    # ビジネスがなければ新規作成
                    business_name = f"{user.get_full_name()}'s Business"
                    if not business_name.strip():
                        business_name = f"{user.email.split('@')[0]}'s Business"
                        
                    # ビジネスとワークスペースの作成を直接SQLで実行して確実に作成
                    try:
                        business = Business.objects.create(
                            name=business_name,
                            owner=user
                        )
                        
                        user.business = business
                        user.save()
                        logger.info(f"Created business for user: {business.name} (ID: {business.id})")
                        
                        # タスク関連のメタデータを作成
                        from tasks.models import TaskCategory, TaskStatus, TaskPriority
                        TaskCategory.create_defaults(business)
                        TaskStatus.create_defaults(business)
                        TaskPriority.create_defaults(business)
                        
                        # ビジネスのsave()メソッドでワークスペースが自動作成されるはずだが、
                        # 念のため明示的に作成も試みる
                        from business.models import Workspace
                        
                        # 既存のワークスペースを確認
                        existing_workspace = Workspace.objects.filter(business=business).first()
                        if existing_workspace:
                            workspace = existing_workspace
                            logger.info(f"Found existing workspace: {workspace.name} (ID: {workspace.id})")
                        else:
                            # 明示的に作成
                            workspace = Workspace.objects.create(
                                business=business,
                                name="Default Workspace",
                                description="Default workspace created automatically"
                            )
                            logger.info(f"Created workspace for business: {workspace.name} (ID: {workspace.id})")
                    except Exception as e:
                        logger.error(f"Error creating business or workspace: {str(e)}")
                        # エラーが発生した場合は、SQL直接実行を試みる
                        try:
                            from django.db import connection
                            
                            # ビジネスを作成
                            with connection.cursor() as cursor:
                                cursor.execute(
                                    """
                                    INSERT INTO business_business 
                                    (name, description, owner_id, created_at, updated_at, business_id, address, phone, email, website) 
                                    VALUES (%s, %s, %s, NOW(), NOW(), %s, '', '', '', '')
                                    RETURNING id
                                    """,
                                    [business_name, "", user.id, f"{slugify(business_name)}-{uuid.uuid4().hex[:8]}"]
                                )
                                business_id = cursor.fetchone()[0]
                                
                                # ユーザーにビジネスを関連付け
                                cursor.execute(
                                    """
                                    UPDATE users_user
                                    SET business_id = %s
                                    WHERE id = %s
                                    """,
                                    [business_id, user.id]
                                )
                                
                                # ワークスペースを作成
                                cursor.execute(
                                    """
                                    INSERT INTO business_workspace
                                    (business_id, name, description, created_at, updated_at)
                                    VALUES (%s, %s, %s, NOW(), NOW())
                                    RETURNING id
                                    """,
                                    [business_id, "Default Workspace", "Default workspace created automatically"]
                                )
                                workspace_id = cursor.fetchone()[0]
                            
                            # エンティティを再取得
                            business = Business.objects.get(id=business_id)
                            workspace = Workspace.objects.get(id=workspace_id)
                            logger.info(f"Created business and workspace via SQL: Business ID {business_id}, Workspace ID {workspace_id}")
                        except Exception as sql_error:
                            logger.error(f"SQL error creating business or workspace: {str(sql_error)}")
                            raise
                
                # トランザクションをコミットし、明示的にデータベースに永続化
                transaction.commit()
                
                # ユーザーと関連オブジェクトを最新状態に再取得
                user.refresh_from_db()
            
            # トランザクション外でチャンネルを作成（前のトランザクションが確実にコミットされた後）
            try:
                from chat.models import Channel, ChannelMembership
                from users.signals import create_default_channels
                
                # 明示的にシグナルハンドラーを呼び出す
                create_default_channels(sender=User, instance=user, created=True)
                logger.info(f"Explicitly called create_default_channels for user: {user.email}")
                
                # ワークスペースがすでに取得済みでない場合は取得
                if not workspace:
                    workspace = user.business.workspaces.first()
                    
                logger.info(f"Found workspace to create channels: {workspace.id if workspace else 'None'}")
                
                if workspace:
                    # すべてのチャンネル作成をチェック
                    channels_to_create = [
                        ('タスク通知', 'タスクのコメントやステータス変更の通知を受け取るチャンネルです'),
                        ('task', 'タスク関連の通知や議論のための共通チャンネルです'),
                        ('general', '全般的な会話のためのチャンネルです'),
                        ('random', '雑談のためのチャンネルです')
                    ]
                    
                    # 各チャンネルについてORMでの作成と直接SQLでの作成の両方を用意
                    for channel_name, description in channels_to_create:
                        try:
                            # 既存のチャンネルを検索（大文字小文字を区別せず）
                            # まずは完全一致で
                            channel = Channel.objects.filter(
                                workspace=workspace,
                                name=channel_name
                            ).first()
                            
                            # 次に大文字小文字を区別せずに検索
                            if not channel:
                                channel = Channel.objects.filter(
                                    workspace=workspace
                                ).filter(name__iexact=channel_name).first()
                            
                            # レコードがあるかログに記録
                            if channel:
                                logger.info(f"Found existing channel: {channel.name} (ID: {channel.id})")
                            else:
                                logger.info(f"No existing channel found with name '{channel_name}'")
                                
                            # なければ作成
                            if not channel:
                                try:
                                    # まずORMで試す
                                    logger.info(f"Creating channel via ORM: {channel_name}")
                                    channel = Channel.objects.create(
                                        name=channel_name,
                                        description=description,
                                        workspace=workspace,
                                        channel_type='public',
                                        created_by=user
                                    )
                                    logger.info(f"Created channel via ORM: {channel.name} (ID: {channel.id})")
                                except Exception as orm_error:
                                    logger.error(f"ORM error creating channel '{channel_name}': {str(orm_error)}")
                                    
                                    # SQLで直接作成を試みる
                                    try:
                                        from django.db import connection
                                        logger.info(f"Creating channel via SQL: {channel_name}")
                                        
                                        with connection.cursor() as cursor:
                                            cursor.execute(
                                                """
                                                INSERT INTO chat_channel 
                                                (name, description, workspace_id, channel_type, created_by_id, created_at, updated_at, is_direct_message) 
                                                VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), false)
                                                RETURNING id
                                                """,
                                                [channel_name, description, workspace.id, 'public', user.id]
                                            )
                                            channel_id = cursor.fetchone()[0]
                                        
                                        # 作成したチャンネルを取得
                                        channel = Channel.objects.get(id=channel_id)
                                        logger.info(f"Created channel via SQL: {channel.name} (ID: {channel.id})")
                                    except Exception as sql_error:
                                        logger.error(f"SQL error creating channel '{channel_name}': {str(sql_error)}")
                                        continue  # 次のチャンネルへ
                            
                            # ユーザーをメンバーに追加
                            if channel:
                                try:
                                    membership, created = ChannelMembership.objects.get_or_create(
                                        channel=channel,
                                        user=user,
                                        defaults={
                                            'is_admin': user == channel.created_by
                                        }
                                    )
                                    if created:
                                        logger.info(f"Added user to channel: {channel.name}")
                                    else:
                                        logger.info(f"User already a member of channel: {channel.name}")
                                except Exception as membership_error:
                                    logger.error(f"Error adding user to channel '{channel_name}': {str(membership_error)}")
                                    
                                    # SQLで直接メンバーシップを作成
                                    try:
                                        from django.db import connection
                                        with connection.cursor() as cursor:
                                            cursor.execute(
                                                """
                                                INSERT INTO chat_channelmembership (channel_id, user_id, is_admin, muted, joined_at, last_read_at)
                                                VALUES (%s, %s, true, false, NOW(), NOW())
                                                ON CONFLICT (channel_id, user_id) DO NOTHING
                                                """,
                                                [channel.id, user.id]
                                            )
                                        logger.info(f"Added user to channel via SQL: {channel.name}")
                                    except Exception as sql_mem_error:
                                        logger.error(f"SQL error adding user to channel '{channel_name}': {str(sql_mem_error)}")
                        except Exception as channel_error:
                            logger.error(f"Unexpected error processing channel '{channel_name}': {str(channel_error)}")
                else:
                    logger.error(f"No workspace found for user {user.email} to create channels")
            
            except Exception as e:
                logger.error(f"Error creating channels for user: {str(e)}")
            
            # 成功レスポンスを返す
            return Response(
                {"email": user.email, "id": user.id},
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@action(detail=False, methods=['post'])
def upload_image(self, request):
    """Upload a profile image for the current user."""
    user = request.user
    
    if 'profile_image' not in request.FILES:
        return Response(
            {'error': 'No image provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    user.profile_image = request.FILES['profile_image']
    user.save()
    
    return Response({'status': 'profile image updated'})


class UserPreferencesViewSet(viewsets.ModelViewSet):
    """ViewSet for user preferences."""
    
    queryset = UserPreferences.objects.all()
    serializer_class = UserPreferencesSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserPreferences.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Retrieve or update the authenticated user's preferences."""
        try:
            preferences = UserPreferences.objects.get(user=request.user)
        except UserPreferences.DoesNotExist:
            preferences = UserPreferences.objects.create(user=request.user)
        
        if request.method == 'PATCH':
            serializer = self.get_serializer(preferences, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)
