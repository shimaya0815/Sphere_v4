from django.db import migrations

def delete_unused_statuses(apps, schema_editor):
    # タスクステータスモデルを取得
    TaskStatus = apps.get_model('tasks', 'TaskStatus')
    
    # 削除対象のステータス名
    status_names_to_delete = [
        'レビュー開始前',
        '差戻レビュー開始前',
        '差戻レビュー中'
    ]
    
    # 対象ステータスの削除と、関連するタスクのステータス調整
    Task = apps.get_model('tasks', 'Task')
    
    # 各ビジネスで該当ステータスを削除
    for status in TaskStatus.objects.filter(name__in=status_names_to_delete):
        business_id = status.business_id
        status_name = status.name
        
        # 削除するステータスを参照しているタスクを更新
        tasks_to_update = Task.objects.filter(status=status)
        
        # 代替ステータスを取得
        if 'レビュー開始前' in status_name:
            # レビュー開始前の場合はレビュー中に更新
            replacement_status = TaskStatus.objects.filter(
                business_id=business_id, 
                name='レビュー中'
            ).first()
        elif '差戻レビュー' in status_name:
            # 差戻レビュー関連の場合はレビュー中に更新
            replacement_status = TaskStatus.objects.filter(
                business_id=business_id, 
                name='レビュー中'
            ).first()
        
        # 代替ステータスがある場合はタスクを更新
        if replacement_status and tasks_to_update.exists():
            tasks_to_update.update(status=replacement_status)
        
        # ステータスを削除
        status.delete()
        
    print(f"削除したステータス: {status_names_to_delete}")

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0018_remove_is_fiscal_task'),  # 最新の依存関係に更新
    ]

    operations = [
        migrations.RunPython(delete_unused_statuses),
    ] 