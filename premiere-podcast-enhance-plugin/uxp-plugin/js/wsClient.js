/**
 * WebSocket client connecting this panel to the companion app's local
 * WS server (see companion-app/src/server/wsServer.js for the protocol).
 * Auto-reconnects since the panel can be loaded before the companion app
 * is running, or the companion app can be restarted independently.
 */

/* global WebSocket */

const WS_URL = "ws://127.0.0.1:8934";
const RECONNECT_DELAY_MS = 2000;

function createWsClient(handlers) {
  let socket = null;
  let closedByUs = false;

  function connect() {
    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => {
      handlers.onOpen?.();
      send({ type: "panel-ready" });
    });

    socket.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        handlers.onLog?.(`Received malformed message from companion app: ${event.data}`, true);
        return;
      }
      handlers.onMessage?.(msg);
    });

    socket.addEventListener("close", () => {
      handlers.onClose?.();
      if (!closedByUs) setTimeout(connect, RECONNECT_DELAY_MS);
    });

    socket.addEventListener("error", () => {
      // "close" fires right after; reconnection handled there.
    });
  }

  function send(obj) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  connect();

  return {
    send,
    close() {
      closedByUs = true;
      socket?.close();
    },
  };
}

module.exports = { createWsClient };
