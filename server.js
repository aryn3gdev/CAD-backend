import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";

const app = express();
app.use(bodyParser.json());

// ===== In-memory storage =====
let units = [];   // Officer info: {callsign, status, discordID, discordName}
let calls = [];   // 911 calls: {id, caller, info, status, timestamp}

// ===== HTTP Routes =====
// Example auth route (replace with your Discord OAuth logic)
app.post("/auth", (req, res) => {
  // Placeholder: return allowed for testing
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "No code provided" });

  // Here you would validate code with Discord OAuth
  // For now, allow everyone
  res.json({ allowed: true, dispatch: false });
});

// ===== 911 Call endpoint =====
app.post("/911", (req, res) => {
  const { caller, info } = req.body;
  if (!caller || !info) return res.status(400).json({ error: "Missing caller or info" });

  const id = Date.now(); // Simple unique ID
  const timestamp = new Date().toLocaleTimeString();
  const call = { id, caller, info, status: "New", timestamp };
  calls.push(call);

  // Broadcast to all WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "911Call", ...call }));
  });

  res.json({ success: true });
});

// ===== WebSocket Server =====
const server = app.listen(10000, () => console.log("CAD-backend running on port 10000"));
const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  console.log("New WebSocket connection");

  // Send initial units + calls to new client
  ws.send(JSON.stringify({ type: "initialData", units, calls }));

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);

      // Officer register or status update
      if (data.type === "register" || data.type === "statusUpdate") {
        const idx = units.findIndex(u => u.callsign === data.callsign);
        if (idx >= 0) units[idx] = { ...units[idx], ...data };
        else units.push(data);

        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(JSON.stringify({ type: "statusUpdate", ...data }));
        });
      }

    } catch (e) {
      console.error("WS message error:", e);
    }
  });

  ws.on("close", () => console.log("WebSocket disconnected"));
});
