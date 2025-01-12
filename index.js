import { getContext } from '../../../extensions.js';
import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../extensions.js';
import { eventSource } from '../../../extensions.js';
import express from 'express';
import cors from 'cors';

// Default settings
const defaultSettings = {
    enabled: true,
    port: 5001,
};

// Extension settings
extension_settings.python_bridge = extension_settings.python_bridge || {};
Object.assign(extension_settings.python_bridge, defaultSettings);

let app = null;
let server = null;

async function setupServer() {
    if (server) {
        server.close();
    }

    app = express();
    app.use(express.json());
    app.use(cors());

    // Endpoint to send a message to the chat
    app.post('/send_message', async (req, res) => {
        try {
            const { content } = req.body;
            const context = getContext();
            await context.sendMessage(content);
            res.json({ success: true });
        } catch (error) {
            console.error('[Python Bridge] Error sending message:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Start server
    server = app.listen(extension_settings.python_bridge.port, () => {
        console.log(`[Python Bridge] REST API server started on port ${extension_settings.python_bridge.port}`);
        $('#python_bridge_status').text('Running').css('color', 'green');
    });
}

// Listen for bot responses
eventSource.on('message_received', (messageData) => {
    // Store the latest message - it will be retrieved by the Python script
    extension_settings.python_bridge.lastMessage = messageData.message;
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
                    <div>Status: <span id="python_bridge_status">Stopped</span></div>
                </div>
            </div>
        </div>`;

    $('#extensions_settings2').append(settingsHtml);

    // Event handler for toggle
    $('#python_bridge_enabled').on('change', function() {
        extension_settings.python_bridge.enabled = $(this).prop('checked');
        saveSettingsDebounced();
        
        if (extension_settings.python_bridge.enabled) {
            setupServer();
        } else {
            if (server) {
                server.close();
                server = null;
            }
            $('#python_bridge_status').text('Disabled').css('color', 'gray');
        }
    });

    // Initialize server if enabled
    if (extension_settings.python_bridge.enabled) {
        setupServer();
    } else {
        $('#python_bridge_status').text('Disabled').css('color', 'gray');
    }
}); 