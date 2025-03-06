import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Sphere Websocket Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel_id: int):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
        logger.info(f"Client connected to channel {channel_id}. Active connections: {len(self.active_connections[channel_id])}")

    def disconnect(self, websocket: WebSocket, channel_id: int):
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
        logger.info(f"Client disconnected from channel {channel_id}.")

    async def broadcast(self, message: Dict[str, Any], channel_id: int):
        if channel_id in self.active_connections:
            for connection in self.active_connections[channel_id]:
                await connection.send_json(message)
            logger.info(f"Message broadcast to {len(self.active_connections[channel_id])} clients in channel {channel_id}")

manager = ConnectionManager()

# Pydantic model for message validation
class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    
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

@app.websocket("/ws/chat/{channel_id}/")
async def websocket_endpoint(websocket: WebSocket, channel_id: int):
    await manager.connect(websocket, channel_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                message_obj = WebSocketMessage(**message_data)
                
                # Handle different message types
                if message_obj.type == "chat_message":
                    # Store message in database (in real implementation)
                    # For now, we just broadcast it
                    await manager.broadcast({
                        "type": "chat_message",
                        "data": message_obj.data
                    }, channel_id)
                elif message_obj.type == "typing":
                    # Broadcast typing indicator
                    await manager.broadcast({
                        "type": "typing",
                        "data": message_obj.data
                    }, channel_id)
                elif message_obj.type == "read_status":
                    # Broadcast read status update
                    await manager.broadcast({
                        "type": "read_status",
                        "data": message_obj.data
                    }, channel_id)
                else:
                    logger.warning(f"Unknown message type: {message_obj.type}")
            except json.JSONDecodeError:
                logger.error("Failed to parse message as JSON")
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        manager.disconnect(websocket, channel_id)

@app.websocket("/ws/notifications/{user_id}/")
async def notifications_endpoint(websocket: WebSocket, user_id: int):
    # Similar implementation for user notifications
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(30)  # Keepalive
    except WebSocketDisconnect:
        logger.info(f"Notification client for user {user_id} disconnected")

@app.websocket("/ws/tasks/{task_id}/")
async def task_endpoint(websocket: WebSocket, task_id: int):
    """タスク固有のWebSocket接続 - コメント等の更新をリアルタイム通知"""
    await websocket.accept()
    logger.info(f"Client connected to task {task_id} channel")
    
    try:
        while True:
            # メッセージ受信
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")
                
                # メッセージタイプに応じた処理
                if message_type == "comment":
                    # コメント追加の通知をブロードキャスト
                    await websocket.send_json({
                        "type": "comment_added",
                        "data": message_data.get("data", {})
                    })
                elif message_type == "status_change":
                    # ステータス変更の通知をブロードキャスト
                    await websocket.send_json({
                        "type": "status_changed",
                        "data": message_data.get("data", {})
                    })
                else:
                    # タスク関連の通知をブロードキャスト
                    await websocket.send_json({
                        "type": "task_update",
                        "data": message_data
                    })
            except json.JSONDecodeError:
                logger.error("Failed to parse task message as JSON")
            except Exception as e:
                logger.error(f"Error processing task message: {str(e)}")
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from task {task_id} channel")
    except Exception as e:
        logger.error(f"Unexpected error in task socket: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Sphere WebSocket Server"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# APIエンドポイント: タスクコメント通知
@app.post("/api/notify_task_comment")
async def notify_task_comment(notification: TaskCommentNotification):
    logger.info(f"Received task comment notification: Task ID {notification.task_id}")
    
    # タスク通知をブロードキャスト
    try:
        # タスク用WebSocketに通知
        task_id = notification.task_id
        if task_id in manager.active_connections:
            await manager.broadcast({
                "type": "comment",
                "data": notification.dict()
            }, task_id)
            logger.info(f"Broadcast task comment to {len(manager.active_connections[task_id])} clients")
        
        # チャットチャンネル用WebSocketにも通知を送ることができる
        # ここではタスク通知チャンネルのIDを何らかの方法で特定する必要がある
        # 簡略化のため、channel_id = task_id + 10000 としているが、実際には適切に取得する必要がある
        
        # 通知成功
        return {"status": "success", "message": "Task comment notification broadcast"}
    except Exception as e:
        logger.error(f"Failed to broadcast task comment: {str(e)}")
        return {"status": "error", "message": str(e)}

# APIエンドポイント: タスクステータス変更通知
@app.post("/api/notify_task_status")
async def notify_task_status(notification: TaskStatusNotification):
    logger.info(f"Received task status notification: Task ID {notification.task_id}")
    
    # タスク通知をブロードキャスト
    try:
        # タスク用WebSocketに通知
        task_id = notification.task_id
        if task_id in manager.active_connections:
            await manager.broadcast({
                "type": "status_change",
                "data": notification.dict()
            }, task_id)
            logger.info(f"Broadcast task status change to {len(manager.active_connections[task_id])} clients")
        
        # 通知成功
        return {"status": "success", "message": "Task status notification broadcast"}
    except Exception as e:
        logger.error(f"Failed to broadcast task status change: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)