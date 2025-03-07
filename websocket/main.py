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
        # 接続管理を改善 - 新規作成
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # 接続IDでWebSocketを追跡
        self.connection_ids = {}
        # チャンネルごとの最新接続を追跡
        self.latest_connections = {}
        
    async def register_connection(self, websocket: WebSocket, channel_id: int) -> str:
        """
        新しい接続を登録し、他の古い接続を切断
        """
        # 一意の接続IDを生成
        conn_id = f"{channel_id}-{id(websocket)}-{datetime.now().timestamp()}"
        
        # 既存の接続を管理
        if channel_id in self.active_connections:
            # このチャンネルの古い接続を全て閉じる（現在の接続が最新）
            if channel_id in self.latest_connections:
                old_conn_id = self.latest_connections[channel_id]
                # 古い接続と異なる場合のみクリーンアップ
                if old_conn_id != conn_id:
                    logger.info(f"🧹 Cleaning up old connections for channel {channel_id}")
                    # 古い接続の配列をコピー
                    old_connections = self.active_connections[channel_id].copy()
                    # 新しい接続配列を作成
                    self.active_connections[channel_id] = []
                    
                    # 古い接続を切断
                    for old_ws in old_connections:
                        try:
                            old_ws_id = id(old_ws)
                            # この接続と違う接続なら閉じる
                            if old_ws_id != id(websocket):
                                logger.info(f"🔌 Closing old connection {old_ws_id} for channel {channel_id}")
                                await old_ws.close(code=1000, reason="New connection established")
                        except Exception as e:
                            logger.error(f"Error closing old connection: {str(e)}")
        else:
            # 新しいチャンネル用の配列を初期化
            self.active_connections[channel_id] = []
            
        # 接続を追加
        self.active_connections[channel_id].append(websocket)
        self.connection_ids[id(websocket)] = conn_id
        self.latest_connections[channel_id] = conn_id
        
        logger.info(f"📊 Channel {channel_id} now has {len(self.active_connections[channel_id])} connections")
        return conn_id
            
    async def connect(self, websocket: WebSocket, channel_id: int):
        """互換性のために残す"""
        logger.warning("⚠️ connect method called directly - use register_connection instead")
        await self.register_connection(websocket, channel_id)
        return True

    def disconnect(self, websocket: WebSocket, channel_id: int):
        try:
            # 接続IDを記録
            ws_id = id(websocket)
            conn_id = self.connection_ids.get(ws_id, "unknown")
            
            if channel_id in self.active_connections:
                # 接続がリストにある場合に削除
                if websocket in self.active_connections[channel_id]:
                    self.active_connections[channel_id].remove(websocket)
                    logger.info(f"🔌 Client disconnected from channel {channel_id} (conn_id: {conn_id})")
                else:
                    logger.warning(f"⚠️ Attempted to disconnect a WebSocket that was not in channel {channel_id}")
                
                # チャンネルが空になった場合、辞書からキーを削除
                if not self.active_connections[channel_id]:
                    del self.active_connections[channel_id]
                    if channel_id in self.latest_connections:
                        del self.latest_connections[channel_id]
                    logger.info(f"📦 Channel {channel_id} has no more connections, removed from tracking")
            else:
                logger.warning(f"⚠️ Attempted to disconnect from non-existent channel {channel_id}")
            
            # 接続IDを削除
            if ws_id in self.connection_ids:
                del self.connection_ids[ws_id]
                
        except Exception as e:
            logger.error(f"❌ Error in disconnect method: {str(e)}")
            
        # 全体のアクティブ接続数をログに記録
        total_connections = sum(len(connections) for connections in self.active_connections.values()) if self.active_connections else 0
        logger.info(f"📊 Total active connections across all channels: {total_connections}")
        
        # 残っている接続IDの数も記録
        logger.info(f"📊 Tracked connection IDs: {len(self.connection_ids)}")
        
        # 管理されているチャンネル数も記録
        logger.info(f"📊 Active channels: {len(self.active_connections)}")

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
    # 接続情報を記録
    client = f"{websocket.client.host}:{websocket.client.port}"
    headers = dict(websocket.headers)
    origin = headers.get('origin', 'unknown')
    logger.info(f"⚡ WebSocket connection attempt from {client}, Origin: {origin}")
    
    try:
        # 明示的にWebSocket接続を受け入れる
        await websocket.accept()
        logger.info(f"✅ WebSocket connection handshake accepted for channel {channel_id}")
        
        # 新しい管理メソッドで接続を登録（古い接続は自動的に閉じられる）
        conn_id = await manager.register_connection(websocket, channel_id)
        logger.info(f"📝 Registered connection {conn_id} for channel {channel_id}")
        
        # 確認メッセージを送信 - クライアントが接続確立を認識するため
        try:
            await websocket.send_json({
                "type": "connection_established",
                "status": "connected",
                "channel_id": channel_id,
                "connection_id": conn_id,
                "timestamp": datetime.now().isoformat()
            })
            logger.info(f"📨 Welcome message sent to channel {channel_id}")
            
            # 即座にpingも送信して接続をテスト
            await websocket.send_json({
                "type": "ping",
                "status": "active",
                "timestamp": datetime.now().isoformat()
            })
            logger.info(f"🏓 Initial ping sent to channel {channel_id}")
        except Exception as e:
            logger.error(f"❌ Error in initial communication: {str(e)}")
            manager.disconnect(websocket, channel_id)
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