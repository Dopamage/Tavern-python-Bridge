import { getContext } from '../extensions.js';
import { extension_settings } from '../extensions.js';
import { saveSettingsDebounced } from '../extensions.js';
import { registerSlashCommand } from '../slash-commands.js';
import { eventSource } from '../extensions.js';

// Default settings
const defaultSettings = {
    enabled: true,
    port: 5001,
};

// Extension settings
extension_settings.python_bridge = extension_settings.python_bridge || {};
Object.assign(extension_settings.python_bridge, defaultSettings);

let ws = null;
let wsServer = null;

async function setupWebSocket() {
    if (wsServer) {
        wsServer.close();
    }

    // Create WebSocket server
    wsServer = new WebSocket.Server({ port: extension_settings.python_bridge.port });
    console.log(`[Python Bridge] WebSocket server started on port ${extension_settings.python_bridge.port}`);

    wsServer.on('connection', (socket) => {
        console.log('[Python Bridge] Client connected');
        ws = socket;

        socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'send_message') {
                    // Insert message into chat
                    const context = getContext();
                    await context.sendMessage(data.content);
                }
            } catch (error) {
                console.error('[Python Bridge] Error processing message:', error);
            }
        });

        socket.on('close', () => {
            console.log('[Python Bridge] Client disconnected');
            ws = null;
        });
    });
}

// Listen for bot responses
eventSource.on('message_received', (messageData) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'bot_response',
            content: messageData.message
        }));
    }
});

// Register slash command to toggle extension
registerSlashCommand('python-bridge', (args) => {
    const enabled = args.length > 0 ? args[0].toLowerCase() === 'on' : !extension_settings.python_bridge.enabled;
    extension_settings.python_bridge.enabled = enabled;
    saveSettingsDebounced();
    
    if (enabled) {
        setupWebSocket();
        return 'Python Bridge enabled';
    } else {
        if (wsServer) {
            wsServer.close();
            wsServer = null;
        }
        return 'Python Bridge disabled';
    }
}, [], 'Toggle Python Bridge extension', true, true);

// Initialize WebSocket server if enabled
if (extension_settings.python_bridge.enabled) {
    setupWebSocket();
} 