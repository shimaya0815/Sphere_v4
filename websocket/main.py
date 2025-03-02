import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import logging
from pydantic import BaseModel
import dj_database_url
import os
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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

# Setup database connection
DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://postgres:postgres@db:5432/sphere")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define SQLAlchemy models
class Message(Base):
    __tablename__ = "chat_message"
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("chat_channel.id"))
    user_id = Column(Integer, ForeignKey("users_user.id"))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_edited = Column(Boolean, default=False)
    parent_message_id = Column(Integer, ForeignKey("chat_message.id"), nullable=True)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

@app.get("/")
async def root():
    return {"message": "Sphere WebSocket Server"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)