import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const GUILD_ID = process.env.GUILD_ID;

const WL_ROLE = "WL";
const DISPATCH_ROLE = "WLDs";

// In-memory storage (free version)
let units = [];
let logs = [];

// 🔐 Discord OAuth callback
app.post("/auth", async (req, res) => {
  const { code } = req.body;

  try {
    // Exchange code for token
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const access_token = tokenRes.data.access_token;

    // Get user info
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data;

    // Get member roles
    const memberRes = await axios.get(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    const roles = memberRes.data.roles;

    if (!roles.includes(WL_ROLE)) {
      return res.json({ allowed: false });
    }

    const isDispatch = roles.includes(DISPATCH_ROLE);

    res.json({
      allowed: true,
      dispatch: isDispatch,
      username: user.username
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Auth failed" });
  }
});

// 📟 Update Status
app.post("/status", (req, res) => {
  const { callsign, status } = req.body;

  const unit = units.find(u => u.callsign === callsign);

  if (unit) {
    unit.status = status;
  } else {
    units.push({ callsign, status });
  }

  logs.push({
    time: new Date().toISOString(),
    message: `${callsign} — ${status}`
  });

  res.json({ success: true });
});

// 🚨 Panic
app.post("/panic", (req, res) => {
  const { callsign } = req.body;

  logs.push({
    time: new Date().toISOString(),
    message: `🚨 PANIC — ${callsign}`
  });

  res.json({ success: true });
});

// 📡 Get Units
app.get("/units", (req, res) => {
  res.json(units);
});

// 📜 Get Logs
app.get("/logs", (req, res) => {
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
