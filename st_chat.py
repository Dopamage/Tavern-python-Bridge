import asyncio
import websockets
import json
import sys
import os
from typing import Callable, Dict, List, Optional, Any

class SillyTavernBridge:
    def __init__(self, websocket_url="ws://localhost:5001"):
        self.websocket_url = websocket_url
        self.websocket = None
        self.running = False
        self.message_callbacks: List[Callable[[str, str], None]] = []
        self.response_callbacks: List[Callable[[str], None]] = []
        self.error_callbacks: List[Callable[[str], None]] = []
        
    def add_message_callback(self, callback: Callable[[str, str], None]):
        """Add a callback for when messages are sent. Callback receives (author, message)"""
        self.message_callbacks.append(callback)
        
    def add_response_callback(self, callback: Callable[[str], None]):
        """Add a callback for when bot responds. Callback receives the response text"""
        self.response_callbacks.append(callback)
        
    def add_error_callback(self, callback: Callable[[str], None]):
        """Add a callback for error handling. Callback receives error message"""
        self.error_callbacks.append(callback)
        
    def _handle_error(self, error_msg: str):
        for callback in self.error_callbacks:
            try:
                callback(error_msg)
            except Exception as e:
                print(f"Error in error callback: {e}")
        
    async def connect(self) -> bool:
        try:
            self.websocket = await websockets.connect(self.websocket_url)
            print("Connected to SillyTavern")
            return True
        except Exception as e:
            error_msg = f"Failed to connect: {e}"
            self._handle_error(error_msg)
            return False
            
    async def send_message(self, message: str, author: str = "User") -> bool:
        if not self.websocket:
            return False
            
        try:
            # Notify callbacks
            for callback in self.message_callbacks:
                try:
                    callback(author, message)
                except Exception as e:
                    self._handle_error(f"Error in message callback: {e}")
            
            # Send to SillyTavern
            await self.websocket.send(json.dumps({
                "type": "send_message",
                "content": message
            }))
            return True
        except Exception as e:
            error_msg = f"Failed to send message: {e}"
            self._handle_error(error_msg)
            return False
            
    async def receive_messages(self):
        while self.running:
            try:
                message = await self.websocket.recv()
                data = json.loads(message)
                if data["type"] == "bot_response":
                    response = data["content"]
                    
                    # Notify callbacks
                    for callback in self.response_callbacks:
                        try:
                            callback(response)
                        except Exception as e:
                            self._handle_error(f"Error in response callback: {e}")
                    
                    # Default console output
                    print("\nBot:", response)
                    print("\nYou: ", end="", flush=True)
                    
            except websockets.exceptions.ConnectionClosed:
                error_msg = "\nConnection closed. Attempting to reconnect..."
                self._handle_error(error_msg)
                await self.connect()
            except Exception as e:
                error_msg = f"\nError receiving message: {e}"
                self._handle_error(error_msg)

class ConsoleChat:
    def __init__(self, bridge: SillyTavernBridge):
        self.bridge = bridge
        
    async def start_chat(self):
        if not await self.bridge.connect():
            return
            
        self.bridge.running = True
        
        # Start message receiver in background
        asyncio.create_task(self.bridge.receive_messages())
        
        print("\nChat started! Type 'exit' to quit.")
        print("You: ", end="", flush=True)
        
        while self.bridge.running:
            try:
                message = await asyncio.get_event_loop().run_in_executor(None, input)
                
                if message.lower() == "exit":
                    self.bridge.running = False
                    break
                    
                if message.strip():
                    await self.bridge.send_message(message)
                    
            except KeyboardInterrupt:
                self.bridge.running = False
                break
            except Exception as e:
                print(f"\nError: {e}")
                
        if self.bridge.websocket:
            await self.bridge.websocket.close()

# Example usage with callbacks
def example_message_callback(author: str, message: str):
    print(f"Message callback: {author} said: {message}")
    
def example_response_callback(response: str):
    print(f"Response callback: Got response: {response}")
    
def example_error_callback(error: str):
    print(f"Error callback: {error}")
            
async def main():
    # Create bridge with callbacks
    bridge = SillyTavernBridge()
    bridge.add_message_callback(example_message_callback)
    bridge.add_response_callback(example_response_callback)
    bridge.add_error_callback(example_error_callback)
    
    # Create and start console chat
    chat = ConsoleChat(bridge)
    await chat.start_chat()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nChat ended by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 