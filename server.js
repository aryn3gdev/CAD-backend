import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Role IDs
const WL_ROLE = "1474094161987768412";
const DISPATCH_ROLE = "1474094665656701171";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Health check
app.get("/", (req, res) => res.send("CAD-backend online"));

// OAuth2 endpoint
app.post("/auth", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "No code provided" });

    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const access_token = tokenRes.data.access_token;

    // Get user info
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const user = userRes.data;

    // Get member roles using bot token
    const memberRes = await axios.get(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }, // THIS LINE IS CORRECT NOW
      }
    );

    const roles = memberRes.data.roles;
    console.log("User info:", user.username, user.id);
    console.log("Fetched roles:", roles); // DEBUG LOG

    if (!roles.includes(WL_ROLE)) {
      return res.json({ allowed: false });
    }

    const isDispatch = roles.includes(DISPATCH_ROLE);

    res.json({
      allowed: true,
      dispatch: isDispatch,
      username: user.username,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Placeholder endpoints
app.post("/status", (req, res) => res.json({ ok: true }));
app.post("/panic", (req, res) => res.json({ ok: true }));
app.get("/units", (req, res) => res.json([]));
app.get("/logs", (req, res) => res.json([]));

app.listen(PORT, () => console.log(`CAD-backend running on port ${PORT}`));
