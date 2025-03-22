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
            from tasks.models import TaskCategory, TaskStatus, TaskPriority, Task
            from clients.models import TaskTemplateSchedule, ClientTaskTemplate
            TaskCategory.create_defaults(business)
            TaskStatus.create_defaults(business)
            
            # デフォルトのタスクテンプレートを作成
            try:
                # デフォルトカテゴリの取得
                default_category = TaskCategory.objects.filter(business=business).first()
                bookkeeping_category = TaskCategory.objects.filter(business=business, name="記帳代行").first() or default_category
                tax_category = TaskCategory.objects.filter(business=business, name="決算・申告").first() or default_category
                insurance_category = TaskCategory.objects.filter(business=business, name="給与計算").first() or default_category
                
                # 優先度の取得
                default_priority = TaskPriority.objects.filter(business=business).first()
                
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
                
                # 各サービス用のテンプレートを作成
                template_configs = [
                    {
                        "title": "月次チェック",
                        "description": "毎月実施する標準チェック項目",
                        "category": default_category,
                        "schedule": schedules["monthly"],
                        "child_tasks": [
                            {"title": "帳簿・台帳チェック", "description": "月次の帳簿確認と台帳との整合性チェック"},
                            {"title": "残高確認", "description": "現金・預金・売掛金等の残高確認"},
                            {"title": "請求書確認", "description": "未払い・未収の請求書確認"}
                        ]
                    },
                    {
                        "title": "記帳代行",
                        "description": "月次の記帳代行業務",
                        "category": bookkeeping_category,
                        "schedule": schedules["monthly"],
                        "child_tasks": [
                            {"title": "仕訳入力", "description": "月次の仕訳入力作業"},
                            {"title": "経費精算", "description": "経費精算処理と確認"},
                            {"title": "試算表作成", "description": "月次試算表の作成と確認"}
                        ]
                    },
                    {
                        "title": "税務申告書作成",
                        "description": "確定申告業務",
                        "category": tax_category,
                        "schedule": schedules["yearly"],
                        "child_tasks": [
                            {"title": "決算準備", "description": "期末決算の準備作業と資料収集"},
                            {"title": "決算書作成", "description": "確定決算書の作成"},
                            {"title": "申告書作成", "description": "確定申告書の作成と提出"}
                        ]
                    },
                    {
                        "title": "源泉所得税",
                        "description": "源泉所得税の納付手続き",
                        "category": tax_category,
                        "schedule": schedules["monthly"],
                        "child_tasks": [
                            {"title": "源泉税計算", "description": "源泉所得税の計算"},
                            {"title": "納付書作成", "description": "源泉所得税の納付書作成"},
                            {"title": "納付", "description": "源泉所得税の納付手続き"}
                        ]
                    },
                    {
                        "title": "住民税対応",
                        "description": "従業員の住民税納付手続き",
                        "category": tax_category,
                        "schedule": schedules["monthly"],
                        "child_tasks": [
                            {"title": "住民税通知確認", "description": "住民税決定通知書の確認"},
                            {"title": "給与天引き設定", "description": "給与システムへの住民税設定"},
                            {"title": "納付手続き", "description": "住民税の納付手続き"}
                        ]
                    },
                    {
                        "title": "社会保険対応",
                        "description": "社会保険関連手続き",
                        "category": insurance_category,
                        "schedule": schedules["monthly"],
                        "child_tasks": [
                            {"title": "算定基礎確認", "description": "社会保険の算定基礎の確認"},
                            {"title": "保険料計算", "description": "社会保険料の計算"},
                            {"title": "書類提出", "description": "社会保険関連書類の提出"}
                        ]
                    }
                ]
                
                # テンプレートを作成
                for config in template_configs:
                    # メインテンプレートを作成
                    template = Task.objects.create(
                        title=config["title"],
                        description=config["description"],
                        business=business,
                        is_template=True,
                        category=config["category"],
                        priority=default_priority,
                        status=not_started_status
                    )
                    
                    # 内包タスクを作成
                    for index, child_task in enumerate(config.get("child_tasks", [])):
                        from tasks.models import TemplateChildTask
                        TemplateChildTask.objects.create(
                            parent_template=template,
                            title=child_task["title"],
                            description=child_task["description"],
                            order=index,
                            business=business,
                            category=config["category"],
                            priority=default_priority,
                            status=not_started_status
                        )
                    
                    # クライアント向けテンプレート設定用のデータも作成
                    from clients.models import ClientTaskTemplate
                    ClientTaskTemplate.objects.create(
                        title=config["title"],
                        description=config["description"],
                        template_task=template,
                        schedule=config["schedule"],
                        is_active=True,
                        category=config["category"],
                        priority=default_priority
                    )
                
                print(f"Default task templates created for business: {business.name}")
            except Exception as e:
                print(f"Error creating default templates: {e}")
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
                        from tasks.models import TaskCategory, TaskStatus, TaskPriority
                        TaskCategory.create_defaults(business)
                        TaskStatus.create_defaults(business)
                        
                        # デフォルトのタスクテンプレートを作成
                        try:
                            # デフォルトカテゴリの取得
                            default_category = TaskCategory.objects.filter(business=business).first()
                            bookkeeping_category = TaskCategory.objects.filter(business=business, name="記帳代行").first() or default_category
                            tax_category = TaskCategory.objects.filter(business=business, name="決算・申告").first() or default_category
                            insurance_category = TaskCategory.objects.filter(business=business, name="給与計算").first() or default_category
                            
                            # 優先度の取得
                            default_priority = TaskPriority.objects.filter(business=business).first()
                            
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
                                # 月次処理チェック
                                {
                                    "name": "月次処理チェック",
                                    "description": "毎月の会計処理状況を確認します。",
                                    "category": default_category,
                                    "schedule": schedules["monthly_start"],
                                    "child_tasks": [
                                        {"title": "帳簿確認", "description": "帳簿の確認と更新", "order": 1},
                                        {"title": "残高確認", "description": "残高の確認と更新", "order": 2},
                                        {"title": "請求書確認", "description": "請求書の確認と発行", "order": 3}
                                    ]
                                },
                                # 記帳代行作業
                                {
                                    "name": "記帳代行作業",
                                    "description": "月次の記帳代行業務を行います。",
                                    "category": bookkeeping_category,
                                    "schedule": schedules["monthly_start"],
                                    "child_tasks": [
                                        {"title": "領収書整理", "description": "領収書の整理と分類", "order": 1},
                                        {"title": "仕訳入力", "description": "会計データの仕訳入力", "order": 2},
                                        {"title": "月次レポート", "description": "月次レポートの作成", "order": 3}
                                    ]
                                },
                                # 決算・法人税申告業務
                                {
                                    "name": "決算・法人税申告業務",
                                    "description": "決算期の法人税申告書作成業務を行います。",
                                    "category": tax_category,
                                    "schedule": schedules["fiscal"],
                                    "child_tasks": [
                                        {"title": "決算整理", "description": "決算整理仕訳の作成", "order": 1},
                                        {"title": "決算書作成", "description": "決算書の作成", "order": 2},
                                        {"title": "申告書作成", "description": "法人税申告書の作成", "order": 3}
                                    ]
                                },
                                # 源泉所得税納付業務
                                {
                                    "name": "源泉所得税納付業務",
                                    "description": "毎月の源泉所得税の納付手続きを行います。",
                                    "category": tax_category,
                                    "schedule": schedules["monthly_end"],
                                    "child_tasks": [
                                        {"title": "源泉税計算", "description": "源泉所得税の計算", "order": 1},
                                        {"title": "納付書作成", "description": "納付書の作成", "order": 2},
                                        {"title": "納付手続き", "description": "納付手続きの実施", "order": 3}
                                    ]
                                },
                                # 住民税納付業務
                                {
                                    "name": "住民税納付業務",
                                    "description": "従業員の住民税特別徴収の納付手続きを行います。",
                                    "category": tax_category,
                                    "schedule": schedules["monthly_start"],
                                    "child_tasks": [
                                        {"title": "住民税通知確認", "description": "住民税通知書の確認", "order": 1},
                                        {"title": "給与天引き設定", "description": "給与システムへの反映", "order": 2},
                                        {"title": "納付手続き", "description": "納付手続きの実施", "order": 3}
                                    ]
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
                                        priority=default_priority,
                                        status=not_started_status
                                    )
                                    created_templates.append(template)
                                    
                                    # 内包タスクを作成
                                    for task_data in template_config["child_tasks"]:
                                        from tasks.models import TemplateChildTask
                                        TemplateChildTask.objects.create(
                                            parent_template=template,
                                            title=task_data["title"],
                                            description=task_data["description"],
                                            order=task_data["order"],
                                            business=business,
                                            category=template_config["category"],
                                            priority=default_priority,
                                            status=not_started_status
                                        )
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
