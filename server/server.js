// Socket.io server for real-time messaging
// Run this separately: node server/server.js
// Or integrate into Next.js API route

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.userId;
    socket.walletAddress = payload.walletAddress;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Join user's personal room for direct notifications
  socket.join(`user:${socket.userId}`);

  // Notify that user is online
  socket.broadcast.emit('user_status_change', {
    userId: socket.userId,
    isOnline: true,
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  socket.on('send_message', (data) => {
    const { conversationId, message } = data;

    // Broadcast to all users in the conversation
    io.to(`conversation:${conversationId}`).emit('new_message', {
      ...message,
      conversation_id: conversationId,
    });

    // Emit read receipt request
    io.to(`conversation:${conversationId}`).emit('message_sent', {
      messageId: message.id,
      conversationId,
    });
  });

  socket.on('typing', (data) => {
    const { conversationId, isTyping } = data;
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      conversationId,
      isTyping,
    });
  });

  socket.on('message_read', (data) => {
    const { messageId, conversationId } = data;
    io.to(`conversation:${conversationId}`).emit('message_read_receipt', {
      messageId,
      userId: socket.userId,
      conversationId,
    });
  });

  socket.on('message_reaction', (data) => {
    const { conversationId, messageId, emoji, action } = data;
    // Broadcast reaction update to all users in the conversation
    io.to(`conversation:${conversationId}`).emit('message_reaction', {
      conversationId,
      messageId,
      emoji,
      action,
      userId: socket.userId,
    });
  });

  socket.on('initiate_call', (data) => {
    const { conversationId, callId, callType, receiverId } = data;

    // Notify receiver
    io.to(`user:${receiverId}`).emit('call_initiated', {
      conversationId,
      callId,
      callType,
      callerId: socket.userId,
    });

    // Also broadcast to conversation room
    io.to(`conversation:${conversationId}`).emit('call_initiated', {
      conversationId,
      callId,
      callType,
      callerId: socket.userId,
    });
  });

  socket.on('answer_call', (data) => {
    const { callId, conversationId } = data;
    io.to(`conversation:${conversationId}`).emit('call_answered', {
      callId,
      userId: socket.userId,
    });
  });

  socket.on('end_call', (data) => {
    const { callId, conversationId } = data;
    io.to(`conversation:${conversationId}`).emit('call_ended', {
      callId,
      userId: socket.userId,
    });
  });

  socket.on('decline_call', (data) => {
    const { callId, conversationId, declinerName } = data;
    io.to(`conversation:${conversationId}`).emit('call_declined', {
      callId,
      userId: socket.userId,
      declinerName,
    });
  });

  socket.on('user_online', () => {
    // User is online
    socket.broadcast.emit('user_status_change', {
      userId: socket.userId,
      isOnline: true,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    // Notify others that user went offline
    socket.broadcast.emit('user_status_change', {
      userId: socket.userId,
      isOnline: false,
    });
  });
});

console.log(`Socket.io server running on port ${PORT}`);

