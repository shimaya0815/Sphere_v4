import json
import asyncio
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
import logging
import socketio
from datetime import datetime
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Sphere Websocket Service")

# CORS設定を改善（Dockerネットワーク用）
def get_cors_origins():
    # 環境変数からCORSオリジンを取得（カンマ区切り）
    cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
    
    # 環境変数が設定されている場合は分割してリストに変換
    if cors_origins_env != "*":
        origins = cors_origins_env.split(",")
        logger.info(f"CORS origins from env: {origins}")
        return origins
    
    # デフォルトのオリジン（すべて許可する "*" に加えて明示的なオリジンも設定）
    default_origins = [
        "*",  # すべてのオリジンを許可
        "http://localhost:3000",  # ローカル開発用
        "http://frontend:3000",   # Docker内のフロントエンド
        "http://localhost:8000",  # ローカルのバックエンド
        "http://backend:8000",    # Docker内のバックエンド
    ]
    logger.info(f"Using default CORS origins: {default_origins}")
    return default_origins

# Add CORS middleware with maximum permissiveness for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
    max_age=86400,  # 24時間キャッシュ
)

# Create Socket.IO Server with enhanced settings
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['*', 'http://localhost:3000', 'http://frontend:3000'],
    logger=True,
    engineio_logger=True,
    ping_timeout=60000,
    ping_interval=25000,
    # JSON serialization/deserialization
    json=json,
    # Allow all transports
    transports=['websocket', 'polling']
)

# Create the ASGI app with more explicit settings
socket_app = socketio.ASGIApp(
    sio,
    app,
    socketio_path='socket.io',
    static_files={},
    on_startup=lambda: print("Socket.IO server starting up"),
    on_shutdown=lambda: print("Socket.IO server shutting down")
)

# Connection tracking dictionaries
connected_clients = {}
channel_clients = {}
task_clients = {}

# Pydantic models for validation
class TaskCommentNotification(BaseModel):
    type: str
    task_id: int
    task_title: str
    comment_id: int
    user_name: str
    content: str
    created_at: str
    
class TaskStatusNotification(BaseModel):
    type: str
    task_id: int
    task_title: str
    old_status: str
    new_status: str
    user_name: str

# Socket.IO event handlers
@sio.event
async def connect(sid, environ, auth):
    """Handle new Socket.IO connections"""
    client_info = {
        'sid': sid,
        'ip': environ.get('REMOTE_ADDR', 'unknown'),
        'user_agent': environ.get('HTTP_USER_AGENT', 'unknown'),
        'connected_at': datetime.now().isoformat(),
    }
    
    connected_clients[sid] = client_info
    
    logger.info(f"✅ Client connected: {sid}")
    logger.info(f"🔌 Total clients connected: {len(connected_clients)}")
    
    # Send welcome message to confirm successful connection
    await sio.emit('connection_status', {
        'status': 'connected',
        'sid': sid,
        'timestamp': datetime.now().isoformat()
    }, to=sid)
    
    return True

@sio.event
async def disconnect(sid):
    """Handle Socket.IO disconnections"""
    logger.info(f"❌ Client disconnected: {sid}")
    
    # Remove client from connected clients
    if sid in connected_clients:
        del connected_clients[sid]
    
    # Remove from channel clients if present
    for channel_id, clients in list(channel_clients.items()):
        if sid in clients:
            channel_clients[channel_id].remove(sid)
            logger.info(f"Removed client {sid} from channel {channel_id}")
            
            # Clean up empty channels
            if not channel_clients[channel_id]:
                del channel_clients[channel_id]
                logger.info(f"Removed empty channel {channel_id}")
    
    # Remove from task clients if present
    for task_id, clients in list(task_clients.items()):
        if sid in clients:
            task_clients[task_id].remove(sid)
            logger.info(f"Removed client {sid} from task {task_id}")
            
            # Clean up empty task rooms
            if not task_clients[task_id]:
                del task_clients[task_id]
                logger.info(f"Removed empty task {task_id}")
    
    logger.info(f"🔌 Total clients connected: {len(connected_clients)}")

@sio.event
async def join_channel(sid, data):
    """Join a chat channel"""
    if not data or 'channel_id' not in data:
        logger.error(f"Invalid join_channel request from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid request, channel_id is required'}
    
    channel_id = str(data['channel_id'])
    user_info = data.get('user_info', {})
    
    # Add the Socket.IO room
    sio.enter_room(sid, f'channel_{channel_id}')
    
    # Track in our channel_clients dictionary
    if channel_id not in channel_clients:
        channel_clients[channel_id] = set()
    
    channel_clients[channel_id].add(sid)
    
    # Update client info
    if sid in connected_clients:
        connected_clients[sid]['current_channel'] = channel_id
        connected_clients[sid]['user_info'] = user_info
    
    logger.info(f"👥 Client {sid} joined channel {channel_id}")
    logger.info(f"👥 Channel {channel_id} has {len(channel_clients[channel_id])} clients")
    
    # Notify client of successful join
    await sio.emit('channel_joined', {
        'channel_id': channel_id,
        'timestamp': datetime.now().isoformat(),
        'active_users': len(channel_clients[channel_id])
    }, to=sid)
    
    # Notify others in the channel
    await sio.emit('user_joined', {
        'channel_id': channel_id,
        'user_info': user_info,
        'timestamp': datetime.now().isoformat()
    }, room=f'channel_{channel_id}', skip_sid=sid)
    
    return {'status': 'success', 'message': f'Joined channel {channel_id}'}

@sio.event
async def leave_channel(sid, data):
    """Leave a chat channel"""
    if not data or 'channel_id' not in data:
        logger.error(f"Invalid leave_channel request from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid request, channel_id is required'}
    
    channel_id = str(data['channel_id'])
    
    # Remove from Socket.IO room
    sio.leave_room(sid, f'channel_{channel_id}')
    
    # Remove from our tracking
    if channel_id in channel_clients and sid in channel_clients[channel_id]:
        channel_clients[channel_id].remove(sid)
        logger.info(f"👋 Client {sid} left channel {channel_id}")
        
        # Clean up empty channels
        if not channel_clients[channel_id]:
            del channel_clients[channel_id]
            logger.info(f"Removed empty channel {channel_id}")
        else:
            logger.info(f"👥 Channel {channel_id} has {len(channel_clients[channel_id])} clients")
    
    # Update client info
    if sid in connected_clients and connected_clients[sid].get('current_channel') == channel_id:
        connected_clients[sid].pop('current_channel', None)
    
    return {'status': 'success', 'message': f'Left channel {channel_id}'}

@sio.event
async def join_task(sid, data):
    """Join a task room for real-time updates"""
    if not data or 'task_id' not in data:
        logger.error(f"Invalid join_task request from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid request, task_id is required'}
    
    task_id = str(data['task_id'])
    user_info = data.get('user_info', {})
    
    # Add to Socket.IO room
    sio.enter_room(sid, f'task_{task_id}')
    
    # Track in our task_clients dictionary
    if task_id not in task_clients:
        task_clients[task_id] = set()
    
    task_clients[task_id].add(sid)
    
    # Update client info
    if sid in connected_clients:
        if 'tasks' not in connected_clients[sid]:
            connected_clients[sid]['tasks'] = set()
        
        connected_clients[sid]['tasks'].add(task_id)
        connected_clients[sid]['user_info'] = user_info
    
    logger.info(f"👥 Client {sid} joined task {task_id}")
    logger.info(f"👥 Task {task_id} has {len(task_clients[task_id])} clients")
    
    # Notify client of successful join
    await sio.emit('task_joined', {
        'task_id': task_id,
        'timestamp': datetime.now().isoformat(),
        'active_users': len(task_clients[task_id])
    }, to=sid)
    
    return {'status': 'success', 'message': f'Joined task {task_id}'}

@sio.event
async def leave_task(sid, data):
    """Leave a task room"""
    if not data or 'task_id' not in data:
        logger.error(f"Invalid leave_task request from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid request, task_id is required'}
    
    task_id = str(data['task_id'])
    
    # Remove from Socket.IO room
    sio.leave_room(sid, f'task_{task_id}')
    
    # Remove from our tracking
    if task_id in task_clients and sid in task_clients[task_id]:
        task_clients[task_id].remove(sid)
        logger.info(f"👋 Client {sid} left task {task_id}")
        
        # Clean up empty task rooms
        if not task_clients[task_id]:
            del task_clients[task_id]
            logger.info(f"Removed empty task {task_id}")
        else:
            logger.info(f"👥 Task {task_id} has {len(task_clients[task_id])} clients")
    
    # Update client info
    if sid in connected_clients and 'tasks' in connected_clients[sid]:
        if task_id in connected_clients[sid]['tasks']:
            connected_clients[sid]['tasks'].remove(task_id)
    
    return {'status': 'success', 'message': f'Left task {task_id}'}

@sio.event
async def chat_message(sid, data):
    """Handle chat messages"""
    if not data or 'channel_id' not in data or 'content' not in data:
        logger.error(f"Invalid chat_message from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid message format'}
    
    channel_id = str(data['channel_id'])
    
    # Get user info
    user_info = {}
    if sid in connected_clients:
        user_info = connected_clients[sid].get('user_info', {})
    
    # Create message object
    message = {
        'type': 'chat_message',
        'channel_id': channel_id,
        'content': data['content'],
        'user': user_info,
        'timestamp': datetime.now().isoformat(),
        'id': data.get('id', f'temp-{int(datetime.now().timestamp() * 1000)}')
    }
    
    # Broadcast to the channel
    await sio.emit('chat_message', message, room=f'channel_{channel_id}')
    
    logger.info(f"💬 Message sent to channel {channel_id} by {user_info.get('id', 'unknown')}")
    
    return {'status': 'success', 'message_id': message['id']}

@sio.event
async def typing_indicator(sid, data):
    """Handle typing indicators"""
    if not data or 'channel_id' not in data:
        return {'status': 'error', 'message': 'Invalid request format'}
    
    channel_id = str(data['channel_id'])
    is_typing = data.get('is_typing', True)
    
    # Get user info
    user_info = {}
    if sid in connected_clients:
        user_info = connected_clients[sid].get('user_info', {})
    
    # Broadcast typing indicator to all users in the channel except sender
    await sio.emit('typing', {
        'channel_id': channel_id,
        'user': user_info,
        'is_typing': is_typing,
        'timestamp': datetime.now().isoformat()
    }, room=f'channel_{channel_id}', skip_sid=sid)
    
    return {'status': 'success'}

@sio.event
async def read_status(sid, data):
    """Handle read status updates"""
    if not data or 'channel_id' not in data:
        return {'status': 'error', 'message': 'Invalid request format'}
    
    channel_id = str(data['channel_id'])
    
    # Get user info
    user_info = {}
    if sid in connected_clients:
        user_info = connected_clients[sid].get('user_info', {})
    
    # Broadcast read status to all users in the channel
    await sio.emit('read_status', {
        'channel_id': channel_id,
        'user': user_info,
        'timestamp': datetime.now().isoformat()
    }, room=f'channel_{channel_id}')
    
    return {'status': 'success'}

@sio.event
async def task_comment(sid, data):
    """Handle task comments"""
    if not data or 'task_id' not in data or 'content' not in data:
        logger.error(f"Invalid task_comment from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid comment format'}
    
    task_id = str(data['task_id'])
    
    # Get user info
    user_info = {}
    if sid in connected_clients:
        user_info = connected_clients[sid].get('user_info', {})
    
    # Create comment object
    comment = {
        'type': 'comment_added',
        'task_id': task_id,
        'content': data['content'],
        'user': user_info,
        'timestamp': datetime.now().isoformat(),
        'comment_id': data.get('comment_id', f'temp-{int(datetime.now().timestamp() * 1000)}')
    }
    
    # Broadcast to the task room
    await sio.emit('task_update', comment, room=f'task_{task_id}')
    
    logger.info(f"💬 Comment sent to task {task_id} by {user_info.get('id', 'unknown')}")
    
    return {'status': 'success', 'comment_id': comment['comment_id']}

@sio.event
async def task_status_change(sid, data):
    """Handle task status changes"""
    if not data or 'task_id' not in data or 'new_status' not in data:
        logger.error(f"Invalid task_status_change from {sid}: {data}")
        return {'status': 'error', 'message': 'Invalid status change format'}
    
    task_id = str(data['task_id'])
    
    # Get user info
    user_info = {}
    if sid in connected_clients:
        user_info = connected_clients[sid].get('user_info', {})
    
    # Create status change object
    status_change = {
        'type': 'status_changed',
        'task_id': task_id,
        'old_status': data.get('old_status', 'unknown'),
        'new_status': data['new_status'],
        'user': user_info,
        'timestamp': datetime.now().isoformat()
    }
    
    # Broadcast to the task room
    await sio.emit('task_update', status_change, room=f'task_{task_id}')
    
    logger.info(f"🔄 Status change for task {task_id} by {user_info.get('id', 'unknown')}: {status_change['old_status']} -> {status_change['new_status']}")
    
    return {'status': 'success'}

# REST API endpoints for backward compatibility
@app.post("/api/notify_task_comment")
async def notify_task_comment(notification: TaskCommentNotification):
    """API endpoint for backend to send task comment notifications"""
    logger.info(f"Received task comment notification: Task ID {notification.task_id}")
    
    task_id = str(notification.task_id)
    
    # Convert to Socket.IO message format
    comment_data = {
        'type': 'comment_added',
        'task_id': task_id,
        'task_title': notification.task_title,
        'content': notification.content,
        'user': {
            'name': notification.user_name
        },
        'timestamp': notification.created_at,
        'comment_id': notification.comment_id
    }
    
    # Send to all clients in the task room
    if task_id in task_clients and task_clients[task_id]:
        await sio.emit('task_update', comment_data, room=f'task_{task_id}')
        logger.info(f"Broadcast task comment to {len(task_clients[task_id])} clients")
        return {"status": "success", "message": "Task comment notification broadcast"}
    else:
        logger.warning(f"No active connections for task {task_id}")
        return {"status": "warning", "message": "No active connections for this task"}

@app.post("/api/notify_task_status")
async def notify_task_status(notification: TaskStatusNotification):
    """API endpoint for backend to send task status change notifications"""
    logger.info(f"Received task status notification: Task ID {notification.task_id}")
    
    task_id = str(notification.task_id)
    
    # Convert to Socket.IO message format
    status_data = {
        'type': 'status_changed',
        'task_id': task_id,
        'task_title': notification.task_title,
        'old_status': notification.old_status,
        'new_status': notification.new_status,
        'user': {
            'name': notification.user_name
        },
        'timestamp': datetime.now().isoformat()
    }
    
    # Send to all clients in the task room
    if task_id in task_clients and task_clients[task_id]:
        await sio.emit('task_update', status_data, room=f'task_{task_id}')
        logger.info(f"Broadcast task status change to {len(task_clients[task_id])} clients")
        return {"status": "success", "message": "Task status notification broadcast"}
    else:
        logger.warning(f"No active connections for task {task_id}")
        return {"status": "warning", "message": "No active connections for this task"}

@app.get("/")
async def root():
    """Root endpoint for healthcheck"""
    client_count = len(connected_clients)
    channel_count = len(channel_clients)
    task_count = len(task_clients)
    
    return {
        "message": "Sphere Socket.IO Server",
        "status": "running",
        "connections": {
            "clients": client_count,
            "channels": channel_count,
            "tasks": task_count
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "connections": len(connected_clients),
        "uptime": "Active"
    }

# Expose as ASGI app
app = socket_app

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Socket.IO server on all interfaces (0.0.0.0:8001)")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="debug",
        access_log=True,
        limit_concurrency=1000,
        timeout_keep_alive=120
    )