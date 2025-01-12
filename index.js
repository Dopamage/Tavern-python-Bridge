// Python Bridge Extension for SillyTavern
import { getContext, extension_settings, saveSettingsDebounced } from '../../../script.js';

// Extend the extension settings
extension_settings.python_bridge = {
    port: 5001,
    enabled: true,
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

// Handle bot responses
jQuery(document).ready(function() {
    const messageHandler = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            const nodes = mutation.addedNodes;
            nodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('mes')) {
                    if (node.classList.contains('bot')) {
                        const messageText = node.querySelector('.mes_text').innerText;
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'bot_response',
                                content: messageText
                            }));
                        }
                    }
                }
            });
        });
    });

    // Start observing chat messages
    const chat = document.getElementById('chat');
    if (chat) {
        messageHandler.observe(chat, { childList: true, subtree: true });
    }

    // Start WebSocket connection
    connectWebSocket();
}); 