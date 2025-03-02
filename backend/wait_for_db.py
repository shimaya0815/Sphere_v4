#!/usr/bin/env python
import os
import time
import psycopg2
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    """Django command to wait for database availability"""
    
    help = 'Waits for database to be available'
    
    def handle(self, *args, **options):
        self.stdout.write('Waiting for database...')
        
        while True:
            try:
                db_host = os.environ.get('POSTGRES_HOST', 'db')
                db_name = os.environ.get('POSTGRES_DB', 'sphere')
                db_user = os.environ.get('POSTGRES_USER', 'postgres')
                db_password = os.environ.get('POSTGRES_PASSWORD', 'postgres')
                
                conn = psycopg2.connect(
                    dbname=db_name,
                    user=db_user,
                    password=db_password,
                    host=db_host
                )
                conn.close()
                self.stdout.write(self.style.SUCCESS('Database available!'))
                break
            except psycopg2.OperationalError:
                self.stdout.write('Database unavailable, waiting 1 second...')
                time.sleep(1)