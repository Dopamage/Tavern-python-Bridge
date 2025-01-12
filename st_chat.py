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
        self.connected = False
        
    async def handle_client(self, websocket):
        """Handle a client connection"""
        self.websocket = websocket
        self.connected = True
        print("\nConnected to SillyTavern!")
        print("Type your messages below. Type 'exit' to quit.")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data["type"] == "bot_response":
                        print(f"\nBot: {data['content']}")
                        print("\nYou: ", end="", flush=True)
                except json.JSONDecodeError:
                    print(f"\nError: Invalid message format")
                except Exception as e:
                    print(f"\nError handling message: {e}")
        except websockets.exceptions.ConnectionClosed:
            print("\nDisconnected from SillyTavern")
        finally:
            self.connected = False
            self.websocket = None
            
    async def send_message(self, message):
        """Send a message to SillyTavern"""
        if not self.connected or not self.websocket:
            print("\nNot connected to SillyTavern")
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

async def main():
    chat = SillyTavernChat()
    print(f"\nStarting WebSocket server on port {chat.port}...")
    
    async with websockets.serve(chat.handle_client, "localhost", chat.port):
        print(f"Server is running. Waiting for SillyTavern to connect...")
        
        while True:
            try:
                if chat.connected:
                    message = await asyncio.get_event_loop().run_in_executor(None, lambda: input("\nYou: "))
                    
                    if message.lower() == "exit":
                        break
                        
                    if message.strip():
                        await chat.send_message(message)
                else:
                    await asyncio.sleep(1)  # Wait for connection
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"\nError: {e}")
                if not chat.connected:
                    await asyncio.sleep(1)  # Wait before retrying

if __name__ == "__main__":
    try:
        check_and_install_packages()
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nChat ended by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 