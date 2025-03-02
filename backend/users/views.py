from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from .models import UserPreferences
from .serializers import UserSerializer, UserPreferencesSerializer
from django.contrib.auth import get_user_model
from business.models import Business

User = get_user_model()


class BusinessAuthTokenView(APIView):
    """Custom token authentication requiring business ID."""
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        from .serializers import AuthTokenWithBusinessSerializer
        
        # Validate with our custom serializer
        serializer = AuthTokenWithBusinessSerializer(data=request.data,
                                             context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Get the business_id from validated data
        business_id = serializer.validated_data.get('business_id')
        
        # Try to find the business
        try:
            business = Business.objects.get(business_id=business_id)
        except Business.DoesNotExist:
            return Response(
                {'error': 'Invalid business ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
                
        # Check if the user belongs to this business
        if user.business and user.business != business:
            return Response(
                {'error': 'User is not authorized for this business'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # If user has no business yet, assign them to this business
        if not user.business:
            user.business = business
            user.save()
        
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
