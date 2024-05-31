(function(xhr) {
    const BACKEND_URL = 'cavegame.slkzgm.com';
    const XHR = XMLHttpRequest.prototype;

    const open = XHR.open;
    const send = XHR.send;

    let ws = null;
    let wsConnected = false;
    let messageQueue = [];
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 5000;
    let reconnectTimeout;

    function connectWebSocket() {
        if (ws !== null) {
            ws.removeEventListener('open', handleSocketOpen);
            ws.removeEventListener('message', handleSocketMessage);
            ws.removeEventListener('close', handleSocketClose);
            ws.removeEventListener('error', handleSocketError);
            ws.close();
        }

        ws = new WebSocket(`wss://${BACKEND_URL}/ws`);

        ws.addEventListener('open', handleSocketOpen);
        ws.addEventListener('message', handleSocketMessage);
        ws.addEventListener('close', handleSocketClose);
        ws.addEventListener('error', handleSocketError);
    }

    function handleSocketOpen() {
        console.log('Connected to WebSocket');
        wsConnected = true;
        reconnectAttempts = 0;
        while (messageQueue.length > 0) {
            ws.send(messageQueue.shift());
        }
    }

    function handleSocketMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Message from server', data);
    }

    function handleSocketClose() {
        console.error('WebSocket closed, attempting to reconnect...');
        wsConnected = false;
        attemptReconnect();
    }

    function handleSocketError(event) {
        console.error('WebSocket error, attempting to reconnect...', event);
        wsConnected = false;
        attemptReconnect();
    }

    function attemptReconnect() {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay * Math.pow(2, reconnectAttempts - 1));
        } else {
            console.error('Max reconnect attempts reached. Please check the server.');
        }
    }

    function sendMessageToServer(type, data) {
        const message = JSON.stringify({ type, data });
        if (wsConnected && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        } else {
            console.warn('WebSocket is not open. Ready state:', ws.readyState, 'Queuing message');
            messageQueue.push(message);
            if (!wsConnected) {
                connectWebSocket();
            }
        }
    }

    function processCave(xhr) {
        try {
            const responseData = JSON.parse(xhr.responseText);
            sendMessageToServer("cave", responseData);
        } catch (err) {
            console.error('Failed to process cave response:', err);
        }
    }

    function processClaim(xhr) {
        try {
            const responseData = JSON.parse(xhr.responseText);
            sendMessageToServer("claim", responseData);
        } catch (err) {
            console.error('Failed to process claim response:', err);
        }
    }

    function processMove(xhr) {
        try {
            const responseData = JSON.parse(xhr.responseText);
            sendMessageToServer("move", responseData);
        } catch (err) {
            console.error('Failed to process move response:', err);
        }
    }

    connectWebSocket();

    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            const myUrl = this._url ? this._url.toLowerCase() : this._url;

            if (myUrl) {
                switch (true) {
                    case myUrl.includes("https://cave-api.wolf.game/character/tokens"):
                    case myUrl.includes("https://cave-api.wolf.game/character/token/"):
                        break;
                    case myUrl.includes("https://cave-api.wolf.game/game/caves"):
                        processCave(this);
                        break;
                    case myUrl.includes("https://cave-api.wolf.game/claim"):
                        processClaim(this);
                        break;
                    case myUrl.includes("https://cave-api.wolf.game/game/move"):
                        processMove(this);
                        break;
                }
            }
        });

        return send.apply(this, arguments);
    };
})(XMLHttpRequest);