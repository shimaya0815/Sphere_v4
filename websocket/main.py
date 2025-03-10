import json
import asyncio
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional, List
import socketio
from datetime import datetime
from pydantic import BaseModel

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPIアプリケーションの作成
app = FastAPI(title="Sphere Chat WebSocket Server")

# CORS設定 - すべてのオリジンを明示的に許可
# 開発環境用に明示的にlocalhostを追加
specific_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "http://0.0.0.0:3000",
    "http://frontend:3000",
    "http://localhost:8000",
    "http://backend:8000",
    "http://localhost",
    "http://127.0.0.1",
    "http://0.0.0.0",
    "*"  # すべてのオリジンを許可（開発用）
]

# 環境変数から追加のオリジンを取得
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if cors_origins_env:
    additional_origins = cors_origins_env.split(",")
    specific_origins.extend(additional_origins)

# 重複を削除
allowed_origins = list(set(specific_origins))

logger.info(f"Allowed CORS origins: {allowed_origins}")

# CORSミドルウェアを追加 - すべてのオリジンを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # すべてのオリジンを許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Socket.IOサーバー作成 - タイムアウト問題解決のための設定
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",  # すべてのオリジンを許可（開発環境用）
    logger=True,
    engineio_logger=True,
    ping_timeout=20000,  # クライアントとより近い値に設定
    ping_interval=25000,  # クライアントとバランスのとれた値
    max_http_buffer_size=500000,
    always_connect=True,
    http_compression=True  # 必要に応じて圧縮を有効化
)

# ASGIアプリケーション作成
socket_app = socketio.ASGIApp(sio, app)

# 接続クライアント管理
connected_clients = {}  # sid -> ユーザー情報
channel_members = {}    # channel_id -> set(sid)

# データモデル
class UserInfo(BaseModel):
    id: int
    name: str
    email: Optional[str] = None

class MessageData(BaseModel):
    channel_id: str
    content: str
    message_id: Optional[str] = None
    user_info: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class ChannelJoinData(BaseModel):
    channel_id: str
    user_info: Dict[str, Any]

class TypingData(BaseModel):
    channel_id: str
    is_typing: bool = True

class ReadStatusData(BaseModel):
    channel_id: str
    timestamp: Optional[str] = None

# Socket.IOイベントハンドラ
@sio.event
async def connect(sid, environ, auth):
    """クライアント接続時の処理"""
    try:
        # ヘッダーとトランスポート情報をログ出力
        transport = environ.get('asgi.scope', {}).get('type', 'unknown')
        headers = {k.decode('utf-8'): v.decode('utf-8') 
                  for k, v in environ.get('asgi.scope', {}).get('headers', [])
                  if k.decode('utf-8').lower() in ['origin', 'user-agent', 'x-forwarded-for']}
        
        logger.info(f"Client connected: {sid} via {transport}")
        logger.info(f"Headers: {headers}")
        
        # クライアント情報を保存
        connected_clients[sid] = {
            'connected_at': datetime.now().isoformat(),
            'channels': set(),
            'transport': transport,
            'ip': headers.get('x-forwarded-for', 'unknown'),
            'user_agent': headers.get('user-agent', 'unknown'),
            'origin': headers.get('origin', 'unknown')
        }
        
        # 接続確認メッセージ送信
        await sio.emit('connection_status', {
            'status': 'connected',
            'sid': sid,
            'server_time': datetime.now().isoformat(),
            'transport': transport,
            'connection_count': len(connected_clients)
        }, to=sid)
        
        logger.info(f"Active connections: {len(connected_clients)}")
        return True
    except Exception as e:
        logger.error(f"Error during connection handling: {str(e)}")
        # エラーがあっても接続は許可
        return True

@sio.event
async def ping(sid):
    """Pingイベントに対するPong応答"""
    logger.info(f"Ping received from {sid}")
    await sio.emit('pong', {
        'time': datetime.now().isoformat(),
        'sid': sid
    }, to=sid)
    return {'status': 'ok', 'message': 'pong'}

@sio.event
async def disconnect(sid):
    """クライアント切断時の処理"""
    logger.info(f"Client disconnected: {sid}")
    
    # 所属していたすべてのチャンネルから削除
    client = connected_clients.get(sid)
    if client:
        for channel_id in list(client['channels']):
            if channel_id in channel_members:
                # チャンネルからユーザーを削除
                channel_members[channel_id].remove(sid)
                
                # チャンネルの他のメンバーに退出を通知
                user_info = client.get('user_info', {})
                await sio.emit('user_left', {
                    'channel_id': channel_id,
                    'user_info': user_info,
                    'timestamp': datetime.now().isoformat()
                }, room=f'channel_{channel_id}')
                
                # チャンネルが空になった場合は削除
                if not channel_members[channel_id]:
                    del channel_members[channel_id]
    
    # クライアント情報を削除
    if sid in connected_clients:
        del connected_clients[sid]
    
    logger.info(f"Active connections: {len(connected_clients)}")

@sio.event
async def join_channel(sid, data):
    """チャンネル参加処理"""
    try:
        # データバリデーションをより寛容に
        channel_id = None
        user_info = {}
        
        # データ形式チェック - 辞書/オブジェクト
        if isinstance(data, dict):
            channel_id = data.get('channel_id')
            user_info = data.get('user_info', {})
        
        # データバリデーション失敗時のフォールバック
        if not channel_id:
            logger.warning(f"Invalid channel join data: {data}")
            return {
                'status': 'error',
                'message': 'Invalid channel data: channel_id is required'
            }
            
        # チャンネルIDを文字列に変換
        channel_id = str(channel_id)
        
        # チャンネルルームに参加
        room_name = f'channel_{channel_id}'
        sio.enter_room(sid, room_name)
        logger.info(f"SID {sid} entered room: {room_name}")
        
        # チャンネルメンバー管理に追加
        if channel_id not in channel_members:
            channel_members[channel_id] = set()
        channel_members[channel_id].add(sid)
        
        # クライアント情報を更新
        if sid in connected_clients:
            connected_clients[sid]['channels'].add(channel_id)
            connected_clients[sid]['user_info'] = user_info
            logger.info(f"Updated client info for SID {sid}: {connected_clients[sid]}")
        else:
            # 接続情報がない場合は新規作成
            connected_clients[sid] = {
                'connected_at': datetime.now().isoformat(),
                'channels': {channel_id},
                'user_info': user_info
            }
            logger.info(f"Created new client info for SID {sid}")
        
        # 参加者数
        member_count = len(channel_members[channel_id])
        
        # 参加成功通知
        join_response = {
            'channel_id': channel_id,
            'timestamp': datetime.now().isoformat(),
            'active_members': member_count
        }
        await sio.emit('channel_joined', join_response, to=sid)
        
        # 他のメンバーに新しいユーザーの参加を通知
        user_joined_notification = {
            'channel_id': channel_id,
            'user_info': user_info,
            'timestamp': datetime.now().isoformat(),
            'active_members': member_count
        }
        await sio.emit('user_joined', user_joined_notification, room=room_name, skip_sid=sid)
        
        user_id = user_info.get('id', 'unknown')
        logger.info(f"User {user_id} joined channel {channel_id} with {member_count} active members")
        
        return {
            'status': 'success',
            'message': f'Joined channel {channel_id}',
            'active_members': member_count,
            'channel_id': channel_id,
            'sid': sid
        }
    except Exception as e:
        logger.error(f"Error joining channel: {str(e)}")
        # スタックトレースも出力
        import traceback
        logger.error(traceback.format_exc())
        return {
            'status': 'error',
            'message': f'Failed to join channel: {str(e)}'
        }

@sio.event
async def leave_channel(sid, data):
    """チャンネル退出処理"""
    try:
        channel_id = data.get('channel_id')
        if not channel_id:
            return {'status': 'error', 'message': 'Channel ID is required'}
        
        # チャンネルルームから退出
        sio.leave_room(sid, f'channel_{channel_id}')
        
        # チャンネルメンバー管理から削除
        if channel_id in channel_members and sid in channel_members[channel_id]:
            channel_members[channel_id].remove(sid)
            
            # チャンネルが空になった場合は削除
            if not channel_members[channel_id]:
                del channel_members[channel_id]
        
        # クライアント情報を更新
        if sid in connected_clients:
            if channel_id in connected_clients[sid]['channels']:
                connected_clients[sid]['channels'].remove(channel_id)
            
            # ユーザー情報を取得
            user_info = connected_clients[sid].get('user_info', {})
            
            # 他のメンバーに退出を通知
            await sio.emit('user_left', {
                'channel_id': channel_id,
                'user_info': user_info,
                'timestamp': datetime.now().isoformat()
            }, room=f'channel_{channel_id}')
        
        member_count = len(channel_members.get(channel_id, set()))
        logger.info(f"User left channel {channel_id}. Remaining members: {member_count}")
        
        return {
            'status': 'success',
            'message': f'Left channel {channel_id}'
        }
    except Exception as e:
        logger.error(f"Error leaving channel: {str(e)}")
        return {
            'status': 'error',
            'message': f'Failed to leave channel: {str(e)}'
        }

@sio.event
async def chat_message(sid, data):
    """チャットメッセージ送信処理"""
    try:
        # データバリデーション
        message_data = MessageData(**data)
        channel_id = message_data.channel_id
        
        # ユーザー情報を取得
        user_info = {}
        if sid in connected_clients:
            user_info = connected_clients[sid].get('user_info', {})
        
        # メッセージIDを生成（指定がなければ）
        message_id = message_data.message_id or f"msg_{int(datetime.now().timestamp() * 1000)}_{sid[-4:]}"
        
        # タイムスタンプを設定
        timestamp = message_data.timestamp or datetime.now().isoformat()
        
        # メッセージオブジェクト作成
        message_obj = {
            'type': 'chat_message',
            'message_id': message_id,
            'channel_id': channel_id,
            'content': message_data.content,
            'user': user_info,
            'timestamp': timestamp
        }
        
        # チャンネルの全メンバーにブロードキャスト
        await sio.emit('chat_message', message_obj, room=f'channel_{channel_id}')
        
        logger.info(f"Message sent to channel {channel_id} by {user_info.get('id')}")
        
        return {
            'status': 'success',
            'message_id': message_id
        }
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return {
            'status': 'error',
            'message': f'Failed to send message: {str(e)}'
        }

@sio.event
async def typing_indicator(sid, data):
    """タイピングインジケーター送信処理"""
    try:
        typing_data = TypingData(**data)
        channel_id = typing_data.channel_id
        is_typing = typing_data.is_typing
        
        # ユーザー情報を取得
        user_info = {}
        if sid in connected_clients:
            user_info = connected_clients[sid].get('user_info', {})
        
        # チャンネルの他のメンバーにブロードキャスト
        await sio.emit('typing', {
            'channel_id': channel_id,
            'user': user_info,
            'is_typing': is_typing,
            'timestamp': datetime.now().isoformat()
        }, room=f'channel_{channel_id}', skip_sid=sid)
        
        return {'status': 'success'}
    except Exception as e:
        logger.error(f"Error sending typing indicator: {str(e)}")
        return {'status': 'error', 'message': str(e)}

@sio.event
async def read_status(sid, data):
    """既読ステータス送信処理"""
    try:
        read_data = ReadStatusData(**data)
        channel_id = read_data.channel_id
        timestamp = read_data.timestamp or datetime.now().isoformat()
        
        # ユーザー情報を取得
        user_info = {}
        if sid in connected_clients:
            user_info = connected_clients[sid].get('user_info', {})
        
        # チャンネルの全メンバーにブロードキャスト
        await sio.emit('read_status', {
            'channel_id': channel_id,
            'user': user_info,
            'timestamp': timestamp
        }, room=f'channel_{channel_id}')
        
        return {'status': 'success'}
    except Exception as e:
        logger.error(f"Error sending read status: {str(e)}")
        return {'status': 'error', 'message': str(e)}

# REST API エンドポイント
@app.get("/")
async def root():
    """ルートエンドポイント - サーバー状態確認用"""
    return {
        "message": "Sphere Chat Socket.IO Server",
        "status": "running",
        "connections": {
            "clients": len(connected_clients),
            "channels": len(channel_members),
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "connections": len(connected_clients),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/debug/connections")
async def debug_connections():
    """デバッグ用の接続情報エンドポイント"""
    return {
        "active_connections": len(connected_clients),
        "channel_count": len(channel_members),
        "channels": {
            channel_id: list(sids)
            for channel_id, sids in channel_members.items()
        },
        "clients": {
            sid: {
                "connected_at": client.get("connected_at"),
                "channels": list(client.get("channels", [])),
                "user_id": client.get("user_info", {}).get("id") if client.get("user_info") else None
            }
            for sid, client in connected_clients.items()
        },
        "server_info": {
            "start_time": datetime.now().isoformat(),
            "socketio_version": socketio.__version__,
            "cors_origins": cors_origins
        }
    }

# チャンネル情報取得API
@app.get("/api/channels/{channel_id}/status")
async def get_channel_status(channel_id: str):
    """チャンネルのステータス情報を取得"""
    if channel_id in channel_members:
        members = []
        for sid in channel_members[channel_id]:
            if sid in connected_clients:
                members.append(connected_clients[sid].get('user_info', {}))
        
        return {
            "channel_id": channel_id,
            "active_members_count": len(channel_members[channel_id]),
            "active_members": members,
            "timestamp": datetime.now().isoformat()
        }
    else:
        return {
            "channel_id": channel_id,
            "active_members_count": 0,
            "active_members": [],
            "timestamp": datetime.now().isoformat()
        }

# メインアプリケーションとして実行する場合
if __name__ == "__main__":
    import uvicorn
    
    # すべてのインターフェースでリッスン
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8001))
    
    logger.info(f"Starting Socket.IO server on {host}:{port}")
    
    uvicorn.run(
        socket_app,
        host=host,
        port=port,
        log_level="info",
        reload=True
    )
else:
    # Uvicornから呼び出される場合
    # このモジュールのソケットアプリをエクスポート
    app = socket_app