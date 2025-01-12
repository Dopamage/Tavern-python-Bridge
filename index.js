import { getContext } from '../../../extensions.js';
import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../extensions.js';
import { eventSource } from '../../../extensions.js';

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
        $('#python_bridge_status').text('Connected').css('color', 'green');

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
            $('#python_bridge_status').text('Disconnected').css('color', 'red');
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

// Add UI elements
jQuery(async () => {
    const settingsHtml = `
        <div class="python_bridge_block">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Python Bridge</b>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input type="checkbox" id="python_bridge_enabled" ${extension_settings.python_bridge.enabled ? 'checked' : ''}>
                        Enable Python Bridge
                    </label>
                    <div>Status: <span id="python_bridge_status">Disconnected</span></div>
                </div>
            </div>
        </div>`;

    $('#extensions_settings2').append(settingsHtml);

    // Event handler for toggle
    $('#python_bridge_enabled').on('change', function() {
        extension_settings.python_bridge.enabled = $(this).prop('checked');
        saveSettingsDebounced();
        
        if (extension_settings.python_bridge.enabled) {
            setupWebSocket();
        } else {
            if (wsServer) {
                wsServer.close();
                wsServer = null;
            }
            $('#python_bridge_status').text('Disabled').css('color', 'gray');
        }
    });

    // Initialize WebSocket server if enabled
    if (extension_settings.python_bridge.enabled) {
        setupWebSocket();
    } else {
        $('#python_bridge_status').text('Disabled').css('color', 'gray');
    }
}); 