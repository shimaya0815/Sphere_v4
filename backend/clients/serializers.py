from rest_framework import serializers
from .models import Client, ClientContract, ClientNote
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']


class ClientSerializer(serializers.ModelSerializer):
    account_manager_name = serializers.CharField(source='account_manager.get_full_name', read_only=True)
    
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'business', 'address', 'phone', 'email', 'website', 'industry', 'notes',
            'contact_name', 'contact_position', 'contact_email', 'contact_phone',
            'fiscal_year_end', 'tax_id', 'account_manager', 'account_manager_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['business', 'created_at', 'updated_at']


class ClientContractSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    
    class Meta:
        model = ClientContract
        fields = [
            'id', 'client', 'client_name', 'title', 'description', 'status',
            'start_date', 'end_date', 'value', 'currency', 'billing_cycle',
            'document', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']


class ClientNoteSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    
    class Meta:
        model = ClientNote
        fields = [
            'id', 'client', 'client_name', 'user', 'user_name', 'title', 
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']