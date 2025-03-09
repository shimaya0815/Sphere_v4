from rest_framework import serializers
from .models import Client, FiscalYear, TaxRuleHistory, TaskTemplateSchedule, ClientTaskTemplate
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


class TaskTemplateScheduleSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    schedule_type_display = serializers.SerializerMethodField()
    recurrence_display = serializers.SerializerMethodField()
    fiscal_date_reference_display = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskTemplateSchedule
        fields = [
            'id', 'name', 'schedule_type', 'schedule_type_display', 'business', 'business_name', 
            'creation_day', 'deadline_day', 'fiscal_date_reference', 'fiscal_date_reference_display',
            'deadline_next_month', 'recurrence', 'recurrence_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['business', 'created_at', 'updated_at']
    
    def get_schedule_type_display(self, obj):
        return dict(TaskTemplateSchedule.SCHEDULE_TYPE_CHOICES).get(obj.schedule_type, '')
    
    def get_recurrence_display(self, obj):
        return dict(TaskTemplateSchedule.RECURRENCE_CHOICES).get(obj.recurrence, '')
    
    def get_fiscal_date_reference_display(self, obj):
        if obj.fiscal_date_reference:
            return dict(TaskTemplateSchedule.FISCAL_REFERENCE_CHOICES).get(obj.fiscal_date_reference, '')
        return None
        
    def validate(self, data):
        """Validate schedule settings based on schedule_type"""
        if 'schedule_type' in data:
            schedule_type = data['schedule_type']
            
            # Validate monthly schedules
            if schedule_type in ['monthly_start', 'monthly_end']:
                if 'creation_day' in data and (data['creation_day'] < 1 or data['creation_day'] > 31):
                    raise serializers.ValidationError({"creation_day": "作成日は1〜31の間で指定してください"})
                    
                if 'deadline_day' in data and (data['deadline_day'] < 1 or data['deadline_day'] > 31):
                    raise serializers.ValidationError({"deadline_day": "期限日は1〜31の間で指定してください"})
            
            # Validate fiscal_relative schedule
            elif schedule_type == 'fiscal_relative':
                if 'fiscal_date_reference' not in data:
                    raise serializers.ValidationError({"fiscal_date_reference": "決算日参照タイプは必須です"})
        
        return data


class ClientTaskTemplateSerializer(serializers.ModelSerializer):
    schedule_name = serializers.CharField(source='schedule.name', read_only=True)
    worker_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    priority_value = serializers.IntegerField(source='priority.priority_value', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    
    class Meta:
        model = ClientTaskTemplate
        fields = [
            'id', 'client', 'client_name', 'title', 'description', 'schedule', 'schedule_name',
            'template_task', 'category', 'category_name', 'priority', 'priority_value',
            'estimated_hours', 'worker', 'worker_name', 'reviewer', 'reviewer_name',
            'is_active', 'order', 'created_at', 'updated_at', 'last_generated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_generated_at']
    
    def get_worker_name(self, obj):
        if obj.worker:
            return obj.worker.get_full_name()
        return None
    
    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return obj.reviewer.get_full_name()
        return None


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