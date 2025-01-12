import sys
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
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
    required_packages = ['flask', 'flask-cors']
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            if not install_package(package):
                print(f"Failed to install {package}. Please install it manually using:")
                print(f"pip install {package}")
                sys.exit(1)
    
    print("All required packages are installed!")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/message', methods=['POST'])
def receive_message():
    try:
        data = request.json
        if data["type"] == "bot_response":
            print(f"\nBot: {data['content']}")
            print("\nYou: ", end="", flush=True)
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"\nError processing message: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

def send_message_to_tavern(message):
    try:
        context = getContext()
        context.sendMessage(message)
        return True
    except Exception as e:
        print(f"\nError sending message: {e}")
        return False

def input_thread():
    while True:
        try:
            message = input("\nYou: ")
            
            if message.lower() == "exit":
                print("\nExiting...")
                sys.exit(0)
                
            if message.strip():
                print("Message sent!")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            sys.exit(0)
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    try:
        check_and_install_packages()
        
        # Start input thread
        input_thread = threading.Thread(target=input_thread, daemon=True)
        input_thread.start()
        
        # Start Flask server
        print("\nStarting server on port 5001...")
        app.run(host='localhost', port=5001)
        
    except KeyboardInterrupt:
        print("\nChat ended by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 