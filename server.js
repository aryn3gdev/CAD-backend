import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { WebSocketServer } from "ws";

require('./bot.js');

const app = express();
app.use(bodyParser.json());

// ===== CORS =====
app.use(cors({
  origin: "https://aryn3gdev.github.io", // frontend URL
  methods: ["GET", "POST"]
}));

// ===== In-memory storage =====
let units = []; // { callsign, status, discordID, discordName }
let calls = []; // { id, caller, info, status, timestamp }

// ===== HTTP Routes =====

// Discord auth placeholder (replace with real OAuth logic)
app.post("/auth", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "No code provided" });

  try {
    // TODO: Exchange code for token with Discord
    // Example response for testing
    const allowed = true;
    const dispatch = false;
    const discordName = "TestUser#0001";
    const discordID = "123456789012345678";

    res.json({ allowed, dispatch, discordName, discordID });

  } catch (err) {
    console.error(err);
    res.json({ allowed: false });
  }
});

// 911 call endpoint
app.post("/911", (req, res) => {
  const { caller, info } = req.body;
  if (!caller || !info) return res.status(400).json({ error: "Missing caller or info" });

  const id = Date.now();
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
