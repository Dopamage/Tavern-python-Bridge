// Python Bridge Extension for SillyTavern
import { getContext, extension_settings, saveSettingsDebounced, eventSource } from '../../../script.js';

// Default settings
extension_settings.python_bridge = {
    port: 5001
};

let ws = null;

async function connectWebSocket() {
    if (ws) {
        ws.close();
    }

    try {
        ws = new WebSocket(`ws://localhost:${extension_settings.python_bridge.port}`);
        console.log(`[Python Bridge] Connecting to WebSocket server on port ${extension_settings.python_bridge.port}`);

        ws.onopen = () => {
            console.log('[Python Bridge] Connected to Python server');
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'send_message') {
                    const context = getContext();
                    await context.sendMessage(data.content);
                }
            } catch (error) {
                console.error('[Python Bridge] Error processing message:', error);
            }
        };

        ws.onclose = () => {
            console.log('[Python Bridge] Disconnected from Python server');
            setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (error) => {
            console.error('[Python Bridge] WebSocket error:', error);
        };
    } catch (error) {
        console.error('[Python Bridge] Failed to connect:', error);
        setTimeout(connectWebSocket, 5000);
    }
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

// Initialize connection
jQuery(() => {
    console.log('[Python Bridge] Extension loaded');
    connectWebSocket();
}); 