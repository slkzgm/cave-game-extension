(function(xhr) {
    const BACKEND_URL = 'cavegame.slkzgm.com';
    const XHR = XMLHttpRequest.prototype;

    const open = XHR.open;
    const send = XHR.send;

    let ws;
    let wsConnected = false;
    let messageQueue = [];

    function initializeWebSocket() {
        ws = new WebSocket(`wss://${BACKEND_URL}`);

        ws.onopen = () => {
            wsConnected = true;
            console.log('WebSocket connection opened');
            // Send any messages that were queued while the WebSocket was disconnected
            while (messageQueue.length > 0) {
                ws.send(messageQueue.shift());
            }
        };

        ws.onclose = () => {
            wsConnected = false;
            console.log('WebSocket connection closed. Reconnecting...');
            reconnectWebSocket();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error: ', error);
            wsConnected = false;
            ws.close();
        };
    }

    function reconnectWebSocket() {
        setTimeout(() => {
            if (!wsConnected) {
                initializeWebSocket();
            }
        }, 5000); // Attempt to reconnect every 5 seconds
    }

    initializeWebSocket();

    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            const myUrl = this._url ? this._url.toLowerCase() : this._url;

            if (myUrl) {
                switch (true) {
                    case myUrl.includes("https://cave-api.wolf.game/claim"):
                    case myUrl.includes("https://cave-api.wolf.game/character/tokens"):
                    case myUrl.includes("https://cave-api.wolf.game/character/token/"):
                        processResponse(this, postData);
                        break;
                    case myUrl.includes("https://cave-api.wolf.game/game/move"):
                        processMove(this);
                        break;
                }
            }
        });

        return send.apply(this, arguments);
    };

    function processResponse(xhr, postData) {
        // TODO: Add logic later if needed
    }

    function processMove(xhr) {
        try {
            const responseData = JSON.parse(xhr.responseText);

            const { caveId, id, history, position, energy, visible, totalSteps } = responseData;
            const coordinates = {
                x: position % 400,
                y: Math.floor(position / 400)
            };
            const diggablePositions = visible.filter(pos => pos.diggable);
            const diggable = diggablePositions.some(diggablePos => diggablePos.position === position);
            const formattedData = {
                collectionName: caveId,
                sheepId: id,
                history,
                position,
                coordinates,
                energy,
                visible,
                totalSteps,
                diggable
            };

            const message = JSON.stringify(formattedData);

            if (wsConnected && ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            } else {
                console.warn('WebSocket is not open. Ready state:', ws.readyState, 'Queuing message');
                messageQueue.push(message);
                if (!wsConnected) {
                    initializeWebSocket();
                }
            }
        } catch (err) {
            console.error('Failed to process move response:', err);
        }
    }
})(XMLHttpRequest);