// Python Bridge Extension for SillyTavern
import { getContext, extension_settings, saveSettingsDebounced, eventSource } from '../../../script.js';

// Register extension
jQuery(async () => {
    const MODULE_NAME = 'Python Bridge';
    const UPDATE_INTERVAL = 1000;

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
                $('#python_bridge_status').text('Connected').css('color', 'green');
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
                $('#python_bridge_status').text('Disconnected').css('color', 'red');
                if (extension_settings.python_bridge.enabled) {
                    setTimeout(connectWebSocket, 5000);
                }
            };

            ws.onerror = (error) => {
                console.error('[Python Bridge] WebSocket error:', error);
                toastr.error('Failed to connect to Python server');
                $('#python_bridge_status').text('Error').css('color', 'red');
            };
        } catch (error) {
            console.error('[Python Bridge] Failed to connect:', error);
            $('#python_bridge_status').text('Error').css('color', 'red');
            if (extension_settings.python_bridge.enabled) {
                setTimeout(connectWebSocket, 5000);
            }
        }
    }

    function addExtensionControls() {
        const settingsHtml = `
            <div id="python_bridge_settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>Python Bridge</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="python_bridge_block">
                            <label class="checkbox_label">
                                <input type="checkbox" id="python_bridge_enabled" ${extension_settings.python_bridge.enabled ? 'checked' : ''}>
                                Enable Python Bridge
                            </label>
                            <label>Port: 
                                <input type="number" id="python_bridge_port" value="${extension_settings.python_bridge.port}">
                            </label>
                            <div>Status: <span id="python_bridge_status">Disconnected</span></div>
                            <div class="python_bridge_buttons">
                                <input type="button" value="Connect" id="python_bridge_connect" class="menu_button">
                                <input type="button" value="Disconnect" id="python_bridge_disconnect" class="menu_button">
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        $('#extensions_settings2').append(settingsHtml);

        // Event handlers
        $('#python_bridge_enabled').on('change', function() {
            extension_settings.python_bridge.enabled = !!$(this).prop('checked');
            saveSettingsDebounced();
            if (extension_settings.python_bridge.enabled) {
                connectWebSocket();
            } else if (ws) {
                ws.close();
            }
        });

        $('#python_bridge_port').on('change', function() {
            extension_settings.python_bridge.port = Number($(this).val());
            saveSettingsDebounced();
            if (extension_settings.python_bridge.enabled) {
                connectWebSocket();
            }
        });

        $('#python_bridge_connect').on('click', function() {
            extension_settings.python_bridge.enabled = true;
            $('#python_bridge_enabled').prop('checked', true);
            saveSettingsDebounced();
            connectWebSocket();
        });

        $('#python_bridge_disconnect').on('click', function() {
            extension_settings.python_bridge.enabled = false;
            $('#python_bridge_enabled').prop('checked', false);
            saveSettingsDebounced();
            if (ws) {
                ws.close();
            }
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

    // Add the UI elements
    addExtensionControls();

    // Initialize connection if enabled
    if (extension_settings.python_bridge.enabled) {
        await connectWebSocket();
    }
}); 