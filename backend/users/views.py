from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model, authenticate
from .models import UserPreferences
from .serializers import UserSerializer, UserPreferencesSerializer
from business.models import Business

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
                Workspace.objects.create(
                    business=business,
                    name="Default Workspace",
                    description="Default workspace created automatically"
                )
                print(f"Created workspace for business in login view: {business.name}")
        
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
                {'error': 'No image provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.profile_image = request.FILES['profile_image']
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
