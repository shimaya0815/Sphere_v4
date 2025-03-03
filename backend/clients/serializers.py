from rest_framework import serializers
from .models import Client, ClientCheckSetting, FiscalYear
from django.contrib.auth import get_user_model

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
            'attendance_management_software', 'fiscal_year', 'fiscal_date', 'some_task_flag',
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


class ClientCheckSettingSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    check_type_display = serializers.SerializerMethodField()
    cycle_display = serializers.SerializerMethodField()
    template_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = ClientCheckSetting
        fields = [
            'id', 'client', 'client_name', 'check_type', 'check_type_display',
            'is_enabled', 'cycle', 'cycle_display', 'create_day', 'template', 'template_id'
        ]
        read_only_fields = ['template']
    
    def get_check_type_display(self, obj):
        return dict(ClientCheckSetting.CHECK_TYPE_CHOICES).get(obj.check_type, '')
    
    def get_cycle_display(self, obj):
        return dict(ClientCheckSetting.CYCLE_CHOICES).get(obj.cycle, '')
        
    def validate(self, attrs):
        # template_idが存在する場合のみTemplateを検証
        template_id = attrs.pop('template_id', None)
        if template_id:
            try:
                from tasks.models import Task
                task = Task.objects.get(id=template_id)
                attrs['template'] = task
            except Task.DoesNotExist:
                # 存在しないテンプレートIDが指定された場合はNoneに設定
                # エラーは出さず処理を続行する
                attrs['template'] = None
        
        return attrs


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