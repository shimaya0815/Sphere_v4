import json
import asyncio
import os
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

# Add CORS middleware with improved settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    allow_headers=["X-Requested-With", "X-HTTP-Method-Override", "Content-Type", 
                  "Accept", "Authorization", "X-CSRF-Token"],
    expose_headers=["Content-Disposition"],
    max_age=600,  # 10分キャッシュ（オプション検証を減らす）
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
        # 最大接続数を制限
        self.max_connections_per_channel = 5
        # 最後のクリーンアップタイムスタンプ
        self.last_cleanup = datetime.now()
        
    async def cleanup_inactive_connections(self):
        """
        非アクティブな接続を定期的にクリーンアップ
        """
        # 一定時間ごとにクリーンアップを実行（10秒に1回まで）
        now = datetime.now()
        if (now - self.last_cleanup).total_seconds() < 10:
            return
            
        self.last_cleanup = now
        logger.info("🧹 Running periodic connection cleanup...")
        
        # すべてのチャンネルをチェック
        for channel_id, connections in list(self.active_connections.items()):
            if len(connections) > self.max_connections_per_channel:
                # 最新の接続を除くすべての接続を閉じる
                logger.info(f"🚨 Channel {channel_id} has too many connections ({len(connections)}), cleaning up")
                
                # 保持する最新の接続
                newest_connections = connections[-self.max_connections_per_channel:]
                to_close = connections[:-self.max_connections_per_channel]
                
                # 古い接続を閉じる
                for old_ws in to_close:
                    try:
                        logger.info(f"🔌 Forcibly closing excess connection for channel {channel_id}")
                        await old_ws.close(code=1000, reason="Connection limit exceeded")
                        
                        # 接続IDマッピングの削除
                        ws_id = id(old_ws)
                        if ws_id in self.connection_ids:
                            del self.connection_ids[ws_id]
                    except Exception as e:
                        logger.error(f"Error closing excess connection: {str(e)}")
                
                # アクティブ接続リストを更新
                self.active_connections[channel_id] = newest_connections
                logger.info(f"📊 Channel {channel_id} now has {len(newest_connections)} connections after cleanup")
        
        # 総接続数をログに記録
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        logger.info(f"📊 Total active connections after cleanup: {total_connections}")
        
    async def register_connection(self, websocket: WebSocket, channel_id: int) -> str:
        """
        新しい接続を登録し、他の古い接続を切断
        """
        # 非アクティブな接続のクリーンアップを実行
        await self.cleanup_inactive_connections()
        
        # 一意の接続IDを生成
        conn_id = f"{channel_id}-{id(websocket)}-{datetime.now().timestamp()}"
        
        # 既存の接続を管理
        if channel_id in self.active_connections:
            # チャンネルの接続数をチェック
            if len(self.active_connections[channel_id]) >= self.max_connections_per_channel:
                logger.info(f"🚨 Channel {channel_id} has reached connection limit, removing oldest connection")
                try:
                    # 最も古い接続を取得して閉じる
                    oldest_connection = self.active_connections[channel_id][0]
                    await oldest_connection.close(code=1000, reason="Connection limit exceeded")
                    
                    # 接続リストから削除
                    self.active_connections[channel_id].pop(0)
                    
                    # 接続IDマッピングの削除
                    ws_id = id(oldest_connection)
                    if ws_id in self.connection_ids:
                        del self.connection_ids[ws_id]
                except Exception as e:
                    logger.error(f"Error closing oldest connection: {str(e)}")
            
            # このチャンネルの古い接続を全て閉じる - 適切な接続数管理
            if len(self.active_connections[channel_id]) > 0:
                logger.info(f"🧹 Cleaning up duplicate client connections for channel {channel_id}")
                
                # 現在のクライアントIPを取得
                client_id = id(websocket)
                
                # 同じクライアントIDからの古い接続を閉じる
                for i, old_ws in enumerate(self.active_connections[channel_id].copy()):
                    try:
                        old_ws_id = id(old_ws)
                        # 同じクライアントからの過去の接続を削除
                        if old_ws_id != client_id:
                            continue
                            
                        logger.info(f"🔌 Closing duplicate connection {old_ws_id} for channel {channel_id}")
                        await old_ws.close(code=1000, reason="New connection from same client")
                        
                        # リストから削除
                        if old_ws in self.active_connections[channel_id]:
                            self.active_connections[channel_id].remove(old_ws)
                        
                        # 接続IDマッピングの削除
                        if old_ws_id in self.connection_ids:
                            del self.connection_ids[old_ws_id]
                    except Exception as e:
                        logger.error(f"Error closing duplicate connection: {str(e)}")
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

    async def disconnect(self, websocket: WebSocket, channel_id: int):
        try:
            # 接続IDを記録
            ws_id = id(websocket)
            conn_id = self.connection_ids.get(ws_id, "unknown")
            
            if channel_id in self.active_connections:
                # 接続がリストにある場合に削除
                if websocket in self.active_connections[channel_id]:
                    self.active_connections[channel_id].remove(websocket)
                    logger.info(f"🔌 Client disconnected from channel {channel_id} (conn_id: {conn_id})")
                    
                    # 接続のクローズを確実に
                    try:
                        if websocket.client_state != WebSocket.DISCONNECTED:
                            await websocket.close(code=1000, reason="Server initiated disconnect")
                    except Exception as close_error:
                        logger.warning(f"Error during explicit WebSocket close: {close_error}")
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
        
        # 接続が多すぎる場合は強制的にクリーンアップ
        if total_connections > 20:  # システム全体の許容最大接続数
            await self.cleanup_inactive_connections()

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
    
    # コネクション開始前にタイムアウトを設定
    connection_timeout = asyncio.create_task(asyncio.sleep(10))  # 10秒のタイムアウト
    connection_succeeded = asyncio.Event()
    
    try:
        # 明示的にWebSocket接続を受け入れる
        await websocket.accept()
        logger.info(f"✅ WebSocket connection handshake accepted for channel {channel_id}")
        
        # タイムアウトを解除
        connection_succeeded.set()
        
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
                "timestamp": datetime.now().isoformat(),
                "server_info": {
                    "max_connections_per_channel": manager.max_connections_per_channel,
                    "total_connections": sum(len(connections) for connections in manager.active_connections.values())
                }
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
            await manager.disconnect(websocket, channel_id)
            return
        
        # メッセージ受信ループと定期的なPingの両方を実行
        ping_interval = 30  # 30秒ごとにpingを送信
        last_ping_time = datetime.now()
        
        # メッセージ受信ループ
        try:
            while True:
                # メッセージ受信と定期ping送信の両方を待機
                receive_task = asyncio.create_task(websocket.receive_text())
                
                # 現在時刻を取得
                now = datetime.now()
                
                # 最後のping送信からの経過時間を計算
                time_since_last_ping = (now - last_ping_time).total_seconds()
                
                # 次のping送信までの待機時間を計算
                wait_time = max(0, ping_interval - time_since_last_ping)
                
                # Pingタイマーを設定
                ping_timer = asyncio.create_task(asyncio.sleep(wait_time))
                
                # メッセージ受信またはping送信のどちらか早い方を待機
                done, pending = await asyncio.wait(
                    [receive_task, ping_timer],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # 完了していないタスクをキャンセル
                for task in pending:
                    task.cancel()
                
                # メッセージを受信した場合
                if receive_task in done:
                    try:
                        data = receive_task.result()
                        logger.info(f"Received message from client: {data[:100]}...")
                        
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
                            # Pingを受信したら最後のping時間を更新
                            last_ping_time = datetime.now()
                            logger.info(f"Responded to ping from client")
                        else:
                            logger.warning(f"Unknown message type: {message_obj.type}")
                    except json.JSONDecodeError:
                        logger.error("Failed to parse message as JSON")
                    except Exception as e:
                        logger.error(f"Error processing message: {str(e)}")
                
                # ping送信時間になった場合
                if ping_timer in done:
                    try:
                        await websocket.send_json({
                            "type": "ping",
                            "status": "active",
                            "timestamp": datetime.now().isoformat()
                        })
                        last_ping_time = datetime.now()
                        logger.info(f"Sent ping to channel {channel_id}")
                    except Exception as e:
                        logger.error(f"Failed to send ping: {str(e)}")
                        # ping送信に失敗した場合は接続が切れている可能性が高い
                        raise WebSocketDisconnect(code=1001, reason="Failed to send ping")
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected normally for channel {channel_id}")
            await manager.disconnect(websocket, channel_id)
        except asyncio.CancelledError:
            logger.info(f"WebSocket connection cancelled for channel {channel_id}")
            await manager.disconnect(websocket, channel_id)
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket communication: {str(e)}")
            await manager.disconnect(websocket, channel_id)
    except asyncio.CancelledError:
        # 接続タイムアウト処理
        if not connection_succeeded.is_set():
            logger.error(f"WebSocket connection timeout for channel {channel_id}")
            try:
                await websocket.close(code=1000, reason="Connection timeout")
            except:
                pass
    except Exception as e:
        logger.error(f"Failed to establish WebSocket connection: {str(e)}")
        # 接続確立に失敗した場合はここで終了
        try:
            await websocket.close(code=1011, reason="Server error")
        except:
            pass
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
    
    # コネクション開始前にタイムアウトを設定
    connection_timeout = asyncio.create_task(asyncio.sleep(10))  # 10秒のタイムアウト
    connection_succeeded = asyncio.Event()
    
    try:
        # 明示的にWebSocket接続を受け入れる
        await websocket.accept()
        logger.info(f"✅ WebSocket task connection handshake accepted for task {task_id}")
        
        # タイムアウトを解除
        connection_succeeded.set()
        
        # マネージャーに接続を登録（コメントのブロードキャスト用）
        conn_id = await manager.register_connection(websocket, task_id)
        logger.info(f"📝 Registered task connection {conn_id} for task {task_id}")
        
        # 接続確認メッセージを送信
        try:
            await websocket.send_json({
                "type": "connection_established",
                "data": {
                    "message": "Connected to task WebSocket server",
                    "task_id": task_id,
                    "connection_id": conn_id,
                    "timestamp": datetime.now().isoformat()
                }
            })
            logger.info(f"Welcome message sent to task {task_id}")
            
            # 即座にpingも送信して接続をテスト
            await websocket.send_json({
                "type": "ping",
                "data": {
                    "timestamp": datetime.now().isoformat(),
                    "task_id": task_id
                }
            })
            logger.info(f"🏓 Initial ping sent to task {task_id}")
        except Exception as e:
            logger.error(f"Error sending task welcome message: {str(e)}")
            # 接続に問題がある場合は早期終了
            await manager.disconnect(websocket, task_id)
            return
        
        # メッセージ受信ループと定期的なPingの両方を実行
        ping_interval = 30  # 30秒ごとにpingを送信
        last_ping_time = datetime.now()
        
        # メッセージ受信ループ
        try:
            while True:
                # メッセージ受信と定期ping送信の両方を待機
                receive_task = asyncio.create_task(websocket.receive_text())
                
                # 現在時刻を取得
                now = datetime.now()
                
                # 最後のping送信からの経過時間を計算
                time_since_last_ping = (now - last_ping_time).total_seconds()
                
                # 次のping送信までの待機時間を計算
                wait_time = max(0, ping_interval - time_since_last_ping)
                
                # Pingタイマーを設定
                ping_timer = asyncio.create_task(asyncio.sleep(wait_time))
                
                # メッセージ受信またはping送信のどちらか早い方を待機
                done, pending = await asyncio.wait(
                    [receive_task, ping_timer],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # 完了していないタスクをキャンセル
                for task in pending:
                    task.cancel()
                
                # メッセージを受信した場合
                if receive_task in done:
                    try:
                        data = receive_task.result()
                        logger.info(f"Received task message from client: {data[:100]}...")
                        
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
                                    "task_id": task_id,
                                    "server_received": message_data.get("data", {}).get("timestamp", "unknown")
                                }
                            })
                            # Pingを受信したら最後のping時間を更新
                            last_ping_time = datetime.now()
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
                
                # ping送信時間になった場合
                if ping_timer in done:
                    try:
                        await websocket.send_json({
                            "type": "ping",
                            "data": {
                                "timestamp": datetime.now().isoformat(),
                                "task_id": task_id
                            }
                        })
                        last_ping_time = datetime.now()
                        logger.info(f"Sent ping to task {task_id}")
                    except Exception as e:
                        logger.error(f"Failed to send ping to task: {str(e)}")
                        # ping送信に失敗した場合は接続が切れている可能性が高い
                        raise WebSocketDisconnect(code=1001, reason="Failed to send ping")
                
        except WebSocketDisconnect:
            logger.info(f"Client disconnected from task {task_id} channel")
            await manager.disconnect(websocket, task_id)
        except asyncio.CancelledError:
            logger.info(f"Task WebSocket connection cancelled for task {task_id}")
            await manager.disconnect(websocket, task_id)
        except Exception as e:
            logger.error(f"Unexpected error in task socket: {str(e)}")
            await manager.disconnect(websocket, task_id)
    except asyncio.CancelledError:
        # 接続タイムアウト処理
        if not connection_succeeded.is_set():
            logger.error(f"WebSocket task connection timeout for task {task_id}")
            try:
                await websocket.close(code=1000, reason="Connection timeout")
            except:
                pass
    except Exception as e:
        logger.error(f"Failed to establish task WebSocket connection: {str(e)}")
        # 接続確立に失敗した場合はここで終了
        try:
            await websocket.close(code=1011, reason="Server error")
        except:
            pass

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