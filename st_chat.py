import sys
import subprocess
import requests
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

class SillyTavernChat:
    def __init__(self, port=5001):
        self.base_url = f"http://localhost:{port}"
        
    def send_message(self, message):
        """Send a message to SillyTavern"""
        try:
            response = requests.post(
                f"{self.base_url}/send_message",
                json={"content": message},
                timeout=30
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"\nError sending message: {e}")
            return False

def main():
    chat = SillyTavernChat()
    print("\nChat started! Type 'exit' to quit.")
    
    while True:
        try:
            message = input("\nYou: ")
            
            if message.lower() == "exit":
                break
                
            if message.strip():
                if chat.send_message(message):
                    print("Message sent successfully!")
                else:
                    print("Failed to send message. Make sure SillyTavern is running and the extension is enabled.")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    try:
        check_and_install_packages()
        main()
    except KeyboardInterrupt:
        print("\nChat ended by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 