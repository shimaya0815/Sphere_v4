# デバッグ用スクリプト
from django.db import connection
import json

class SqlPrintingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.endswith('/auth/token/login/'):
            print('='*80)
            print('LOGIN REQUEST RECEIVED:')
            print(f'Method: {request.method}')
            print(f'Path: {request.path}')
            print(f'Headers: {request.headers}')
            
            if request.method == 'POST':
                try:
                    body = request.body.decode('utf-8')
                    print(f'Raw Body: {body}')
                    
                    if body:
                        try:
                            data = json.loads(body)
                            print(f'JSON Body: {json.dumps(data, indent=2)}')
                        except json.JSONDecodeError:
                            print(f'Body is not valid JSON: {body}')
                except Exception as e:
                    print(f'Error decoding body: {e}')
                    
                # POST データも確認
                print(f'POST data: {request.POST}')
            
            print('='*80)
        
        response = self.get_response(request)
        return response 