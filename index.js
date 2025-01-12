import { getContext } from '../../../script.js';

// Simple event handler for bot responses
document.addEventListener('message_received', async (event) => {
    try {
        const messageData = event.detail;
        console.log('[Python Bridge] Bot response:', messageData.message);
        
        // Send to Python via fetch
        const response = await fetch('http://localhost:5001/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'bot_response',
                content: messageData.message
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('[Python Bridge] Error sending message:', error);
    }
}); 