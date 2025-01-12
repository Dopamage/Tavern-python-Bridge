import { getContext, extension_settings, saveSettingsDebounced } from '../../../script.js';
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
let messageLog = [];
const MAX_LOG_LENGTH = 100;

function addToLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    messageLog.unshift({ timestamp, message, type });
    if (messageLog.length > MAX_LOG_LENGTH) {
        messageLog.pop();
    }
    updateLogDisplay();
}

function updateLogDisplay() {
    const logHtml = messageLog.map(entry => {
        const color = entry.type === 'error' ? 'red' : 
                     entry.type === 'sent' ? 'blue' : 
                     entry.type === 'received' ? 'green' : 'gray';
        return `<div style="color: ${color}; margin: 2px 0;">
                    [${entry.timestamp}] ${entry.message}
                </div>`;
    }).join('');
    $('#python_bridge_log').html(logHtml);
}

function setupSocket() {
    if (socket) {
        socket.close();
    }

    try {
        socket = new WebSocket(`ws://localhost:${extension_settings.python_bridge.port}`);

        socket.onopen = () => {
            console.log('[Python Bridge] Connected to Python script');
            $('#python_bridge_status').text('Connected').css('color', 'green');
            addToLog('Connected to Python script', 'info');
        };

        socket.onclose = () => {
            console.log('[Python Bridge] Disconnected from Python script');
            $('#python_bridge_status').text('Disconnected').css('color', 'red');
            addToLog('Disconnected from Python script', 'error');
            // Try to reconnect after a delay if enabled
            if (extension_settings.python_bridge.enabled) {
                setTimeout(setupSocket, 5000);
            }
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'send_message') {
                    const context = getContext();
                    addToLog(`Message from Python: ${data.content}`, 'received');
                    await context.sendMessage(data.content);
                }
            } catch (error) {
                console.error('[Python Bridge] Error processing message:', error);
                addToLog(`Error processing message: ${error.message}`, 'error');
            }
        };

        socket.onerror = (error) => {
            console.error('[Python Bridge] WebSocket error:', error);
            addToLog(`WebSocket error: ${error.message}`, 'error');
        };
    } catch (error) {
        console.error('[Python Bridge] Setup error:', error);
        addToLog(`Setup error: ${error.message}`, 'error');
    }
}

// Listen for bot responses using event listener
document.addEventListener('message_received', (event) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const messageData = event.detail;
        socket.send(JSON.stringify({
            type: 'bot_response',
            content: messageData.message
        }));
        addToLog(`Bot response sent: ${messageData.message}`, 'sent');
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
                    <div style="margin-top: 10px;">
                        <b>Message Log</b>
                        <div id="python_bridge_log" style="
                            max-height: 200px;
                            overflow-y: auto;
                            border: 1px solid #ccc;
                            padding: 5px;
                            margin-top: 5px;
                            font-family: monospace;
                            font-size: 12px;
                            background-color: rgba(0, 0, 0, 0.2);
                        "></div>
                    </div>
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
            addToLog('Bridge disabled', 'info');
        }
    });

    // Initialize connection if enabled
    if (extension_settings.python_bridge.enabled) {
        setupSocket();
    } else {
        $('#python_bridge_status').text('Disabled').css('color', 'gray');
    }
}); 