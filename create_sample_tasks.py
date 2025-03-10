#!/usr/bin/env python
"""
デフォルトテンプレートの作成および内包タスクのサンプルを追加するスクリプト
"""

import os
import django
import sys

# Djangoの設定を読み込む
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sphere.settings')
django.setup()

from django.utils import timezone
from tasks.models import Task, TemplateChildTask, TaskStatus, TaskCategory, TaskPriority, TaskSchedule
from business.models import Business

def create_sample_template_tasks():
    """
    すべてのビジネスに対して標準的なテンプレートタスクとその内包タスクを作成する
    """
    # すべてのビジネスを取得
    businesses = Business.objects.all()
    
    for business in businesses:
        print(f"\n=== ビジネス: {business.name} (ID: {business.id}) ===")
        
        # カテゴリ、ステータス、優先度を取得
        categories = TaskCategory.objects.filter(business=business)
        statuses = TaskStatus.objects.filter(business=business)
        priorities = TaskPriority.objects.filter(business=business)
        
        # デフォルト値を設定
        default_category = categories.filter(name='一般').first() or categories.first()
        bookkeeping_category = categories.filter(name='記帳代行').first() or default_category
        tax_category = categories.filter(name='税務顧問').first() or categories.filter(name='決算・申告').first() or default_category
        default_status = statuses.filter(name='未着手').first() or statuses.first()
        default_priority = priorities.filter(priority_value=50).first() or priorities.first()
        
        # 標準テンプレート構成を作成
        template_configs = [
            {
                "name": "月次処理チェック",
                "description": "毎月の会計処理状況を確認します。",
                "category": default_category,
                "tasks": [
                    {
                        "title": "帳簿確認",
                        "description": "月次の帳簿が正確に更新されているか確認します。",
                        "estimated_hours": 1.5,
                        "order": 1
                    },
                    {
                        "title": "仕訳チェック",
                        "description": "仕訳が適切に行われているか確認し、必要に応じて修正します。",
                        "estimated_hours": 2.0,
                        "order": 2
                    },
                    {
                        "title": "請求書確認",
                        "description": "未払いの請求書がないか確認し、支払い状況を更新します。",
                        "estimated_hours": 1.0,
                        "order": 3
                    },
                    {
                        "title": "売上集計",
                        "description": "当月の売上を集計し、前月と比較します。",
                        "estimated_hours": 1.0,
                        "order": 4
                    },
                    {
                        "title": "経費集計",
                        "description": "当月の経費を集計し、予算との差異を分析します。",
                        "estimated_hours": 1.0,
                        "order": 5
                    }
                ]
            },
            {
                "name": "記帳代行作業",
                "description": "月次の記帳代行を行います。",
                "category": bookkeeping_category,
                "tasks": [
                    {
                        "title": "資料受領確認",
                        "description": "必要な書類や領収書がすべて揃っているか確認します。",
                        "estimated_hours": 0.5,
                        "order": 1
                    },
                    {
                        "title": "領収書の整理",
                        "description": "領収書を日付順に整理し、分類します。",
                        "estimated_hours": 1.0,
                        "order": 2
                    },
                    {
                        "title": "データ入力",
                        "description": "会計ソフトに取引データを入力します。",
                        "estimated_hours": 3.0,
                        "order": 3
                    },
                    {
                        "title": "現金出納帳の更新",
                        "description": "現金出納帳を最新の情報に更新します。",
                        "estimated_hours": 0.5,
                        "order": 4
                    },
                    {
                        "title": "預金帳の更新",
                        "description": "預金帳を最新の情報に更新します。",
                        "estimated_hours": 0.5,
                        "order": 5
                    },
                    {
                        "title": "月次レポート作成",
                        "description": "当月の収支状況を要約したレポートを作成します。",
                        "estimated_hours": 1.5,
                        "order": 6
                    }
                ]
            },
            {
                "name": "決算・法人税申告業務",
                "description": "決算期の法人税申告書作成業務を行います。",
                "category": tax_category,
                "tasks": [
                    {
                        "title": "決算資料の確認",
                        "description": "決算に必要な資料が揃っているか確認します。",
                        "estimated_hours": 1.0,
                        "order": 1
                    },
                    {
                        "title": "決算整理仕訳",
                        "description": "減価償却費や引当金など、決算整理仕訳を行います。",
                        "estimated_hours": 3.0,
                        "order": 2
                    },
                    {
                        "title": "決算書の作成",
                        "description": "貸借対照表、損益計算書などの決算書を作成します。",
                        "estimated_hours": 4.0,
                        "order": 3
                    },
                    {
                        "title": "法人税申告書の作成",
                        "description": "法人税申告書を作成します。",
                        "estimated_hours": 5.0,
                        "order": 4
                    },
                    {
                        "title": "地方税申告書の作成",
                        "description": "法人住民税・事業税の申告書を作成します。",
                        "estimated_hours": 3.0,
                        "order": 5
                    },
                    {
                        "title": "消費税申告書の作成",
                        "description": "消費税申告書を作成します。",
                        "estimated_hours": 2.0,
                        "order": 6
                    },
                    {
                        "title": "クライアントへの説明",
                        "description": "決算内容をクライアントに説明します。",
                        "estimated_hours": 1.5,
                        "order": 7
                    },
                    {
                        "title": "電子申告の実施",
                        "description": "e-Taxで電子申告を行います。",
                        "estimated_hours": 1.0,
                        "order": 8
                    }
                ]
            },
            {
                "name": "源泉所得税納付業務",
                "description": "毎月の源泉所得税の納付手続きを行います。",
                "category": tax_category,
                "tasks": [
                    {
                        "title": "給与支払い額の確認",
                        "description": "当月の給与支払い総額を確認します。",
                        "estimated_hours": 0.5,
                        "order": 1
                    },
                    {
                        "title": "源泉所得税額の計算",
                        "description": "源泉所得税額を計算します。",
                        "estimated_hours": 1.0,
                        "order": 2
                    },
                    {
                        "title": "納付書の作成",
                        "description": "源泉所得税の納付書を作成します。",
                        "estimated_hours": 0.5,
                        "order": 3
                    },
                    {
                        "title": "納付手続きの実施",
                        "description": "源泉所得税を納付します。",
                        "estimated_hours": 0.5,
                        "order": 4
                    }
                ]
            },
            {
                "name": "住民税納付業務",
                "description": "従業員の住民税特別徴収の納付手続きを行います。",
                "category": tax_category,
                "tasks": [
                    {
                        "title": "住民税通知書の確認",
                        "description": "市区町村からの特別徴収税額通知書を確認します。",
                        "estimated_hours": 0.5,
                        "order": 1
                    },
                    {
                        "title": "従業員ごとの住民税額の確認",
                        "description": "従業員ごとの住民税額を確認します。",
                        "estimated_hours": 1.0,
                        "order": 2
                    },
                    {
                        "title": "給与システムへの反映",
                        "description": "給与システムに住民税額を反映します。",
                        "estimated_hours": 1.0,
                        "order": 3
                    },
                    {
                        "title": "納付書の作成",
                        "description": "住民税の納付書を作成します。",
                        "estimated_hours": 0.5,
                        "order": 4
                    },
                    {
                        "title": "納付手続きの実施",
                        "description": "住民税を納付します。",
                        "estimated_hours": 0.5,
                        "order": 5
                    }
                ]
            }
        ]
        
        # テンプレートタスクの作成
        for template_config in template_configs:
            # 既存のテンプレートを探す
            existing_template = Task.objects.filter(
                business=business,
                is_template=True,
                title=template_config["name"]
            ).first()
            
            if existing_template:
                template = existing_template
                print(f"既存テンプレート「{template.title}」を更新します")
                template.description = template_config["description"]
                template.category = template_config["category"]
                template.save()
            else:
                # スケジュールを作成
                schedule_name = f"{template_config['name']}スケジュール"
                
                # 既存のスケジュールを探す
                existing_schedule = TaskSchedule.objects.filter(
                    business=business,
                    name=schedule_name
                ).first()
                
                if existing_schedule:
                    schedule = existing_schedule
                else:
                    # 新規スケジュール作成
                    if "月次" in template_config["name"] or "記帳" in template_config["name"]:
                        schedule_type = "monthly_start"
                        recurrence = "monthly"
                    elif "決算" in template_config["name"] or "法人税" in template_config["name"]:
                        schedule_type = "fiscal_relative"
                        recurrence = "yearly"
                    elif "源泉" in template_config["name"]:
                        schedule_type = "monthly_end"
                        recurrence = "monthly"
                    elif "住民税" in template_config["name"]:
                        schedule_type = "monthly_start"
                        recurrence = "monthly"
                    else:
                        schedule_type = "monthly_start"
                        recurrence = "monthly"
                        
                    schedule = TaskSchedule.objects.create(
                        business=business,
                        name=schedule_name,
                        schedule_type=schedule_type,
                        recurrence=recurrence,
                        reference_date_type="execution_date",
                        creation_date_offset=0,
                        deadline_date_offset=5
                    )
                    print(f"スケジュール「{schedule.name}」を作成しました")
                
                # テンプレートタスクを作成
                template = Task.objects.create(
                    business=business,
                    workspace=business.workspaces.first(),
                    title=template_config["name"],
                    description=template_config["description"],
                    category=template_config["category"],
                    status=default_status,
                    priority=default_priority,
                    is_template=True,
                    template_name=template_config["name"],
                    created_at=timezone.now()
                )
                print(f"テンプレート「{template.title}」を作成しました")
            
            # 既存の内包タスクを削除
            existing_tasks = TemplateChildTask.objects.filter(parent_template=template)
            if existing_tasks.exists():
                print(f"既存の内包タスク {existing_tasks.count()}件 を削除します")
                existing_tasks.delete()
            
            # 内包タスクを作成
            created_tasks = []
            for task_data in template_config["tasks"]:
                task = TemplateChildTask.objects.create(
                    parent_template=template,
                    business=business,
                    title=task_data["title"],
                    description=task_data["description"],
                    estimated_hours=task_data["estimated_hours"],
                    order=task_data["order"],
                    category=template_config["category"],
                    status=default_status,
                    priority=default_priority,
                    has_custom_schedule=False
                )
                created_tasks.append(task)
                print(f"  内包タスク「{task.title}」を作成しました")
            
            print(f"テンプレート「{template.title}」に {len(created_tasks)} 件の内包タスクを作成しました")

if __name__ == "__main__":
    create_sample_template_tasks()