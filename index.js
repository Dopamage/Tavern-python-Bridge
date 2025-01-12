import { getContext } from '../../../extensions.js';
import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../extensions.js';
import { eventSource } from '../../../extensions.js';
import { registerSlashCommand } from '../../../slash-commands.js';

// Default settings
const defaultSettings = {
    enabled: true,
    port: 5001,
};

// Extension settings
extension_settings.python_bridge = extension_settings.python_bridge || {};
Object.assign(extension_settings.python_bridge, defaultSettings);

let socket = null;

function setupSocket() {
    if (socket) {
        socket.close();
    }

    socket = new WebSocket(`ws://localhost:${extension_settings.python_bridge.port}`);

    socket.onopen = () => {
        console.log('[Python Bridge] Connected to Python script');
        $('#python_bridge_status').text('Connected').css('color', 'green');
    };

    socket.onclose = () => {
        console.log('[Python Bridge] Disconnected from Python script');
        $('#python_bridge_status').text('Disconnected').css('color', 'red');
        // Try to reconnect after a delay
        setTimeout(setupSocket, 5000);
    };

    socket.onmessage = async (event) => {
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

    socket.onerror = (error) => {
        console.error('[Python Bridge] WebSocket error:', error);
    };
}

// Listen for bot responses
eventSource.on('message_received', (messageData) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
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
            setupSocket();
        } else {
            if (socket) {
                socket.close();
            }
            $('#python_bridge_status').text('Disabled').css('color', 'gray');
        }
    });

    // Initialize connection if enabled
    if (extension_settings.python_bridge.enabled) {
        setupSocket();
    } else {
        $('#python_bridge_status').text('Disabled').css('color', 'gray');
    }
}); 