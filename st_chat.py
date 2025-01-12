import sys
import subprocess
import asyncio
import json
import websockets

def install_package(package_name):
    print(f"Installing {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print(f"Successfully installed {package_name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing {package_name}: {e}")
        return False

def check_and_install_packages():
    print("Checking required packages...")
    required_packages = ['websockets']
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            if not install_package(package):
                print(f"Failed to install {package}. Please install it manually using:")
                print(f"pip install {package}")
                sys.exit(1)
    
    print("All required packages are installed!")

class SillyTavernChat:
    def __init__(self, port=5001):
        self.port = port
        self.websocket = None
        
    async def connect(self):
        """Connect to SillyTavern WebSocket server"""
        try:
            self.websocket = await websockets.connect(f"ws://localhost:{self.port}")
            return True
        except Exception as e:
            print(f"\nError connecting: {e}")
            return False
            
    async def send_message(self, message):
        """Send a message to SillyTavern"""
        if not self.websocket:
            print("Not connected to SillyTavern")
            return False
            
        try:
            await self.websocket.send(json.dumps({
                "type": "send_message",
                "content": message
            }))
            return True
        except Exception as e:
            print(f"\nError sending message: {e}")
            return False
            
    async def receive_messages(self):
        """Receive messages from SillyTavern"""
        try:
            while True:
                message = await self.websocket.recv()
                data = json.loads(message)
                if data["type"] == "bot_response":
                    print(f"\nBot: {data['content']}")
                    print("\nYou: ", end="", flush=True)
        except Exception as e:
            print(f"\nError receiving messages: {e}")
            return False

async def main():
    chat = SillyTavernChat()
    print("\nConnecting to SillyTavern...")
    
    if not await chat.connect():
        print("Failed to connect. Make sure SillyTavern is running and the extension is enabled.")
        return
        
    print("Connected! Type 'exit' to quit.")
    
    # Start receiving messages in the background
    receive_task = asyncio.create_task(chat.receive_messages())
    
    while True:
        try:
            message = await asyncio.get_event_loop().run_in_executor(None, lambda: input("\nYou: "))
            
            if message.lower() == "exit":
                break
                
            if message.strip():
                if await chat.send_message(message):
                    pass  # Message sent successfully, wait for bot response
                else:
                    print("Failed to send message. Make sure SillyTavern is running and the extension is enabled.")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nError: {e}")
            
    # Clean up
    receive_task.cancel()
    if chat.websocket:
        await chat.websocket.close()

if __name__ == "__main__":
    try:
        check_and_install_packages()
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nChat ended by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 