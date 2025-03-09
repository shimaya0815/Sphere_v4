from rest_framework import serializers
from .models import Client, FiscalYear, TaxRuleHistory
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']


class ClientSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    contract_status_display = serializers.SerializerMethodField()
    corporate_individual_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id', 'user', 'user_name', 'business', 'contract_status', 'contract_status_display',
            'client_code', 'name', 'corporate_individual', 'corporate_individual_display',
            'corporate_number', 'postal_code', 'prefecture', 'city', 'street_address', 'building',
            'phone', 'email', 'capital', 'establishment_date', 'tax_eTax_ID', 'tax_eLTAX_ID',
            'tax_taxpayer_confirmation_number', 'tax_invoice_no', 'tax_invoice_registration_date',
            'salary_closing_day', 'salary_payment_month', 'salary_payment_day',
            'attendance_management_software', 'fiscal_year', 'fiscal_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['business', 'created_at', 'updated_at']
    
    def get_contract_status_display(self, obj):
        return dict(Client.CONTRACT_STATUS_CHOICES).get(obj.contract_status, '')
    
    def get_corporate_individual_display(self, obj):
        return dict(Client.ENTITY_CHOICES).get(obj.corporate_individual, '')
    
    def validate_client_code(self, value):
        """
        Check that client_code is unique.
        """
        if Client.objects.filter(client_code=value).exists():
            if self.instance and self.instance.client_code == value:
                return value
            raise serializers.ValidationError("このクライアントコードは既に使用されています。")
        return value


# ClientCheckSettingSerializer was removed and merged into ClientTaskTemplateSerializer


class FiscalYearSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    duration_days = serializers.SerializerMethodField()
    
    class Meta:
        model = FiscalYear
        fields = [
            'id', 'client', 'client_name', 'fiscal_period', 'start_date', 'end_date',
            'description', 'is_current', 'is_locked', 'duration_days', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_duration_days(self, obj):
        """Calculate the number of days in this fiscal year."""
        if obj.start_date and obj.end_date:
            return (obj.end_date - obj.start_date).days + 1
        return None
    
    def validate(self, data):
        """Validate that end_date is after start_date."""
        if 'start_date' in data and 'end_date' in data:
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError({"end_date": "終了日は開始日より後である必要があります。"})
        
        # If updating an existing instance
        if self.instance:
            # Check if trying to modify a locked fiscal year
            if self.instance.is_locked and ('start_date' in data or 'end_date' in data or 'fiscal_period' in data):
                raise serializers.ValidationError("ロックされた決算期は編集できません。")
                
        return data


# ClientTaskTemplateSerializer は削除されました
        
        
class TaxRuleHistorySerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    tax_type_display = serializers.SerializerMethodField()
    rule_type_display = serializers.SerializerMethodField()
    is_current = serializers.SerializerMethodField()
    end_date = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = TaxRuleHistory
        fields = [
            'id', 'client', 'client_name', 'tax_type', 'tax_type_display',
            'rule_type', 'rule_type_display', 'start_date', 'end_date',
            'description', 'is_current', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_tax_type_display(self, obj):
        return dict(TaxRuleHistory.TAX_TYPE_CHOICES).get(obj.tax_type, '')
    
    def get_rule_type_display(self, obj):
        return dict(TaxRuleHistory.RULE_TYPE_CHOICES).get(obj.rule_type, '')
        
    def get_is_current(self, obj):
        today = timezone.now().date()
        return obj.start_date <= today and (obj.end_date is None or obj.end_date >= today)
        
    def validate(self, data):
        """
        開始日と終了日の検証
        """
        if 'start_date' in data and 'end_date' in data and data['end_date']:
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError({"end_date": "終了日は開始日より後である必要があります。"})
        
        return data