const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("client connected", socket.id);

  socket.on("join-conversation", (conversationId) => {
    console.log(`Client ${socket.id} joining conversation: ${conversationId}`);
    socket.join(conversationId);
    // Confirm join
    socket.emit("joined-conversation", conversationId);
  });

  socket.on("leave-conversation", (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on("message", (payload) => {
    const { conversationId } = payload;
    if (!conversationId) {
      console.log("Message received without conversationId:", payload);
      return;
    }
    console.log(`Broadcasting message to conversation: ${conversationId}`, {
      from: payload.from,
      to: payload.to,
      body: payload.body?.substring(0, 50),
    });
    // Broadcast to all clients in the conversation room (including sender for confirmation)
    io.to(conversationId).emit("message", payload);
  });

  socket.on("call-offer", (payload) => {
    const { conversationId } = payload;
    if (!conversationId) return;
    socket.to(conversationId).emit("call-offer", payload);
  });

  socket.on("call-answer", (payload) => {
    const { conversationId } = payload;
    if (!conversationId) return;
    socket.to(conversationId).emit("call-answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    const { conversationId } = payload;
    if (!conversationId) return;
    socket.to(conversationId).emit("ice-candidate", payload);
  });

  socket.on("messages-read", (payload) => {
    const { conversationId } = payload;
    if (!conversationId) return;
    console.log(`Messages read in conversation: ${conversationId} by ${payload.reader}`);
    socket.to(conversationId).emit("messages-read", payload);
  });

  socket.on("disconnect", () => {
    console.log("client disconnected", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Realtime server listening on :${PORT}`);
});


