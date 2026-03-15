/* eslint-disable no-console */
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const PORT = Number(process.env.SOCKET_PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PolyChat Socket Server\n');
});

const io = new Server(server, {
  cors: {
    origin: APP_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Best-effort in-memory buffering to reduce race conditions between call notification and offer delivery.
// Not persistent and resets when this process restarts.
const offersByCallId = new Map();

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Prevent unbounded growth if calls are abandoned mid-signalling.
setInterval(() => {
  const now = Date.now();
  for (const [callId, entry] of offersByCallId.entries()) {
    if (!entry || !entry.ts) {
      offersByCallId.delete(callId);
      continue;
    }
    if (now - entry.ts > 2 * 60 * 1000) offersByCallId.delete(callId);
  }
}, 60 * 1000).unref?.();

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  const payload = verifyToken(token);
  if (!payload || !payload.userId) return next(new Error('Unauthorized'));
  socket.data.userId = String(payload.userId);
  socket.data.walletAddress = payload.walletAddress ? String(payload.walletAddress) : undefined;
  return next();
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;

  socket.join(`user:${userId}`);
  io.emit('user_status_change', { userId, isOnline: true });

  socket.on('join_conversation', (conversationId) => {
    if (!conversationId) return;
    socket.join(`conv:${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    if (!conversationId) return;
    socket.leave(`conv:${conversationId}`);
  });

  socket.on('send_message', ({ conversationId, message }) => {
    if (!conversationId || !message) return;
    io.to(`conv:${conversationId}`).emit('new_message', { conversationId, message });
    socket.emit('message_sent', { conversationId, messageId: message.id });
  });

  socket.on('user_typing', ({ conversationId, ...rest }) => {
    if (!conversationId) return;
    socket.to(`conv:${conversationId}`).emit('user_typing', { conversationId, ...rest, userId });
  });

  socket.on('message_reaction', ({ conversationId, messageId, emoji }) => {
    if (!conversationId || !messageId || !emoji) return;
    io.to(`conv:${conversationId}`).emit('message_reaction', { conversationId, messageId, emoji, userId });
  });

  socket.on('message_read_receipt', ({ conversationId, messageId }) => {
    if (!conversationId || !messageId) return;
    io.to(`conv:${conversationId}`).emit('message_read_receipt', { conversationId, messageId, userId });
  });

  // Call control (notify only — media is handled by WebRTC signalling below)
  socket.on('initiate_call', ({ conversationId, callId, callType, receiverId }) => {
    if (!conversationId || !callId || !receiverId) return;
    const buffered = offersByCallId.get(String(callId));
    io.to(`user:${receiverId}`).emit('call_initiated', {
      conversationId,
      callId,
      callType,
      callerId: userId,
      offer: buffered && buffered.receiverId === String(receiverId) ? buffered.offer : undefined,
    });
  });

  socket.on('answer_call', ({ conversationId, callId, receiverId }) => {
    if (!conversationId || !callId || !receiverId) return;
    io.to(`user:${receiverId}`).emit('call_answered', { conversationId, callId });
  });

  socket.on('decline_call', ({ conversationId, callId, receiverId, declinerName }) => {
    if (!conversationId || !callId || !receiverId) return;
    offersByCallId.delete(String(callId));
    io.to(`user:${receiverId}`).emit('call_ended', {
      conversationId,
      callId,
      reason: 'declined',
      declinerName,
    });
  });

  socket.on('end_call', ({ conversationId, callId, receiverId, reason }) => {
    if (!conversationId || !callId || !receiverId) return;
    offersByCallId.delete(String(callId));
    io.to(`user:${receiverId}`).emit('call_ended', { conversationId, callId, reason: reason || 'ended' });
  });

  // WebRTC signalling (offer/answer/ice)
  socket.on('webrtc_offer', ({ callId, receiverId, offer, callType }) => {
    if (!callId || !receiverId || !offer) return;
    offersByCallId.set(String(callId), {
      offer,
      callType,
      fromUserId: userId,
      receiverId: String(receiverId),
      ts: Date.now(),
    });
    io.to(`user:${receiverId}`).emit('webrtc_offer', { callId, fromUserId: userId, offer, callType });
  });

  socket.on('webrtc_answer', ({ callId, receiverId, answer }) => {
    if (!callId || !receiverId || !answer) return;
    io.to(`user:${receiverId}`).emit('webrtc_answer', { callId, fromUserId: userId, answer });
  });

  socket.on('webrtc_ice_candidate', ({ callId, receiverId, candidate }) => {
    if (!callId || !receiverId || !candidate) return;
    io.to(`user:${receiverId}`).emit('webrtc_ice_candidate', { callId, fromUserId: userId, candidate });
  });

  socket.on('disconnect', () => {
    io.emit('user_status_change', { userId, isOnline: false });
  });
});

server.listen(PORT, () => {
  console.log(`[socket] listening on http://localhost:${PORT} (origin: ${APP_ORIGIN})`);
});
