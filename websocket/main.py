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
    # すべてのオリジンを許可（開発環境用）
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # デバッグ用の接続履歴
        self.connection_history = []

    async def connect(self, websocket: WebSocket, channel_id: int):
        """
        この関数は直接使わない - 代わりにwebsocket_endpoint内で接続を管理
        """
        logger.warning("⚠️ connect method called directly - this is deprecated")
        return False

    def disconnect(self, websocket: WebSocket, channel_id: int):
        try:
            if channel_id in self.active_connections:
                # 接続がリストにある場合に削除
                if websocket in self.active_connections[channel_id]:
                    self.active_connections[channel_id].remove(websocket)
                    logger.info(f"Client disconnected from channel {channel_id}. Active connections: {len(self.active_connections[channel_id])}")
                else:
                    logger.warning(f"Attempted to disconnect a WebSocket that was not in channel {channel_id}")
                
                # チャンネルが空になった場合、辞書からキーを削除
                if not self.active_connections[channel_id]:
                    del self.active_connections[channel_id]
                    logger.info(f"Channel {channel_id} has no more connections, removed from active channels")
            else:
                logger.warning(f"Attempted to disconnect from non-existent channel {channel_id}")
        except Exception as e:
            logger.error(f"Error in disconnect method: {str(e)}")
            
        # 全体のアクティブ接続数をログに記録
        total_connections = sum(len(connections) for connections in self.active_connections.values()) if self.active_connections else 0
        logger.info(f"Total active connections across all channels: {total_connections}")

    async def broadcast(self, message: Dict[str, Any], channel_id: int):
        if channel_id in self.active_connections:
            # 有効な接続のみに送信するために接続のリストをコピー
            active_conns = self.active_connections[channel_id].copy()
            sent_count = 0
            
            for connection in active_conns:
                try:
                    await connection.send_json(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Error sending to a client in channel {channel_id}: {str(e)}")
                    try:
                        # 切断された接続を削除
                        if connection in self.active_connections[channel_id]:
                            self.active_connections[channel_id].remove(connection)
                    except:
                        pass
            
            logger.info(f"Message broadcast to {sent_count}/{len(active_conns)} clients in channel {channel_id}")

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
    # WebSocketハンドシェイク前にオリジンをログに出力（接続デバッグ用）
    client = f"{websocket.client.host}:{websocket.client.port}"
    headers = dict(websocket.headers)
    origin = headers.get('origin', 'unknown')
    logger.info(f"⚡ WebSocket connection attempt from {client}, Origin: {origin}")
    
    # より詳細なリクエスト情報を出力
    logger.info(f"⚡ Headers: {headers}")
    logger.info(f"⚡ Connection attempt for channel: {channel_id}")
    
    # 接続を受け付ける（これによりハンドシェイクを完了させる）
    try:
        # より安全な接続ロジック
        try:
            # 明示的なaccept呼び出し
            await websocket.accept()
            logger.info(f"✅ WebSocket connection accepted for channel {channel_id}")
            
            # 接続をマネージャーに登録
            if channel_id not in manager.active_connections:
                manager.active_connections[channel_id] = []
            manager.active_connections[channel_id].append(websocket)
            
            logger.info(f"👥 Client connected to channel {channel_id}. Active connections: {len(manager.active_connections[channel_id])}")
            connection_success = True
        except Exception as accept_err:
            logger.error(f"❌ Error accepting connection: {str(accept_err)}")
            connection_success = False
        
        if not connection_success:
            logger.error(f"❌ Failed to establish connection for channel {channel_id}")
            return
        
        logger.info(f"✅ WebSocket connection successful for channel {channel_id}")
        
        # 接続確認メッセージを送信
        try:
            # メッセージを小さなJSONオブジェクトに簡素化
            await websocket.send_json({
                "type": "connection_established",
                "message": "Connected to server",
                "channel_id": channel_id
            })
            logger.info(f"📨 Welcome message sent to channel {channel_id}")
        except Exception as e:
            logger.error(f"❌ Error sending welcome message: {str(e)}")
            # 接続に問題がある場合は早期終了
            try:
                manager.disconnect(websocket, channel_id)
            except Exception as disc_err:
                logger.error(f"❌ Error during disconnect: {str(disc_err)}")
            return
        
        # メッセージ受信ループ
        try:
            while True:
                data = await websocket.receive_text()
                logger.info(f"Received message from client: {data[:100]}...")
                
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
                        logger.info(f"Broadcast chat message to channel {channel_id}")
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
                    elif message_obj.type == "ping":
                        # クライアントからのPingには応答するだけ
                        await websocket.send_json({
                            "type": "pong",
                            "data": {
                                "timestamp": datetime.now().isoformat(),
                                "server_received": message_obj.data.get("timestamp", "unknown")
                            }
                        })
                        logger.info(f"Responded to ping from client")
                    else:
                        logger.warning(f"Unknown message type: {message_obj.type}")
                except json.JSONDecodeError:
                    logger.error("Failed to parse message as JSON")
                except Exception as e:
                    logger.error(f"Error processing message: {str(e)}")
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected normally for channel {channel_id}")
            manager.disconnect(websocket, channel_id)
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket communication: {str(e)}")
            manager.disconnect(websocket, channel_id)
    except Exception as e:
        logger.error(f"Failed to establish WebSocket connection: {str(e)}")
        # 接続確立に失敗した場合はここで終了

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
    # WebSocketハンドシェイク前にオリジンをログに出力
    client = f"{websocket.client.host}:{websocket.client.port}"
    headers = dict(websocket.headers)
    origin = headers.get('origin', 'unknown')
    logger.info(f"WebSocket task connection attempt from {client}, Origin: {origin}")
    
    # マネージャーに接続を登録（コメントのブロードキャスト用）
    try:
        connection_success = await manager.connect(websocket, task_id)
        if not connection_success:
            logger.error(f"Failed to establish connection for task {task_id}")
            return
            
        logger.info(f"Client connected to task {task_id} channel")
        
        # 接続確認メッセージを送信
        try:
            await websocket.send_json({
                "type": "connection_established",
                "data": {
                    "message": "Connected to task WebSocket server",
                    "task_id": task_id,
                    "timestamp": datetime.now().isoformat()
                }
            })
            logger.info(f"Welcome message sent to task {task_id}")
        except Exception as e:
            logger.error(f"Error sending task welcome message: {str(e)}")
            # 接続に問題がある場合は早期終了
            try:
                manager.disconnect(websocket, task_id)
            except:
                pass
            return
        
        # メッセージ受信ループ
        try:
            while True:
                data = await websocket.receive_text()
                logger.info(f"Received task message from client: {data[:100]}...")
                
                try:
                    message_data = json.loads(data)
                    message_type = message_data.get("type")
                    
                    # メッセージタイプに応じた処理
                    if message_type == "comment":
                        # コメント追加の通知をブロードキャスト
                        await manager.broadcast({
                            "type": "comment_added",
                            "data": message_data.get("data", {})
                        }, task_id)
                        logger.info(f"Broadcast comment update to task {task_id}")
                    elif message_type == "status_change":
                        # ステータス変更の通知をブロードキャスト
                        await manager.broadcast({
                            "type": "status_changed",
                            "data": message_data.get("data", {})
                        }, task_id)
                        logger.info(f"Broadcast status change to task {task_id}")
                    elif message_type == "ping":
                        # クライアントからのpingメッセージに応答
                        await websocket.send_json({
                            "type": "pong",
                            "data": {
                                "timestamp": datetime.now().isoformat(),
                                "task_id": task_id
                            }
                        })
                        logger.info(f"Responded to ping from task {task_id} client")
                    else:
                        # タスク関連の通知をブロードキャスト
                        await manager.broadcast({
                            "type": "task_update",
                            "data": message_data
                        }, task_id)
                        logger.info(f"Broadcast generic task update to task {task_id}")
                except json.JSONDecodeError:
                    logger.error("Failed to parse task message as JSON")
                except Exception as e:
                    logger.error(f"Error processing task message: {str(e)}")
        except WebSocketDisconnect:
            logger.info(f"Client disconnected from task {task_id} channel")
            manager.disconnect(websocket, task_id)
        except Exception as e:
            logger.error(f"Unexpected error in task socket: {str(e)}")
            manager.disconnect(websocket, task_id)
    except Exception as e:
        logger.error(f"Failed to establish task WebSocket connection: {str(e)}")

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
                "type": "comment_added",
                "data": notification.dict()
            }, task_id)
            logger.info(f"Broadcast task comment to {len(manager.active_connections[task_id])} clients")
            return {"status": "success", "message": "Task comment notification broadcast"}
        else:
            logger.warning(f"No active connections for task {task_id}")
            return {"status": "warning", "message": "No active connections for this task"}
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
                "type": "status_changed",
                "data": notification.dict()
            }, task_id)
            logger.info(f"Broadcast task status change to {len(manager.active_connections[task_id])} clients")
            return {"status": "success", "message": "Task status notification broadcast"}
        else:
            logger.warning(f"No active connections for task {task_id}")
            return {"status": "warning", "message": "No active connections for this task"}
    except Exception as e:
        logger.error(f"Failed to broadcast task status change: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)