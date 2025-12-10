// server.js — Node.js + Express + MongoDB + Auth + Conversation + Admin
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const apiKey = process.env.GOOGLE_API_KEY || ""; // keep original behavior
const model = process.env.GENERATIVE_MODEL || "gemini-2.0-flash";
const JWT_SECRET = process.env.JWT_SECRET || "keyboardcat_change_this_in_prod";

// ----------------------
// CONNECT TO MONGODB
// ----------------------
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/english_app")
  .then(() => console.log("📦 MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ----------------------
// MODELS
// ----------------------
const UserSchema = new mongoose.Schema({
  name: { type: String, default: "Guest" },
  email: { type: String, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

const MessageSub = new mongoose.Schema({
  role: String, // "user" | "bot"
  text: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  userId: String,
  title: { type: String, default: "Untitled" },
  messages: [MessageSub],
  createdAt: { type: Date, default: Date.now }
});
const Conversation = mongoose.model("Conversation", ConversationSchema);

// ----------------------
// HELPERS / MIDDLEWARE
// ----------------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No user" });
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

// SUPERADMIN ONLY
function superOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No user" });
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Superadmin only" });
  }
  next();
}


// ----------------------
// AUTH: Register / Login
// ----------------------
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role  
      }
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.passwordHash || "");
    if (!match) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ======================
// SAVE / RENAME / APPEND
// ======================
app.post("/conversation/save", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;  // ✔ FIXED — dùng đúng key userId
    const { conversationId, title, messages } = req.body;

    // -----------------------------------------
    // RULE: Tạo tên không trùng + luôn IN HOA
    // -----------------------------------------
    async function getUniqueTitle(userId, baseTitle) {
      let t = (baseTitle || "").toUpperCase();
      let final = t;
      let counter = 1;

      while (await Conversation.findOne({ userId, title: final })) {
        final = `${t} (${counter})`;
        counter++;
      }
      return final;
    }

    // ============================================================
    // 1️⃣ TẠO MỚI CONVERSATION
    // ============================================================
    if (!conversationId) {
      if (!title) return res.json({ error: "Missing title" });

      const uniqueTitle = await getUniqueTitle(userId, title);

      const conv = await Conversation.create({
        userId,
        title: uniqueTitle,
        messages: (messages || []).map(m => ({
          role: m.role,
          text: m.text || ""
        }))
      });

      return res.json({
        success: true,
        conversationId: conv._id,
        title: conv.title   // ✔ trả title chuẩn cho FE
      });
    }

    // ============================================================
    // 2️⃣ LẤY CONVERSATION HIỆN TẠI
    // ============================================================
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.json({ error: "Conversation not found" });

    if (String(conv.userId) !== String(userId)) {
      return res.json({ error: "Not allowed" });
    }

    // ============================================================
    // 3️⃣ RENAME — nếu FE gửi title
    // ============================================================
    if (title) {
      const uniqueTitle = await getUniqueTitle(userId, title);

      conv.title = uniqueTitle;
      await conv.save();

      return res.json({
        success: true,
        conversationId: conv._id,
        title: conv.title  // ✔ FE dùng cái này
      });
    }

    // ============================================================
    // 4️⃣ APPEND MESSAGE (+ load conversation)
    // ============================================================
    if (Array.isArray(messages) && messages.length > 0) {
      conv.messages.push(
        ...messages.map(m => ({
          role: m.role,
          text: m.text || ""
        }))
      );
      await conv.save();
    }

    return res.json({
      success: true,
      conversationId: conv._id,
      title: conv.title   // ✔ để FE luôn sync tên
    });

  } catch (err) {
    console.error("Save conversation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// List conversations for a user
app.get("/conversation/list", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const list = await Conversation.find({ userId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error("List conv error:", err);
    res.status(500).json({ error: "Failed to get list" });
  }
});

// Get specific conversation (user must own or admin)
app.get("/conversation/:id", authMiddleware, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (String(conv.userId) !== String(req.user.userId) && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
    res.json(conv);
  } catch (err) {
    console.error("Get conv error:", err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Delete a conversation (user or admin)
app.delete("/conversation/:id", authMiddleware, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (String(conv.userId) !== String(req.user.userId) && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
    await Conversation.deleteOne({ _id: conv._id });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete conv error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ======================
// SECRET: PROMOTE USER TO ADMIN
// ======================
app.post("/secret/promote", async (req, res) => {
  try {
    const { secret, email } = req.body;

    // Check secret key
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { role: "admin" },
      { new: true }
    );

    if (!user) return res.json({ error: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Promote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create superadmin ONCE
app.post("/secret/create-superadmin", async (req, res) => {
  const { email, secret } = req.body;

  // Secret để tạo superadmin
  if (secret !== process.env.SUPERADMIN_SECRET) {
    return res.status(403).json({ error: "Invalid secret" });
  }

  // Nếu đã có superadmin → không cho tạo nữa
  const exists = await User.findOne({ role: "superadmin" });
  if (exists) {
    return res.status(403).json({ error: "Superadmin already exists" });
  }

  const target = await User.findOne({ email });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  await User.updateOne({ email }, { $set: { role: "superadmin" } });

  res.json({ success: true, message: "Superadmin created" });
});


// ----------------------
// ADMIN endpoints
// ----------------------
app.get("/admin/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Delete user (SUPERADMIN ONLY)
app.delete("/admin/user/:id", authMiddleware, superOnly, async (req, res) => {
  try {
    const targetId = req.params.id;
    const requesterId = req.user.userId;

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });

    // Không cho superadmin tự xóa chính mình
    if (String(requesterId) === String(targetId)) {
      return res.status(403).json({ error: "You cannot delete your own account" });
    }

    await User.deleteOne({ _id: targetId });
    await Conversation.deleteMany({ userId: targetId });

    res.json({ success: true });

  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});


app.delete("/admin/conversation/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Conversation.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete conv error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ----------------------
// Existing chat / translate / define endpoints (kept from your original file)
// ----------------------

// Instruction text (keep as paragraph). We'll send it as a labeled user part.
const NATURAL_INSTRUCTION = `
  INSTRUCTION: You are a friendly English conversation partner — like a real human friend.
  Speak in a warm, relaxed, natural way. Answer the user's message directly and simply.
  Do NOT analyze or repeat the user's question unless explicitly asked.
  Do NOT correct grammar unless the user asks for corrections.
  You may ask ONE short, natural follow-up question only if it feels appropriate.
  Keep replies short (about 1-4 sentences), friendly, and easy to understand for learners.
`;

// Helper to build contents WITHOUT using role: "system"
function buildContents(instructionText, history = [], userMessage = "") {
  const contents = [];

  // Put the instruction as a labeled user-part first (API accepts user/model roles)
  contents.push({
    role: "model",
    parts: [{ text: instructionText }]
  });

  // Add history (user/assistant) as user/model roles
  if (Array.isArray(history) && history.length > 0) {
    history.forEach((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      if (m.content && String(m.content).trim().length > 0) {
        contents.push({
          role,
          parts: [{ text: String(m.content) }]
        });
      }
    });
  }

  // Add latest user message
  if (userMessage && String(userMessage).trim().length > 0) {
    contents.push({
      role: "user",
      parts: [{ text: String(userMessage) }]
    });
  }

  return contents;
}

// Main chat endpoint
// Now supports optional auto-save to a conversation if token + conversationId provided
app.post("/chat", async (req, res) => {
  try {
    const userMessage = (req.body.message || "").toString().trim();
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const conversationId = req.body.conversationId || null;
    const authHeader = req.headers.authorization || null;
    let userId = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        userId = payload.userId;
      } catch (e) {
        // ignore invalid token for save behavior
      }
    }

    if (!userMessage) {
      return res.status(400).json({ error: "Nội dung tin nhắn trống" });
    }

    const contents = buildContents(NATURAL_INSTRUCTION, history, userMessage);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(endpoint, { contents }, {
      headers: { "Content-Type": "application/json" }
    });

    const botMessage = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "(Không có phản hồi từ model)";

    // If conversationId + user authenticated, append both messages to conv
    if (conversationId && userId) {
      try {
        await Conversation.updateOne(
          { _id: conversationId },
          { $push: { messages: { $each: [{ role: "user", text: userMessage }, { role: "bot", text: botMessage }] } } }
        );
      } catch (e) {
        console.warn("Auto-save conv failed:", e.message || e);
      }
    }

    return res.json({ reply: botMessage });
  } catch (err) {
    console.error("❌ /chat error:", err.response?.data || err.message || err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.response?.data || err.message || String(err)
    });
  }
});

// Translate endpoint (keeps translation separate, no history)
app.post("/translate", async (req, res) => {
  try {
    const text = (req.body.text || "").toString().trim();
    if (!text) return res.status(400).json({ error: "No text provided" });

    const translateInstruction = `You are a professional translator. Translate the given English text into natural Vietnamese only. Do NOT add explanations.`;

    const contents = [
      { role: "user", parts: [{ text: translateInstruction }] },
      { role: "user", parts: [{ text }] }
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await axios.post(endpoint, { contents }, {
      headers: { "Content-Type": "application/json" }
    });

    const translated = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không dịch được";

    return res.json({ reply: translated });
  } catch (err) {
    console.error("❌ /translate error:", err.response?.data || err.message || err);
    return res.status(500).json({
      error: "Translation failed",
      details: err.response?.data || err.message || String(err)
    });
  }
});

// Define endpoint (easy explanation)
app.post("/define", async (req, res) => {
  try {
    const word = (req.body.word || "").trim();
    const meaning = (req.body.meaning || "").trim();

    if (!word || !meaning)
      return res.status(400).json({ error: "Missing word or meaning" });

    const prompt = `
Explain the meaning of the English word "${word}" based on this dictionary definition:
"${meaning}".

Rewrite it into a simple and easy-to-understand explanation for English learners.
Use 1–2 short sentences. Do NOT add examples.
`;

    const contents = [
      { role: "user", parts: [{ text: prompt }] }
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      endpoint,
      { contents },
      { headers: { "Content-Type": "application/json" } }
    );

    const explained =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || meaning;

    return res.json({ explanation: explained });
  } catch (err) {
    console.error("❌ /define error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Define failed" });
  }
});


// Get all conversations of a user (admin only)
app.get("/admin/user/:id/conversations", authMiddleware, adminOnly, async (req, res) => {
  try {
    const list = await Conversation.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, list });
  } catch (err) {
    console.error("Admin conversations list error:", err);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});


// Count conversations of a user (admin only)
app.get("/admin/user/:id/conversations/count", authMiddleware, adminOnly, async (req, res) => {
  try {
    const count = await Conversation.countDocuments({ userId: req.params.id });
    res.json({ success: true, count });
  } catch (err) {
    console.error("Admin conv count error:", err);
    res.status(500).json({ error: "Failed to count conversations" });
  }
});

// Get ALL conversations (admin only)
app.get("/admin/conversations", authMiddleware, adminOnly, async (req, res) => {
  try {
    const list = await Conversation.find()
      .sort({ createdAt: -1 });

    // vì bạn lưu userId là String, không phải ObjectId
    // nên phải tự lấy email thủ công
    const users = await User.find({});
    const mapUser = {};
    users.forEach(u => mapUser[u._id] = u.email);

    const result = list.map(conv => ({
      _id: conv._id,
      title: conv.title,
      messages: conv.messages,
      user: {
        id: conv.userId,
        email: mapUser[conv.userId] || "Unknown"
      }
    }));

    res.json({ success: true, list: result });

  } catch (err) {
    console.error("Admin load all conversations error:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// Change role (SUPERADMIN ONLY)
app.patch("/admin/user/:id/role", authMiddleware, superOnly, async (req, res) => {
  try {
    const targetId = req.params.id;
    const newRole = String(req.body.role || "").toLowerCase();
    const requesterId = req.user.userId;

    if (!["user", "admin", "superadmin"].includes(newRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });

    // Không cho superadmin tự đổi role mình
    if (String(requesterId) === String(targetId)) {
      return res.status(403).json({ error: "You cannot change your own role" });
    }

    // Không cho hạ cấp superadmin nào hết
    if (target.role === "superadmin" && newRole !== "superadmin") {
      return res.status(403).json({ error: "Cannot demote a superadmin" });
    }

    await User.updateOne({ _id: targetId }, { role: newRole });

    res.json({ success: true });

  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});


// Reset endpoint (client side should clear history)
app.post("/reset", (req, res) => {
  res.json({ message: "OK - reset acknowledged" });
});

// =======================
// GET CURRENT USER PROFILE
// =======================
app.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-passwordHash");
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Failed to load user profile" });
    }
});


//LUÔN NẰM CUỐI CÙNG
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});