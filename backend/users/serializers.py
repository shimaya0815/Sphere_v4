from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from .models import UserPreferences

User = get_user_model()


class AuthTokenWithBusinessSerializer(serializers.Serializer):
    """Custom Auth Token Serializer with business ID support."""
    email = serializers.EmailField(label="Email")
    password = serializers.CharField(
        label="Password", 
        style={'input_type': 'password'},
        trim_whitespace=False
    )
    business_id = serializers.CharField(label="Business ID")

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        business_id = attrs.get('business_id')

        if email and password:
            user = authenticate(request=self.context.get('request'),
                               username=email, password=password)

            if not user:
                msg = 'Unable to log in with provided credentials.'
                raise serializers.ValidationError(msg, code='authorization')
        else:
            msg = 'Must include "email" and "password".'
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs


class UserCreateSerializer(BaseUserCreateSerializer):
    """Serializer for creating user objects."""

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone', 'position')


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user preferences."""

    class Meta:
        model = UserPreferences
        fields = ('theme', 'notification_email', 'notification_web', 'language')


class UserSerializer(BaseUserSerializer):
    """Serializer for user objects."""
    
    full_name = serializers.SerializerMethodField()
    preferences = UserPreferencesSerializer(read_only=True)
    
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 
                 'phone', 'position', 'profile_image', 'business', 'preferences')
        read_only_fields = ('id', 'email')
    
    def get_full_name(self, obj):
        return obj.get_full_name()