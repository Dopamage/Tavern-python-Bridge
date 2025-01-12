import sys
import subprocess
import requests
import json
import threading
import time

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
    required_packages = ['requests']
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            if not install_package(package):
                print(f"Failed to install {package}. Please install it manually using:")
                print(f"pip install {package}")
                sys.exit(1)
    
    print("All required packages are installed!")

class SillyTavernAPI:
    def __init__(self, base_url="http://localhost:5100"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def check_connection(self):
        """Check if we can connect to SillyTavern-extras API"""
        try:
            response = self.session.get(f"{self.base_url}/api/modules")
            if response.ok:
                modules = response.json()["modules"]
                print(f"Connected to SillyTavern-extras! Available modules: {', '.join(modules)}")
                return True
        except Exception as e:
            print(f"Error connecting to SillyTavern-extras: {e}")
        return False
        
    def send_message(self, message):
        """Send a message to SillyTavern"""
        try:
            # First, let's classify the sentiment of the message
            response = self.session.post(
                f"{self.base_url}/api/classify",
                json={"text": message}
            )
            if response.ok:
                sentiment = response.json()["classification"][0]["label"]
                print(f"Message sentiment: {sentiment}")
            
            # Then, let's get a summary if the message is long
            if len(message) > 200:
                response = self.session.post(
                    f"{self.base_url}/api/summarize",
                    json={"text": message}
                )
                if response.ok:
                    summary = response.json()["summary"]
                    print(f"Message summary: {summary}")
            
            return True
        except Exception as e:
            print(f"Error sending message: {e}")
            return False

def input_thread(api):
    """Handle user input in a separate thread"""
    print("\nChat started! Type 'exit' to quit.")
    print("You: ", end="", flush=True)
    
    while True:
        try:
            message = input()
            
            if message.lower() == "exit":
                print("\nExiting...")
                sys.exit(0)
                
            if message.strip():
                if api.send_message(message):
                    print("Message sent!")
                else:
                    print("Failed to send message. Make sure SillyTavern-extras is running.")
                print("\nYou: ", end="", flush=True)
                
        except KeyboardInterrupt:
            print("\nExiting...")
            sys.exit(0)
        except Exception as e:
            print(f"\nError: {e}")

def main():
    try:
        check_and_install_packages()
        
        # Connect to SillyTavern-extras API
        api = SillyTavernAPI()
        
        # Wait for SillyTavern-extras to start
        print("\nWaiting for SillyTavern-extras to start...")
        while not api.check_connection():
            time.sleep(5)
            print("Retrying connection...")
        
        # Start input thread
        input_thread_obj = threading.Thread(target=input_thread, args=(api,), daemon=True)
        input_thread_obj.start()
        
        # Keep the main thread alive
        input_thread_obj.join()
        
    except KeyboardInterrupt:
        print("\nChat ended by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 