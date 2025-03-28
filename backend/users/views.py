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
            from tasks.models import TaskCategory, TaskStatus, Task
            from clients.models import TaskTemplateSchedule, ClientTaskTemplate
            # TaskCategory.create_defaults(business)  # カテゴリー作成を無効化
            TaskStatus.create_defaults(business)
            
            # デフォルトのタスクテンプレートを作成
            try:
                # デフォルトカテゴリの取得
                default_category = None  # デフォルトカテゴリを使用しない
                bookkeeping_category = None
                tax_category = None 
                insurance_category = None
                
                # 優先度は使用しない
                default_priority = None
                
                # ステータスの取得
                not_started_status = TaskStatus.objects.filter(business=business, name="未着手").first()
                
                # デフォルトのスケジュール作成
                schedules = {
                    "monthly": TaskTemplateSchedule.objects.create(
                        name="月次スケジュール",
                        schedule_type="monthly_start",
                        recurrence="monthly",
                        creation_day=1,
                        deadline_day=10,
                        business=business
                    ),
                    "quarterly": TaskTemplateSchedule.objects.create(
                        name="四半期スケジュール",
                        schedule_type="quarterly",
                        recurrence="quarterly",
                        creation_day=1,
                        deadline_day=15,
                        business=business
                    ),
                    "yearly": TaskTemplateSchedule.objects.create(
                        name="年次スケジュール",
                        schedule_type="yearly",
                        recurrence="yearly",
                        creation_day=1,
                        deadline_day=28,
                        business=business
                    )
                }
                
                # 各テンプレートの作成
                templates = [
                    # 顧問契約タスク
                    {
                        "name": "顧問契約タスク",
                        "description": "顧問契約に基づく月次の会計処理状況を確認するためのタスクです。",
                        "category": default_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 決算申告タスク
                    {
                        "name": "決算申告タスク",
                        "description": "決算期の法人税申告書作成・提出業務を行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["yearly"],
                        "recurrence_pattern": "yearly"
                    },
                    # 中間申告タスク
                    {
                        "name": "中間申告タスク",
                        "description": "中間申告書の作成・提出業務を行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["quarterly"],
                        "recurrence_pattern": "quarterly"
                    },
                    # 予定申告タスク
                    {
                        "name": "予定申告タスク",
                        "description": "予定申告書の作成・提出業務を行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["quarterly"],
                        "recurrence_pattern": "quarterly"
                    },
                    # 記帳代行業務
                    {
                        "name": "記帳代行業務",
                        "description": "月次の記帳代行を行うためのタスクです。",
                        "category": bookkeeping_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 給与計算業務
                    {
                        "name": "給与計算業務",
                        "description": "月次の給与計算業務を行うためのタスクです。",
                        "category": insurance_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 源泉所得税(原則)納付
                    {
                        "name": "源泉所得税(原則)納付",
                        "description": "毎月の源泉所得税（原則）の納付手続きを行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 源泉所得税(特例)納付
                    {
                        "name": "源泉所得税(特例)納付",
                        "description": "毎月の源泉所得税（特例）の納付手続きを行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 住民税(原則)納付
                    {
                        "name": "住民税(原則)納付",
                        "description": "従業員の住民税（原則）特別徴収の納付手続きを行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 住民税(特例)納付
                    {
                        "name": "住民税(特例)納付",
                        "description": "従業員の住民税（特例）特別徴収の納付手続きを行うためのタスクです。",
                        "category": tax_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # 社会保険手続き
                    {
                        "name": "社会保険手続き",
                        "description": "社会保険関連の各種手続きを行うためのタスクです。",
                        "category": insurance_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    },
                    # その他のタスク
                    {
                        "name": "その他のタスク",
                        "description": "その他の定型業務に関するタスクです。",
                        "category": default_category,
                        "schedule": schedules["monthly"],
                        "recurrence_pattern": "monthly"
                    }
                ]
                
                # ワークスペースの確認
                workspace = business.workspaces.first()
                
                # 一括でテンプレートを作成
                created_templates = []
                for template_config in templates:
                    try:
                        template = Task.objects.create(
                            title=template_config["name"],
                            description=template_config["description"],
                            business=business,
                            workspace=workspace,
                            is_template=True,
                            template_name=template_config["name"],
                            category=template_config["category"],
                            status=not_started_status,
                            recurrence_pattern=template_config["recurrence_pattern"]
                        )
                        created_templates.append(template)
                    except Exception as template_error:
                        logger.error(f"Error creating template {template_config['name']}: {str(template_error)}")
                
                logger.info(f"Created {len(created_templates)} default templates for business: {business.name}")
            except Exception as e:
                logger.error(f"Error creating default templates: {e}")
                import traceback
                traceback.print_exc()
                # エラーがあっても続行
                pass
            
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
    
    def get_queryset(self):
        # Users should only see other users in the same business
        if self.request.user.is_authenticated and self.request.user.business:
            return User.objects.filter(business=self.request.user.business)
        return User.objects.none()
    
    @action(detail=False, methods=['get'])
    def workers(self, request):
        """作業可能なユーザー（ワーカー）一覧を取得するエンドポイント"""
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def reviewers(self, request):
        """レビュー可能なユーザー一覧を取得するエンドポイント"""
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)
    
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
                        from tasks.models import TaskCategory, TaskStatus
                        TaskCategory.create_defaults(business)
                        TaskStatus.create_defaults(business)
                        
                        # デフォルトのタスクテンプレートを作成
                        try:
                            # デフォルトカテゴリの取得
                            default_category = None  # デフォルトカテゴリを使用しない
                            bookkeeping_category = None
                            tax_category = None 
                            insurance_category = None
                            
                            # 優先度は使用しない
                            default_priority = None
                            
                            # ステータスの取得
                            not_started_status = TaskStatus.objects.filter(business=business, name="未着手").first()
                            
                            # デフォルトのスケジュール作成
                            from tasks.models import TaskSchedule
                            schedules = {
                                "monthly_start": TaskSchedule.objects.create(
                                    name="月次スケジュール",
                                    business=business,
                                    schedule_type="monthly_start",
                                    recurrence="monthly",
                                    reference_date_type="execution_date",
                                    creation_date_offset=0,
                                    deadline_date_offset=5
                                ),
                                "fiscal": TaskSchedule.objects.create(
                                    name="決算スケジュール",
                                    business=business,
                                    schedule_type="fiscal_relative",
                                    recurrence="yearly",
                                    reference_date_type="fiscal_end",
                                    creation_date_offset=0,
                                    deadline_date_offset=60
                                ),
                                "monthly_end": TaskSchedule.objects.create(
                                    name="月末スケジュール",
                                    business=business,
                                    schedule_type="monthly_end",
                                    recurrence="monthly",
                                    reference_date_type="execution_date",
                                    creation_date_offset=0,
                                    deadline_date_offset=5
                                )
                            }
                            
                            # ワークスペースの確認
                            workspace = business.workspaces.first()
                            
                            # 各テンプレートの作成
                            templates = [
                                # 顧問契約タスク
                                {
                                    "name": "顧問契約タスク",
                                    "description": "顧問契約に基づく月次の会計処理状況を確認するためのタスクです。",
                                    "category": default_category,
                                    "schedule": schedules["monthly_start"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 決算申告タスク
                                {
                                    "name": "決算申告タスク",
                                    "description": "決算期の法人税申告書作成・提出業務を行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["fiscal"],
                                    "recurrence_pattern": "yearly"
                                },
                                # 中間申告タスク
                                {
                                    "name": "中間申告タスク",
                                    "description": "中間申告書の作成・提出業務を行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["fiscal"],
                                    "recurrence_pattern": "quarterly"
                                },
                                # 予定申告タスク
                                {
                                    "name": "予定申告タスク",
                                    "description": "予定申告書の作成・提出業務を行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["fiscal"],
                                    "recurrence_pattern": "quarterly"
                                },
                                # 記帳代行業務
                                {
                                    "name": "記帳代行業務",
                                    "description": "月次の記帳代行を行うためのタスクです。",
                                    "category": bookkeeping_category,
                                    "schedule": schedules["monthly_start"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 給与計算業務
                                {
                                    "name": "給与計算業務",
                                    "description": "月次の給与計算業務を行うためのタスクです。",
                                    "category": insurance_category,
                                    "schedule": schedules["monthly_end"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 源泉所得税(原則)納付
                                {
                                    "name": "源泉所得税(原則)納付",
                                    "description": "毎月の源泉所得税（原則）の納付手続きを行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["monthly_end"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 源泉所得税(特例)納付
                                {
                                    "name": "源泉所得税(特例)納付",
                                    "description": "毎月の源泉所得税（特例）の納付手続きを行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["monthly_end"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 住民税(原則)納付
                                {
                                    "name": "住民税(原則)納付",
                                    "description": "従業員の住民税（原則）特別徴収の納付手続きを行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["monthly_start"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 住民税(特例)納付
                                {
                                    "name": "住民税(特例)納付",
                                    "description": "従業員の住民税（特例）特別徴収の納付手続きを行うためのタスクです。",
                                    "category": tax_category,
                                    "schedule": schedules["monthly_start"],
                                    "recurrence_pattern": "monthly"
                                },
                                # 社会保険手続き
                                {
                                    "name": "社会保険手続き",
                                    "description": "社会保険関連の各種手続きを行うためのタスクです。",
                                    "category": insurance_category,
                                    "schedule": schedules["monthly_start"],
                                    "recurrence_pattern": "monthly"
                                },
                                # その他のタスク
                                {
                                    "name": "その他のタスク",
                                    "description": "その他の定型業務に関するタスクです。",
                                    "category": default_category,
                                    "schedule": schedules["monthly_start"],
                                    "recurrence_pattern": "monthly"
                                }
                            ]
                            
                            # 一括でテンプレートを作成
                            created_templates = []
                            for template_config in templates:
                                try:
                                    template = Task.objects.create(
                                        title=template_config["name"],
                                        description=template_config["description"],
                                        business=business,
                                        workspace=workspace,
                                        is_template=True,
                                        template_name=template_config["name"],
                                        category=template_config["category"],
                                        status=not_started_status,
                                        recurrence_pattern=template_config["recurrence_pattern"]
                                    )
                                    created_templates.append(template)
                                except Exception as template_error:
                                    logger.error(f"Error creating template {template_config['name']}: {str(template_error)}")
                            
                            logger.info(f"Created {len(created_templates)} default templates for business: {business.name}")
                        except Exception as e:
                            logger.error(f"Error creating default templates: {e}")
                            import traceback
                            traceback.print_exc()
                            # エラーがあっても続行
                            pass
                        
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
                        
                        # setup_templatesコマンドを実行してテンプレートを作成
                        try:
                            from django.core.management import call_command
                            logger.info(f"Running setup_templates command for business {business.id}")
                            call_command('setup_templates', business_id=business.id)
                            logger.info(f"Successfully ran setup_templates command for business {business.id}")
                        except Exception as setup_error:
                            logger.error(f"Error running setup_templates command: {str(setup_error)}")
                            # エラーがあっても続行
                            pass
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
                
                # ユーザーと関連オブジェクトを最新状態に再取得
                user.refresh_from_db()
                logger.info(f"USER CREATED SUCCESSFULLY: {user.email} (ID: {user.id})")
                if user.business:
                    logger.info(f"BUSINESS: {user.business.name} (ID: {user.business.id})")
                else:
                    logger.info("BUSINESS: No business assigned to user")
                
                # 同一トランザクション内でチャンネルを作成
                # チャンネルとメンバーシップの作成
                try:
                    from chat.models import Channel, ChannelMembership, Message
                    
                    # ワークスペースがすでに取得済みでない場合は取得
                    if not workspace:
                        workspace = user.business.workspaces.first()
                        
                    if workspace:
                        logger.info(f"WORKSPACE FOUND: {workspace.name} (ID: {workspace.id}, Business: {workspace.business.id})")
                        
                        # データベース内の既存チャンネルを確認
                        existing_channels = Channel.objects.filter(workspace=workspace).all()
                        logger.info(f"EXISTING CHANNELS: {[(c.name, c.id) for c in existing_channels]}")
                    else:
                        logger.error(f"NO WORKSPACE FOUND for user {user.email}")
                    
                    if workspace:
                        # すべてのチャンネル作成をチェック
                        channels_to_create = [
                            ('タスク通知', 'タスクのコメントやステータス変更の通知を受け取るチャンネルです'),
                            ('task', 'タスク関連の通知や議論のための共通チャンネルです'),
                            ('general', '全般的な会話のためのチャンネルです'),
                            ('random', '雑談のためのチャンネルです')
                        ]
                        
                        created_channels = []
                        
                        # シンプルに必要なチャンネルを作成
                        # generalチャンネルと同じロジックでtaskチャンネルも作成
                        for channel_name, description in channels_to_create:
                            try:
                                logger.info(f"Creating channel: {channel_name}")
                                
                                # get_or_createではname__iexactは使えないため、まず検索
                                existing_channel = Channel.objects.filter(
                                    workspace=workspace,
                                    name__iexact=channel_name
                                ).first()
                                
                                if existing_channel:
                                    channel = existing_channel
                                    created = False
                                    logger.info(f"Found existing channel: {channel.name} (ID: {channel.id})")
                                else:
                                    # 存在しなければ作成
                                    channel = Channel.objects.create(
                                        name=channel_name,
                                        description=description,
                                        workspace=workspace,
                                        channel_type='public',
                                        created_by=user,
                                        is_direct_message=False
                                    )
                                    created = True
                                    logger.info(f"Created new channel: {channel.name} (ID: {channel.id})")
                                
                                created_channels.append(channel)
                                
                                # ユーザーをチャンネルメンバーに追加
                                membership, membership_created = ChannelMembership.objects.get_or_create(
                                    channel=channel,
                                    user=user,
                                    defaults={
                                        'is_admin': True,
                                        'joined_at': timezone.now(),
                                        'last_read_at': timezone.now()
                                    }
                                )
                                
                                if membership_created:
                                    logger.info(f"Added user to channel: {channel.name}")
                                else:
                                    logger.info(f"User already a member of channel: {channel.name}")
                                    
                            except Exception as e:
                                logger.error(f"Error creating channel {channel_name}: {str(e)}")
                                # エラーがあっても次のチャンネル処理を続行
                        
                        # ウェルカムメッセージの送信（チャンネルが作成されていれば）
                        # 作成されたチャンネルをログに記録（詳細版）
                        logger.info(f"CREATED CHANNELS SUMMARY: {[c.name for c in created_channels]}")
                        logger.info(f"DETAILED CHANNELS: {[(c.name, c.id, c.workspace_id) for c in created_channels]}")
                        
                        # 最終的なデータベースの状態を確認
                        final_channels = Channel.objects.filter(workspace=workspace).all()
                        logger.info(f"FINAL DB CHANNELS: {[(c.name, c.id) for c in final_channels]}")
                        
                        # generalチャンネルにウェルカムメッセージを送信（独立したトランザクション）
                        with transaction.atomic():
                            try:
                                general_channel = next((c for c in created_channels if c.name.lower() == 'general'), None)
                                if general_channel:
                                    # ログを詳細に出力
                                    logger.info(f"Sending welcome message to general channel (ID: {general_channel.id})")
                                    
                                    Message.objects.create(
                                        channel=general_channel,
                                        user=user,
                                        content=f"👋 {user.get_full_name() or user.email}さん、Sphereへようこそ！"
                                    )
                                    logger.info(f"Added welcome message to general channel")
                                else:
                                    logger.warning("General channel not found for welcome message")
                            except Exception as msg_error:
                                logger.error(f"Error creating welcome message in general channel: {str(msg_error)}")
                        
                        # taskチャンネルにウェルカムメッセージを送信（独立したトランザクション）
                        with transaction.atomic():
                            try:
                                task_channel = next((c for c in created_channels if c.name.lower() == 'task'), None)
                                if task_channel:
                                    # ログを詳細に出力
                                    logger.info(f"Sending welcome message to task channel (ID: {task_channel.id})")
                                    
                                    Message.objects.create(
                                        channel=task_channel,
                                        user=user,
                                        content=f"🔔 このチャンネルではタスクの通知やタスクに関する議論を行います。{user.get_full_name() or user.email}さん、タスク管理をお楽しみください！"
                                    )
                                    logger.info(f"Added welcome message to task channel")
                                else:
                                    logger.warning("Task channel not found for welcome message")
                            except Exception as msg_error:
                                logger.error(f"Error creating welcome message in task channel: {str(msg_error)}")
                    else:
                        logger.error(f"No workspace found for user {user.email} to create channels")
                
                except Exception as e:
                    logger.error(f"Error creating channels for user: {str(e)}")
                    # チャンネル作成に失敗してもユーザー作成は続行する
            
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
