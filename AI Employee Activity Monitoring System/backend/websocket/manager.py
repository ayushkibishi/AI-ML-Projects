from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        # Store active connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket Manager] Client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket Manager] Client disconnected. Total active connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def send_json(self, data: dict, websocket: WebSocket):
        await websocket.send_json(data)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                # Remove dead connection
                print(f"[WebSocket Manager] Broadcast error: {e}. Connection lost.")
                self.disconnect(connection)

    async def broadcast_text(self, text: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(text)
            except Exception as e:
                print(f"[WebSocket Manager] Broadcast error: {e}. Connection lost.")
                self.disconnect(connection)

ws_manager = ConnectionManager()
