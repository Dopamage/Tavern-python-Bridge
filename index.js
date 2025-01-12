import { getContext } from '../../../script.js';

let socket = null;
const PORT = 5001;

function setupSocket() {
    try {
        socket = new WebSocket(`ws://localhost:${PORT}`);

        socket.onopen = () => {
            console.log('[Python Bridge] Connected to Python script');
        };

        socket.onclose = () => {
            console.log('[Python Bridge] Disconnected from Python script');
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
    } catch (error) {
        console.error('[Python Bridge] Setup error:', error);
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
    }
});

// Start connection when extension loads
setupSocket(); 