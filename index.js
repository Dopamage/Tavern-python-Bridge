// Python Bridge Extension for SillyTavern
import { getContext, extension_settings, saveSettingsDebounced } from '../../../../script.js';
import { registerSlashCommand } from '../../../slash-commands.js';
import { eventSource } from '../../../../script.js';

// Extension initialization
jQuery(async () => {
    // Default settings
    const defaultSettings = {
        enabled: false,
        port: 5001,
    };

    // Merge settings
    extension_settings.python_bridge = extension_settings.python_bridge || {};
    Object.assign(extension_settings.python_bridge, defaultSettings);

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
                toastr.success('Connected to Python server');
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
                if (extension_settings.python_bridge.enabled) {
                    setTimeout(connectWebSocket, 5000);
                }
            };

            ws.onerror = (error) => {
                console.error('[Python Bridge] WebSocket error:', error);
                toastr.error('Failed to connect to Python server');
            };
        } catch (error) {
            console.error('[Python Bridge] Failed to connect:', error);
            if (extension_settings.python_bridge.enabled) {
                setTimeout(connectWebSocket, 5000);
            }
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

    // Register slash command
    registerSlashCommand('python-bridge', async (args) => {
        try {
            const enabled = args.length > 0 ? args[0].toLowerCase() === 'on' : !extension_settings.python_bridge.enabled;
            extension_settings.python_bridge.enabled = enabled;
            saveSettingsDebounced();
            
            if (enabled) {
                await connectWebSocket();
                return 'Python Bridge enabled - Connecting to Python server...';
            } else {
                if (ws) {
                    ws.close();
                    ws = null;
                }
                return 'Python Bridge disabled';
            }
        } catch (error) {
            console.error('[Python Bridge] Command error:', error);
            return 'Error executing command. Check console for details.';
        }
    }, [], 'Toggle Python Bridge extension', true, true);

    console.log('[Python Bridge] Extension loaded');
    if (extension_settings.python_bridge.enabled) {
        console.log('[Python Bridge] Extension is enabled, attempting connection...');
        await connectWebSocket();
    } else {
        console.log('[Python Bridge] Extension is disabled');
    }
}); 