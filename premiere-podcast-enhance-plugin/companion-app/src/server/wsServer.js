const { WebSocketServer } = require("ws");
const { EventEmitter } = require("events");
const logger = require("../lib/logger");

/**
 * Local-only WS server the UXP panel connects to as a client. Implements a
 * simple request/response protocol on top of plain JSON messages:
 *   - Every request the companion app sends carries a `requestId`.
 *   - The panel's reply echoes that `requestId` so `request()` below can
 *     resolve the right promise.
 *   - Messages the panel sends unprompted (e.g. "manual-trigger") are
 *     emitted as events instead.
 */
class Bridge extends EventEmitter {
  constructor(port) {
    super();
    this.port = port;
    this.panelSocket = null;
    this.pending = new Map(); // requestId -> {resolve, reject, timer}
    this.wss = new WebSocketServer({ host: "127.0.0.1", port });

    this.wss.on("connection", (socket) => {
      this.panelSocket = socket;
      logger.info(null, "bridge", "Premiere panel connected.");
      this.emit("panel-connected");

      socket.on("message", (raw) => this._handleMessage(raw));
      socket.on("close", () => {
        if (this.panelSocket === socket) this.panelSocket = null;
        logger.info(null, "bridge", "Premiere panel disconnected.");
        this.emit("panel-disconnected");
      });
    });
  }

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      logger.error(null, "bridge", `Malformed message from panel: ${raw}`);
      return;
    }

    if (msg.requestId && this.pending.has(msg.requestId)) {
      const { resolve, timer } = this.pending.get(msg.requestId);
      clearTimeout(timer);
      this.pending.delete(msg.requestId);
      resolve(msg);
      return;
    }

    // Unsolicited message from the panel (button click, log line, etc.)
    this.emit("message", msg);
  }

  isPanelConnected() {
    return !!this.panelSocket && this.panelSocket.readyState === this.panelSocket.OPEN;
  }

  /** Sends a request to the panel and waits for the matching response. */
  request(type, payload = {}, timeoutMs = 30000) {
    if (!this.isPanelConnected()) {
      return Promise.reject(
        new Error("Premiere plugin panel isn't connected. Open the Podcast Enhance panel in Premiere.")
      );
    }
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const msg = { type, requestId, ...payload };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timed out waiting for Premiere panel to respond to "${type}".`));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      this.panelSocket.send(JSON.stringify(msg));
    });
  }
}

let bridge = null;

function startBridge(port) {
  bridge = new Bridge(port);
  return bridge;
}

function getBridge() {
  if (!bridge) throw new Error("Bridge not started yet.");
  return bridge;
}

module.exports = { startBridge, getBridge };
