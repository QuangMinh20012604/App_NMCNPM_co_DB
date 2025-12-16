// ============================================================================
// server.js
// Backend chính: Express + MongoDB + JWT Authentication +
// Conversation Management + Admin Control + Google Generative Language API
// ============================================================================

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

app.use(express.json());                     // Parse JSON request body
app.use(express.static("public"));           // Serve static files
app.use(cors());                             // Enable CORS
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const apiKey = process.env.GOOGLE_API_KEY || "";
const model = process.env.GENERATIVE_MODEL || "gemini-2.0-flash";
const JWT_SECRET = process.env.JWT_SECRET || "keyboardcat_change_this_in_prod";


// ============================================================================
// MongoDB Connection
// ============================================================================
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/english_app")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));


// ============================================================================
// Mongoose Models
// ============================================================================

// User Model: quản lý thông tin tài khoản đăng nhập
const UserSchema = new mongoose.Schema({
  name: { type: String, default: "Guest" },
  email: { type: String, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

// Subdocument message
const MessageSub = new mongoose.Schema(
  {
    role: String, // user | bot
    text: String,
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

// Conversation Model: lưu trữ toàn bộ đoạn hội thoại theo người dùng
const ConversationSchema = new mongoose.Schema({
  userId: String,
  title: { type: String, default: "Untitled" },
  messages: [MessageSub],
  createdAt: { type: Date, default: Date.now }
});
const Conversation = mongoose.model("Conversation", ConversationSchema);


// ============================================================================
// Authentication Middlewares
// ============================================================================

// Xác thực token – yêu cầu user đăng nhập
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "No token" });

  const token = auth.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, role }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Chỉ Admin và Superadmin được truy cập
function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No user" });

  if (req.user.role !== "admin" && req.user.role !== "superadmin")
    return res.status(403).json({ error: "Admin only" });

  next();
}

// Chỉ Superadmin được phép truy cập
function superOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No user" });
  if (req.user.role !== "superadmin")
    return res.status(403).json({ error: "Superadmin only" });

  next();
}


// ============================================================================
// REGISTER & LOGIN API
// ============================================================================

// Register: tạo tài khoản mới, mã hoá mật khẩu và trả token
app.post("/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;

    email = String(email).trim().toLowerCase();

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash: hash
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

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

// Login: xác thực email + password, trả JWT token
app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = String(email).trim().toLowerCase();

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

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
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});


// ============================================================================
// Conversation Handling: Create / Rename / Append
// ============================================================================

// Quy tắc đặt tên: không trùng, luôn viết hoa
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

// Lưu conversation: tạo mới hoặc cập nhật hiện tại
app.post("/conversation/save", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId, title, messages } = req.body;

    // Create new conversation
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
        title: conv.title
      });
    }

    // Update existing
    const conv = await Conversation.findById(conversationId);
    if (!conv)
      return res.json({ error: "Conversation not found" });

    if (String(conv.userId) !== String(userId))
      return res.json({ error: "Not allowed" });

    // Rename
    if (title) {
      const uniqueTitle = await getUniqueTitle(userId, title);
      conv.title = uniqueTitle;
      await conv.save();

      return res.json({
        success: true,
        conversationId: conv._id,
        title: conv.title
      });
    }

    // Append message
    if (Array.isArray(messages) && messages.length > 0) {
      conv.messages.push(
        ...messages.map(m => ({
          role: m.role,
          text: m.text || ""
        }))
      );
      await conv.save();
    }

    res.json({
      success: true,
      conversationId: conv._id,
      title: conv.title
    });

  } catch (err) {
    console.error("Save conversation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ============================================================================
// Conversation CRUD
// ============================================================================

// List conversations của user hiện tại
app.get("/conversation/list", authMiddleware, async (req, res) => {
  try {
    const list = await Conversation.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    console.error("List conv error:", err);
    res.status(500).json({ error: "Failed to get list" });
  }
});

// Lấy chi tiết conversation
app.get("/conversation/:id", authMiddleware, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });

    const user = req.user;

    if (String(conv.userId) !== String(user.userId)
      && user.role !== "admin"
      && user.role !== "superadmin")
      return res.status(403).json({ error: "Not allowed" });

    res.json(conv);

  } catch (err) {
    console.error("Get conv error:", err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Xóa conversation
app.delete("/conversation/:id", authMiddleware, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });

    const user = req.user;

    if (String(conv.userId) !== String(user.userId)
      && user.role !== "admin"
      && user.role !== "superadmin")
      return res.status(403).json({ error: "Not allowed" });

    await Conversation.deleteOne({ _id: conv._id });
    res.json({ success: true });

  } catch (err) {
    console.error("Delete conv error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});


// ============================================================================
// Secret Admin Setup (Promote / Create Superadmin)
// ============================================================================

// Promote user → admin (yêu cầu secret key)
app.post("/secret/promote", async (req, res) => {
  try {
    const { secret, email } = req.body;
    if (secret !== process.env.ADMIN_SECRET)
      return res.status(403).json({ error: "Forbidden" });

    const user = await User.findOneAndUpdate(
      { email },
      { role: "admin" },
      { new: true }
    );

    if (!user)
      return res.json({ error: "User not found" });

    res.json({ success: true, user });

  } catch (err) {
    console.error("Promote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Tạo superadmin duy nhất
app.post("/secret/create-superadmin", async (req, res) => {
  const { email, secret } = req.body;

  if (secret !== process.env.SUPERADMIN_SECRET)
    return res.status(403).json({ error: "Invalid secret" });

  const exists = await User.findOne({ role: "superadmin" });
  if (exists)
    return res.status(403).json({ error: "Superadmin already exists" });

  const target = await User.findOne({ email });
  if (!target)
    return res.status(404).json({ error: "User not found" });

  await User.updateOne({ email }, { $set: { role: "superadmin" } });

  res.json({ success: true, message: "Superadmin created" });
});


// ============================================================================
// Admin APIs
// ============================================================================

// Lấy danh sách user
app.get("/admin/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json(users);

  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Xóa user
app.delete("/admin/user/:id", authMiddleware, adminOnly, async (req, res) => {
  const requesterRole = req.user.role;
  const requesterId = req.user.userId;
  const targetId = req.params.id;

  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ error: "User not found" });

  // Superadmin rules
  if (requesterRole === "superadmin") {
    if (String(requesterId) === String(targetId))
      return res.status(403).json({ error: "Cannot delete yourself" });

    if (target.role === "superadmin")
      return res.status(403).json({ error: "Cannot delete another superadmin" });
  }

  // Admin rules
  if (requesterRole === "admin") {
    if (target.role !== "user")
      return res.status(403).json({ error: "Admins can only delete normal users" });
  }

  await User.deleteOne({ _id: targetId });
  await Conversation.deleteMany({ userId: targetId });

  res.json({ success: true });
});

// Xóa conversation bất kỳ (admin)
app.delete("/admin/conversation/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Conversation.deleteOne({ _id: req.params.id });
    res.json({ success: true });

  } catch (err) {
    console.error("Admin delete conv error:", err);
    res.status(500).json({ error: "Failed" });
  }
});


// ============================================================================
// Chat API (Google Generative Language)
// ============================================================================

// Instruction nhúng vào lịch sử hội thoại
const NATURAL_INSTRUCTION = `
  INSTRUCTION: You are a friendly English conversation partner.
  Speak naturally, avoid repeating the question unless asked.
  Keep messages short (1-4 sentences).
`;

// Build request cho API Gemini
function buildContents(instructionText, history = [], userMessage = "") {
  const contents = [];

  contents.push({
    role: "model",
    parts: [{ text: instructionText }]
  });

  if (Array.isArray(history)) {
    history.forEach(m => {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content) }]
      });
    });
  }

  if (userMessage) {
    contents.push({
      role: "user",
      parts: [{ text: userMessage }]
    });
  }

  return contents;
}

// Chat API
app.post("/chat", async (req, res) => {
  try {
    const { message, history, conversationId } = req.body;

    if (!message || !String(message).trim())
      return res.status(400).json({ error: "Empty message" });

    const authHeader = req.headers.authorization || null;
    let userId = null;

    if (authHeader?.startsWith("Bearer "))
      try {
        const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        userId = payload.userId;
      } catch { }

    const contents = buildContents(NATURAL_INSTRUCTION, history, message);

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      endpoint,
      { contents },
      { headers: { "Content-Type": "application/json" } }
    );

    const botMessage =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "(No response)";

    // Auto-save nếu có conversationId
    if (conversationId && userId) {
      try {
        await Conversation.updateOne(
          { _id: conversationId },
          {
            $push: {
              messages: {
                $each: [
                  { role: "user", text: message },
                  { role: "bot", text: botMessage }
                ]
              }
            }
          }
        );
      } catch (err) {
        console.warn("Auto-save failed:", err.message);
      }
    }

    res.json({ reply: botMessage });

  } catch (err) {
    console.error("Chat error:", err.response?.data || err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.response?.data || err.message
    });
  }
});


// ============================================================================
// Translation API
// ============================================================================

app.post("/translate", async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "No text provided" });

    const instruction =
      `Translate the given English text into natural Vietnamese. No explanation.`;

    const contents = [
      { role: "user", parts: [{ text: instruction }] },
      { role: "user", parts: [{ text }] }
    ];

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      endpoint,
      { contents },
      { headers: { "Content-Type": "application/json" } }
    );

    const translated =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Translation unavailable";

    res.json({ reply: translated });

  } catch (err) {
    console.error("Translate error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});


// ============================================================================
// Dictionary Definition Simplification API
// ============================================================================

app.post("/define", async (req, res) => {
  try {
    const word = (req.body.word || "").trim();
    const meaning = (req.body.meaning || "").trim();

    if (!word || !meaning)
      return res.status(400).json({ error: "Missing word or meaning" });

    const prompt = `
Explain the meaning of the English word "${word}" based on this definition:
"${meaning}"
Rewrite into a simple explanation (1–2 short sentences). No examples.
`;

    const contents = [{ role: "user", parts: [{ text: prompt }] }];

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      endpoint,
      { contents },
      { headers: { "Content-Type": "application/json" } }
    );

    const explained =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || meaning;

    res.json({ explanation: explained });

  } catch (err) {
    console.error("Define error:", err);
    res.status(500).json({ error: "Define failed" });
  }
});


// ============================================================================
// Admin Conversation Queries
// ============================================================================

app.get("/admin/user/:id/conversations", authMiddleware, adminOnly, async (req, res) => {
  try {
    const list = await Conversation.find({ userId: req.params.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, list });

  } catch (err) {
    console.error("Admin load conv error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/admin/user/:id/conversations/count", authMiddleware, adminOnly, async (req, res) => {
  try {
    const count = await Conversation.countDocuments({ userId: req.params.id });
    res.json({ success: true, count });

  } catch (err) {
    console.error("Admin conv count error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Lấy toàn bộ conversation cho admin panel
app.get("/admin/conversations", authMiddleware, adminOnly, async (req, res) => {
  try {
    const list = await Conversation.find().sort({ createdAt: -1 });

    const users = await User.find({});
    const mapUser = {};
    users.forEach(u => (mapUser[u._id] = u.email));

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
    console.error("Admin load all conv error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Admin thay đổi role user – chỉ superadmin được phép
app.patch("/admin/user/:id/role", authMiddleware, superOnly, async (req, res) => {
  try {
    const targetId = req.params.id;
    const newRole = String(req.body.role).toLowerCase();
    const requesterId = req.user.userId;

    if (!["user", "admin", "superadmin"].includes(newRole))
      return res.status(400).json({ error: "Invalid role" });

    const target = await User.findById(targetId);
    if (!target)
      return res.status(404).json({ error: "User not found" });

    // Superadmin không thể tự đổi role
    if (String(requesterId) === String(targetId))
      return res.status(403).json({ error: "You cannot change your own role" });

    // Không thể hạ cấp một superadmin khác
    if (target.role === "superadmin" && newRole !== "superadmin")
      return res.status(403).json({ error: "Cannot demote a superadmin" });

    await User.updateOne({ _id: targetId }, { role: newRole });

    res.json({ success: true });

  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});


// ============================================================================
// Misc Endpoints
// ============================================================================

// Reset cho client (không reset server)
app.post("/reset", (req, res) => {
  res.json({ message: "OK - reset acknowledged" });
});

// Lấy thông tin user hiện tại
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-passwordHash");

    res.json({ success: true, user });

  } catch {
    res.status(500).json({ error: "Failed to load user profile" });
  }
});


// Server Listen
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);