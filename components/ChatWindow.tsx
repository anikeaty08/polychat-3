'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useChatStore } from '@/lib/store';
import { ArrowLeft, Phone, Video, MoreVertical, Paperclip, Send, Smile, Check, CheckCheck, File, Download, X, Trash2, Forward, Shield, Mic, Square, Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { formatMessageTime, formatLastSeen } from '@/lib/utils';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import CallModal from './CallModal';
import EmojiPicker from './EmojiPicker';
import { ethers } from 'ethers';
import { getMessagingContract, getCallsContract, isOnChainEnabled } from '@/lib/contracts';

interface ChatWindowProps {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { messages, addMessage, setActiveConversation } = useChatStore();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [participant, setParticipant] = useState<any>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showEncryptionBadge, setShowEncryptionBadge] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }

    setActiveConversation(conversationId);
    loadConversation();
    loadMessages();
    
    // Initialize socket after a small delay to ensure token is available
    const socketCleanup = initializeSocket();

    // Periodic refresh to ensure messages are up to date
    const refreshInterval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (socket) {
        socket.emit('leave_conversation', conversationId);
        socket.disconnect();
      }
      if (socketCleanup) {
        socketCleanup();
      }
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, token]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const messagesList = data.messages || [];
        
        // Extract reactions from messages
        const reactionsMap: Record<string, any[]> = {};
        messagesList.forEach((msg: any) => {
          if (msg.reactions && Array.isArray(msg.reactions) && msg.reactions.length > 0) {
            // Ensure reactions have required fields
            reactionsMap[msg.id] = msg.reactions.filter((r: any) => r && r.emoji);
          }
        });
        setMessageReactions(reactionsMap);
        
        // Set messages in store
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: messagesList,
          },
        }));
        setLoading(false);
      } else {
        console.error('Failed to load messages');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[conversationId]]);

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation);
        const otherParticipant = data.conversation?.participants?.find(
          (p: any) => p.user_id !== user?.id
        )?.user || data.conversation?.participant;
        setParticipant(otherParticipant);
        
        if (otherParticipant?.id) {
          checkIfBlocked(otherParticipant.id);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfBlocked = async (participantId: string) => {
    try {
      const response = await fetch(`/api/blocked/check/${participantId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsBlocked(data.isBlocked || false);
      }
    } catch (error) {
      console.error('Failed to check blocked status:', error);
    }
  };

  const initializeSocket = () => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    }

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected, joining conversation:', conversationId);
      newSocket.emit('join_conversation', conversationId);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('new_message', (message: any) => {
      console.log('Received new message via socket:', message);
      const msgConversationId = message.conversation_id || message.conversationId;
      
      if (msgConversationId === conversationId) {
        const currentMessages = messages[conversationId] || [];
        const messageExists = currentMessages.some((msg: any) => msg.id === message.id);
        
        if (!messageExists) {
          console.log('Adding new message to store:', message);
          addMessage(conversationId, {
            ...message,
            conversation_id: conversationId,
            sender_id: message.sender_id,
            content: message.content,
            message_type: message.message_type || message.messageType || 'text',
            ipfs_hash: message.ipfs_hash || message.ipfsHash,
            created_at: message.created_at || new Date().toISOString(),
            is_read: message.sender_id === user?.id ? true : false,
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    });

    newSocket.on('message_sent', (data: any) => {
      if (data.conversationId === conversationId) {
        console.log('Message sent confirmation:', data);
      }
    });

    // Listen for reaction updates
    newSocket.on('message_reaction', (data: any) => {
      if (data.conversationId === conversationId && data.messageId) {
        // Fetch updated reactions from server for accuracy
        fetch(`/api/messages/reactions?messageId=${data.messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            throw new Error('Failed to fetch reactions');
          })
          .then((reactionsData) => {
            if (reactionsData && reactionsData.reactions) {
              setMessageReactions((prev) => ({
                ...prev,
                [data.messageId]: reactionsData.reactions.filter((r: any) => r && r.emoji),
              }));
            }
          })
          .catch((error) => {
            console.error('Failed to fetch reactions:', error);
            // Fallback: update optimistically
            setMessageReactions((prev) => {
              const currentReactions = prev[data.messageId] || [];
              if (data.action === 'added' && data.emoji) {
                return {
                  ...prev,
                  [data.messageId]: [...currentReactions, { emoji: data.emoji, user_id: data.userId }],
                };
              } else if (data.action === 'removed' && data.emoji) {
                return {
                  ...prev,
                  [data.messageId]: currentReactions.filter(
                    (r: any) => !(r.emoji === data.emoji && r.user_id === data.userId)
                  ),
                };
              }
              return prev;
            });
          });
      }
    });

    newSocket.on('message_read_receipt', (data: any) => {
      if (data.conversationId === conversationId) {
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).map((msg: any) =>
              msg.id === data.messageId
                ? { ...msg, is_read: true, read_at: new Date().toISOString() }
                : msg
            ),
          },
        }));
      }
    });

    newSocket.on('user_typing', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
        // Handle typing indicator
      }
    });

    newSocket.on('call_initiated', (data: any) => {
      if (data.conversationId === conversationId) {
        setCallType(data.callType);
        setIsIncomingCall(true);
        setIsCallOpen(true);
        setCurrentCall({ id: data.callId, caller_id: data.callerId });
      }
    });

    newSocket.on('call_answered', (data: any) => {
      if (data.conversationId === conversationId) {
        setIsIncomingCall(false);
        setIsCalling(false);
        toast.success('Call answered');
      }
    });

    newSocket.on('call_ended', (data: any) => {
      if (data.conversationId === conversationId) {
        setIsCallOpen(false);
        setCurrentCall(null);
        toast('Call ended');
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_conversation', conversationId);
        newSocket.disconnect();
      }
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;
    
    if (isBlocked) {
      toast.error('You have blocked this user. Unblock to send messages.');
      return;
    }

    if (isOnChainEnabled()) {
      try {
        toast.loading('Sending message...', { id: 'send-message' });

        const receiverResponse = await fetch(`/api/profile/${participant?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const receiverData = await receiverResponse.json();
        const receiverWallet = receiverData.user?.wallet_address;

        if (!receiverWallet) {
          toast.error('Receiver wallet address not found', { id: 'send-message' });
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId,
              content: message.trim(),
              messageType: 'text',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addMessage(conversationId, data.message);
            socket.emit('send_message', {
              conversationId,
              message: data.message,
            });
            setMessage('');
          }
          return;
        }

        const response = await fetch('/api/messages/server-send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId,
            receiverWalletAddress: receiverWallet,
            content: message.trim(),
            messageType: 'text',
            ipfsHash: '',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          addMessage(conversationId, data.message);
          socket.emit('send_message', {
            conversationId,
            message: data.message,
          });
          setMessage('');
          toast.success('Message sent!', { id: 'send-message' });
        } else {
          const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
          toast.error(error.error || 'Failed to send message', { id: 'send-message' });
          const fallbackResponse = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId,
              content: message.trim(),
              messageType: 'text',
            }),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            addMessage(conversationId, fallbackData.message);
            socket.emit('send_message', {
              conversationId,
              message: fallbackData.message,
            });
            setMessage('');
          }
        }
      } catch (error: any) {
        console.error('Send message error:', error);
        const errorMessage = error.message?.includes('Failed to process') 
          ? 'Failed to send message. Please try again.'
          : error.message?.includes('not configured') || error.message?.includes('temporarily unavailable')
          ? 'Service temporarily unavailable. Please try again later.'
          : 'Failed to send message. Please try again.';
        toast.error(errorMessage, { id: 'send-message' });
        try {
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId,
              content: message.trim(),
              messageType: 'text',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addMessage(conversationId, data.message);
            socket.emit('send_message', {
              conversationId,
              message: data.message,
            });
            setMessage('');
            toast.success('Message sent', { id: 'send-message' });
          } else {
            toast.error('Failed to send message. Please try again.', { id: 'send-message' });
          }
        } catch (fallbackError) {
          console.error('Fallback send error:', fallbackError);
          toast.error('Failed to send message. Please try again.', { id: 'send-message' });
        }
      }
    } else {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId,
            content: message.trim(),
            messageType: 'text',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          addMessage(conversationId, data.message);
          socket.emit('send_message', {
            conversationId,
            message: data.message,
          });
          setMessage('');
        } else {
          toast.error('Failed to send message');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
      }
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear all messages in this chat?')) return;
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/clear`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [],
          },
        }));
        toast.success('Chat cleared');
        setShowChatMenu(false);
      } else {
        toast.error('Failed to clear chat');
      }
    } catch (error) {
      console.error('Clear chat error:', error);
      toast.error('Failed to clear chat');
    }
  };

  const handleBlockUser = async () => {
    if (!participant?.id) return;
    if (!confirm(`Are you sure you want to block ${participant.display_name || participant.username}?`)) return;

    try {
      const response = await fetch('/api/blocked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: participant.id }),
      });

      if (response.ok) {
        setIsBlocked(true);
        toast.success('User blocked');
        setShowChatMenu(false);
      } else {
        toast.error('Failed to block user');
      }
    } catch (error) {
      console.error('Block user error:', error);
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    if (!participant?.id) return;
    if (!confirm(`Are you sure you want to unblock ${participant.display_name || participant.username}?`)) return;

    try {
      const response = await fetch(`/api/blocked/${participant.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsBlocked(false);
        toast.success('User unblocked');
        setShowChatMenu(false);
      } else {
        toast.error('Failed to unblock user');
      }
    } catch (error) {
      console.error('Unblock user error:', error);
      toast.error('Failed to unblock user');
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) return;
    if (!confirm(`Delete ${selectedMessages.size} message(s)?`)) return;

    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageIds: Array.from(selectedMessages) }),
      });

      if (response.ok) {
        const currentMessages = messages[conversationId] || [];
        const filteredMessages = currentMessages.filter((msg: any) => !selectedMessages.has(msg.id));
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: filteredMessages,
          },
        }));
        setSelectedMessages(new Set());
        setIsSelectMode(false);
        toast.success('Messages deleted');
      } else {
        toast.error('Failed to delete messages');
      }
    } catch (error) {
      console.error('Delete messages error:', error);
      toast.error('Failed to delete messages');
    }
  };

  const handleForwardSelected = () => {
    if (selectedMessages.size === 0) return;
    toast('Forward feature coming soon');
  };


  const handleVideoCall = async () => {
    if (!participant || !token || isBlocked) {
      if (isBlocked) {
        toast.error('You have blocked this user. Unblock to make calls.');
      }
      return;
    }

    try {
      toast.loading('Initiating video call...', { id: 'initiate-video-call' });
      
      const response = await fetch('/api/calls/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          receiverId: participant.id,
          callType: 'video',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCallType('video');
        setIsIncomingCall(false);
        setIsCalling(true);
        setIsCallOpen(true);
        setCurrentCall(data.call);
        if (socket) {
          socket.emit('initiate_call', {
            conversationId,
            callId: data.call.id,
            callType: 'video',
            receiverId: participant.id,
          });
        }
        toast.success('Video call initiated!', { id: 'initiate-video-call' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to initiate video call. Please try again.', { id: 'initiate-video-call' });
      }
    } catch (error: any) {
      console.error('Call error:', error);
      toast.error('Failed to initiate video call. Please try again.', { id: 'initiate-video-call' });
    }
  };

  const handleAudioCall = async () => {
    if (!participant || !token || isBlocked) {
      if (isBlocked) {
        toast.error('You have blocked this user. Unblock to make calls.');
      }
      return;
    }

    try {
      toast.loading('Initiating call...', { id: 'initiate-call' });
      
      const response = await fetch('/api/calls/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          receiverId: participant.id,
          callType: 'audio',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCallType('audio');
        setIsIncomingCall(false);
        setIsCalling(true);
        setIsCallOpen(true);
        setCurrentCall(data.call);
        if (socket) {
          socket.emit('initiate_call', {
            conversationId,
            callId: data.call.id,
            callType: 'audio',
            receiverId: participant.id,
          });
        }
        toast.success('Call initiated!', { id: 'initiate-call' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to initiate call. Please try again.', { id: 'initiate-call' });
      }
    } catch (error: any) {
      console.error('Call error:', error);
      toast.error('Failed to initiate call. Please try again.', { id: 'initiate-call' });
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    if (isBlocked) {
      toast.error('You have blocked this user. Unblock to send photos.');
      return;
    }
    cameraInputRef.current?.click();
  };

  const handleCameraFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Process as image
    await processAndSendFile(file, 'image');
    
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const processAndSendFile = async (file: File, messageType: string) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit');
      return;
    }

    try {
      setUploading(true);
      toast.loading('Sending photo...', { id: 'file-upload' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('messageType', messageType);

      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        toast.error(uploadData.error || 'Failed to upload file', { id: 'file-upload' });
        return;
      }

      if (!isOnChainEnabled() || typeof window === 'undefined' || !window.ethereum) {
        addMessage(conversationId, uploadData.message);
        if (socket) {
          socket.emit('send_message', {
            conversationId,
            message: uploadData.message,
          });
        }
        toast.success('Photo sent!', { id: 'file-upload' });
        return;
      }

      if (isOnChainEnabled()) {
        try {
          const receiverResponse = await fetch(`/api/profile/${participant?.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const receiverData = await receiverResponse.json();
          const receiverWallet = receiverData.user?.wallet_address;

          if (!receiverWallet) {
            addMessage(conversationId, uploadData.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: uploadData.message,
              });
            }
            toast.success('Photo sent!', { id: 'file-upload' });
            return;
          }

          const response = await fetch('/api/messages/server-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId,
              receiverWalletAddress: receiverWallet,
              content: uploadData.message.content,
              messageType,
              ipfsHash: uploadData.message.ipfs_hash || '',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addMessage(conversationId, data.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: data.message,
              });
            }
            toast.success('Photo sent!', { id: 'file-upload' });
          } else {
            addMessage(conversationId, uploadData.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: uploadData.message,
              });
            }
            toast.success('Photo sent!', { id: 'file-upload' });
          }
        } catch (error: any) {
          console.error('On-chain file error:', error);
          addMessage(conversationId, uploadData.message);
          if (socket) {
            socket.emit('send_message', {
              conversationId,
              message: uploadData.message,
            });
          }
          toast.success('Photo sent!', { id: 'file-upload' });
        }
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error(error.message || 'Failed to send file', { id: 'file-upload' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    if (isBlocked) {
      toast.error('You have blocked this user. Unblock to send files.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    let messageType = 'file';
    if (file.type.startsWith('image/')) {
      messageType = 'image';
    } else if (file.type.startsWith('video/')) {
      messageType = 'video';
    } else if (file.type.startsWith('audio/')) {
      messageType = 'audio';
    }

    try {
      setUploading(true);
      toast.loading('Uploading file...', { id: 'file-upload' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('messageType', messageType);

      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        toast.error(uploadData.error || 'Failed to upload file', { id: 'file-upload' });
        return;
      }

      if (!isOnChainEnabled() || typeof window === 'undefined' || !window.ethereum) {
        addMessage(conversationId, uploadData.message);
        if (socket) {
          socket.emit('send_message', {
            conversationId,
            message: uploadData.message,
          });
        }
        toast.success('File sent successfully', { id: 'file-upload' });
        return;
      }

      if (isOnChainEnabled()) {
        toast.loading('Sending file...', { id: 'file-upload' });

        try {
          const receiverResponse = await fetch(`/api/profile/${participant?.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const receiverData = await receiverResponse.json();
          const receiverWallet = receiverData.user?.wallet_address;

          if (!receiverWallet) {
            toast.error('Receiver wallet address not found', { id: 'file-upload' });
            addMessage(conversationId, uploadData.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: uploadData.message,
              });
            }
            toast.success('File sent!', { id: 'file-upload' });
            return;
          }

          const response = await fetch('/api/messages/server-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId,
              receiverWalletAddress: receiverWallet,
              content: uploadData.message.content,
              messageType,
              ipfsHash: uploadData.message.ipfs_hash || '',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addMessage(conversationId, data.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: data.message,
              });
            }
            toast.success('File sent!', { id: 'file-upload' });
          } else {
            const error = await response.json().catch(() => ({ error: 'Failed to send file' }));
            toast.error(error.error || 'Failed to send file', { id: 'file-upload' });
            addMessage(conversationId, uploadData.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: uploadData.message,
              });
            }
          }
        } catch (error: any) {
          console.error('On-chain file error:', error);
          toast.error('Failed to send file. Please try again.', { id: 'file-upload' });
          addMessage(conversationId, uploadData.message);
          if (socket) {
            socket.emit('send_message', {
              conversationId,
              message: uploadData.message,
            });
          }
        }
      } else {
        addMessage(conversationId, uploadData.message);
        if (socket) {
          socket.emit('send_message', {
            conversationId,
            message: uploadData.message,
          });
        }
        toast.success('File sent successfully', { id: 'file-upload' });
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error(error.message || 'Failed to send file', { id: 'file-upload' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const startRecording = async () => {
    if (isBlocked) {
      toast.error('You have blocked this user. Unblock to send voice messages.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error('Failed to start recording');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setRecordingTime(0);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    try {
      setUploading(true);
      toast.loading('Sending voice message...', { id: 'voice-message' });

      // Create a File object from the Blob with proper name and type
      const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
        type: 'audio/webm',
        lastModified: Date.now(),
      });

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'audio');

      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        toast.error(uploadData.error || 'Failed to upload voice message', { id: 'voice-message' });
        setUploading(false);
        return;
      }

      // Check if message exists in response
      if (!uploadData.message) {
        toast.error('Invalid response from server', { id: 'voice-message' });
        setUploading(false);
        return;
      }

      if (isOnChainEnabled()) {
        const receiverResponse = await fetch(`/api/profile/${participant?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const receiverData = await receiverResponse.json();
        const receiverWallet = receiverData.user?.wallet_address;

        if (receiverWallet) {
          const response = await fetch('/api/messages/server-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId,
              receiverWalletAddress: receiverWallet,
              content: uploadData.message.content,
              messageType: 'audio',
              ipfsHash: uploadData.message.ipfs_hash || '',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addMessage(conversationId, data.message);
            if (socket) {
              socket.emit('send_message', {
                conversationId,
                message: data.message,
              });
            }
            toast.success('Voice message sent!', { id: 'voice-message' });
            return;
          }
        }
      }

      addMessage(conversationId, uploadData.message);
      if (socket) {
        socket.emit('send_message', {
          conversationId,
          message: uploadData.message,
        });
      }
      toast.success('Voice message sent!', { id: 'voice-message' });
    } catch (error: any) {
      console.error('Send voice message error:', error);
      const errorMessage = error.message?.includes('Failed to process') 
        ? 'Failed to send voice message. Please try again.'
        : error.message?.includes('not configured') || error.message?.includes('temporarily unavailable')
        ? 'Service temporarily unavailable. Please try again later.'
        : 'Failed to send voice message. Please try again.';
      toast.error(errorMessage, { id: 'voice-message' });
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!token) return;

    // Optimistic update
    setMessageReactions((prev) => {
      const currentReactions = prev[messageId] || [];
      const existingReaction = currentReactions.find(
        (r) => r.emoji === emoji && r.user_id === user?.id
      );
      
      if (existingReaction) {
        // Remove reaction
        return {
          ...prev,
          [messageId]: currentReactions.filter(
            (r) => !(r.emoji === emoji && r.user_id === user?.id)
          ),
        };
      } else {
        // Add reaction
        return {
          ...prev,
          [messageId]: [...currentReactions, { emoji, user_id: user?.id }],
        };
      }
    });

    try {
      const response = await fetch('/api/messages/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId, emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Fetch updated reactions
        const reactionsResponse = await fetch(`/api/messages/reactions?messageId=${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (reactionsResponse.ok) {
          const reactionsData = await reactionsResponse.json();
          setMessageReactions((prev) => ({
            ...prev,
            [messageId]: reactionsData.reactions || [],
          }));
        }

        // Emit socket event
        if (socket) {
          socket.emit('message_reaction', {
            conversationId,
            messageId,
            emoji,
            action: data.action,
            userId: user?.id,
          });
        }
      } else {
        // Revert on error
        loadMessages();
        const error = await response.json();
        toast.error(error.error || 'Failed to update reaction');
      }
    } catch (error: any) {
      console.error('Reaction error:', error);
      loadMessages();
      toast.error('Failed to update reaction');
    }

    setShowReactionPicker(null);
  };

  const handleAcceptCall = async () => {
    if (!currentCall || !token) return;
    
    try {
      const response = await fetch(`/api/calls/${currentCall.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'answered' }),
      });

      if (response.ok) {
        setIsIncomingCall(false);
        if (socket) {
          socket.emit('answer_call', {
            callId: currentCall.id,
            conversationId,
          });
        }
        toast.success('Call accepted!');
      } else {
        toast.error('Failed to accept call');
      }
    } catch (error) {
      console.error('Accept call error:', error);
      toast.error('Failed to accept call');
    }
  };


  const handleDeclineCall = async () => {
    if (!currentCall || !token) return;
    try {
      const response = await fetch(`/api/calls/${currentCall.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'declined' }),
      });
      
      if (response.ok) {
        setIsCallOpen(false);
        setCurrentCall(null);
        if (socket) {
          socket.emit('decline_call', {
            callId: currentCall.id,
            conversationId,
            declinerName: user?.displayName || user?.username || 'User',
          });
        }
        toast.success('Call declined');
      } else {
        toast.error('Failed to decline call. Please try again.');
      }
    } catch (error) {
      console.error('Decline call error:', error);
      toast.error('Failed to decline call. Please try again.');
    }
  };

  const handleEndCall = async () => {
    if (!currentCall || !token) return;
    
    try {
      await fetch(`/api/calls/${currentCall.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      toast.success('Call ended');
    } catch (error) {
      console.error('End call error:', error);
    }
    
    setIsCallOpen(false);
    setCurrentCall(null);
    if (socket) {
      socket.emit('end_call', {
        callId: currentCall.id,
        conversationId,
      });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen mesh-bg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen mesh-bg">
      {/* Header */}
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/chats')}
            className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => participant?.id && router.push(`/profile/${participant.id}`)}
            className="flex items-center space-x-3 flex-1 min-w-0"
          >
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex-shrink-0 overflow-hidden shadow-lg shadow-violet-500/20">
              {participant?.profile_picture && participant.profile_picture !== null ? (
                <Image
                  src={participant.profile_picture}
                  alt={participant.username || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {participant?.username?.[0]?.toUpperCase() || participant?.display_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              {participant?.is_online !== null && participant?.is_online && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
                {participant?.display_name || participant?.username || 'Unknown'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {participant?.is_online !== null && participant?.is_online
                  ? <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online</>
                  : participant?.last_seen !== null && participant?.last_seen !== undefined
                    ? `Last seen ${formatLastSeen(participant.last_seen)}`
                    : participant?.last_seen === null
                      ? '' // Show nothing when privacy is enabled
                      : 'Offline'}
              </p>
            </div>
          </button>
          <div className="flex items-center space-x-1">
            <button 
              onClick={handleAudioCall}
              disabled={isBlocked}
              className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              title={isBlocked ? 'Unblock user to make calls' : 'Audio call'}
            >
              <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button 
              onClick={handleVideoCall}
              disabled={isBlocked}
              className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              title={isBlocked ? 'Unblock user to make calls' : 'Video call'}
            >
              <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChatMenu(!showChatMenu);
                }}
                className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
              >
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              {showChatMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowChatMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 glass-card rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsSelectMode(true);
                          setShowChatMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-900 dark:text-white transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Select Messages</span>
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-900 dark:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear Chat</span>
                      </button>
                      {isBlocked ? (
                        <button
                          onClick={handleUnblockUser}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-all"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Unblock User</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleBlockUser}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50/80 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Block User</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Encryption Badge */}
        {showEncryptionBadge && (
          <div className="flex items-center justify-center mt-2">
            <div className="encrypted-badge text-xs">
              <Lock className="w-3 h-3" />
              <span>End-to-end encrypted</span>
              <button 
                onClick={() => setShowEncryptionBadge(false)}
                className="ml-1 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selection Mode Bar */}
      {isSelectMode && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between shadow-lg animate-slide-in-down">
          <span className="font-semibold">{selectedMessages.size} selected</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleForwardSelected}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all"
              disabled={selectedMessages.size === 0}
            >
              <Forward className="w-5 h-5" />
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all"
              disabled={selectedMessages.size === 0}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedMessages(new Set());
              }}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(messages[conversationId] || []).map((msg: any, index: number) => {
          const isOwn = msg.sender_id === user?.id;
          const isImage = msg.message_type === 'image';
          const isVideo = msg.message_type === 'video';
          const isAudio = msg.message_type === 'audio';
          const isFile = msg.message_type === 'file';
          const isSelected = selectedMessages.has(msg.id);
          // Get reactions - prioritize state, then message reactions, then empty array
          const reactions = (messageReactions[msg.id] || msg.reactions || []).filter((r: any) => r && r.emoji);
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}
              style={{ animationDelay: `${index * 0.02}s` }}
              onClick={() => {
                if (isSelectMode) {
                  toggleMessageSelection(msg.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!isSelectMode) {
                  setIsSelectMode(true);
                  toggleMessageSelection(msg.id);
                }
              }}
            >
              <div
                className={`relative max-w-xs lg:max-w-md rounded-3xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  isOwn
                    ? 'message-own'
                    : 'message-other'
                } ${
                  isSelected ? 'ring-2 ring-violet-500 ring-offset-2 scale-[1.02]' : ''
                } hover:shadow-lg`}
              >
                {isImage && (
                  <div className="relative w-full max-w-sm">
                    <Image
                      src={msg.ipfs_hash 
                        ? `https://gateway.pinata.cloud/ipfs/${msg.ipfs_hash}` 
                        : msg.content?.startsWith('http') 
                          ? msg.content 
                          : msg.content?.startsWith('ipfs://')
                            ? `https://gateway.pinata.cloud/ipfs/${msg.content.replace('ipfs://', '')}`
                            : msg.content || ''}
                      alt="Image"
                      width={400}
                      height={400}
                      className="w-full h-auto object-cover rounded-lg"
                      unoptimized
                      onError={(e) => {
                        console.error('Image load error:', e);
                        // Try fallback URL
                        if (msg.content && !msg.content.includes('gateway.pinata.cloud')) {
                          (e.target as HTMLImageElement).src = `https://gateway.pinata.cloud/ipfs/${msg.content}`;
                        }
                      }}
                    />
                  </div>
                )}
                {isVideo && (
                  <div className="relative w-full">
                    <video
                      src={msg.ipfs_hash 
                        ? `https://gateway.pinata.cloud/ipfs/${msg.ipfs_hash}` 
                        : msg.content?.startsWith('http') 
                          ? msg.content 
                          : msg.content?.startsWith('ipfs://')
                            ? `https://gateway.pinata.cloud/ipfs/${msg.content.replace('ipfs://', '')}`
                            : msg.content || ''}
                      controls
                      className="w-full h-auto max-h-96 rounded-lg"
                      preload="metadata"
                    />
                  </div>
                )}
                {isAudio && (
                  <div className="p-4">
                    <audio 
                      controls 
                      className="w-full max-w-sm" 
                      preload="metadata"
                      key={msg.id} // Force re-render on message change
                    >
                      {(() => {
                        // Determine the audio URL
                        let audioUrl = '';
                        if (msg.ipfs_hash) {
                          audioUrl = `https://gateway.pinata.cloud/ipfs/${msg.ipfs_hash}`;
                        } else if (msg.content) {
                          if (msg.content.startsWith('http')) {
                            audioUrl = msg.content;
                          } else if (msg.content.startsWith('ipfs://')) {
                            audioUrl = `https://gateway.pinata.cloud/ipfs/${msg.content.replace('ipfs://', '')}`;
                          } else if (msg.content.includes('gateway.pinata.cloud')) {
                            audioUrl = msg.content;
                          } else {
                            // Assume it's an IPFS hash
                            audioUrl = `https://gateway.pinata.cloud/ipfs/${msg.content}`;
                          }
                        }
                        
                        return audioUrl ? (
                          <>
                            <source src={audioUrl} type="audio/webm" />
                            <source src={audioUrl} type="audio/mpeg" />
                            <source src={audioUrl} type="audio/ogg" />
                            <source src={audioUrl} type="audio/wav" />
                          </>
                        ) : null;
                      })()}
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {isFile && (
                  <div className="p-4 flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 dark:bg-gray-700/50 flex items-center justify-center">
                      <File className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {msg.file_name || 'File'}
                      </p>
                      <p className="text-xs opacity-75">
                        {msg.file_size ? `${(msg.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </p>
                    </div>
                    <a
                      href={msg.content}
                      download
                      className="p-2.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                )}
                {msg.message_type === 'text' && !isImage && !isVideo && !isFile && !isAudio && (
                  <p className="text-sm px-4 py-3 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                )}
                
                {/* Reactions */}
                {reactions && reactions.length > 0 && (
                  <div className={`px-3 pb-2 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(
                      reactions.reduce((acc: any, r: any) => {
                        const emoji = r?.emoji || r;
                        if (!emoji) return acc;
                        if (!acc[emoji]) acc[emoji] = [];
                        acc[emoji].push(r);
                        return acc;
                      }, {})
                    ).map(([emoji, reactionList]: [string, any]) => (
                      <button
                        key={`${msg.id}-${emoji}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSelectMode) handleReaction(msg.id, emoji);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs flex items-center space-x-1 transition-all hover:scale-110 active:scale-95 ${
                          isOwn
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                        disabled={isSelectMode}
                        title={`${reactionList.length} reaction${reactionList.length > 1 ? 's' : ''}`}
                      >
                        <span>{emoji}</span>
                        <span className="font-medium">{Array.isArray(reactionList) ? reactionList.length : 1}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className={`flex items-center justify-between gap-2 px-4 pb-3 ${isImage || isVideo || isFile || isAudio ? 'pt-2' : ''}`}>
                  <div className="flex items-center gap-1">
                    {!isSelectMode && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id);
                          }}
                          className={`p-1.5 rounded-full transition-all hover:scale-110 ${
                            isOwn
                              ? 'hover:bg-white/20 text-white/80'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                          title="Add reaction"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        
                        {/* Reaction Picker */}
                        {showReactionPicker === msg.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowReactionPicker(null)} 
                            />
                            <div className={`absolute bottom-full mb-2 glass-card rounded-2xl p-2 flex gap-1 z-50 animate-pop-in ${isOwn ? 'right-0' : 'left-0'}`}>
                              {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReaction(msg.id, emoji);
                                  }}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xl transition-all hover:scale-125 active:scale-95"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-[10px] ${
                        isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                    {isOwn && (
                      <span>
                        {msg.is_read ? (
                          <CheckCheck className="w-4 h-4 text-blue-300" />
                        ) : (
                          <Check className="w-4 h-4 text-white/60" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-card border-t border-gray-200/30 dark:border-gray-700/30 p-4">
        {isRecording && (
          <div className="mb-3 flex items-center justify-center space-x-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <span className="text-red-600 dark:text-red-400 font-semibold">
              Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </span>
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all flex items-center space-x-2 active:scale-95"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          {/* Camera Button - Quick Photo */}
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={uploading || isBlocked || isRecording}
            className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-2xl disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-95 camera-btn"
            title="Take photo"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraFileSelect}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isBlocked || isRecording}
            className="p-3 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-2xl disabled:opacity-50 transition-all active:scale-95"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={uploading || isBlocked}
              className="p-3 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-2xl disabled:opacity-50 transition-all active:scale-95"
              title="Record voice message"
            >
              <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              disabled={uploading}
              className="p-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-2xl transition-all active:scale-95"
              title="Stop recording"
            >
              <Square className="w-5 h-5 text-red-600 dark:text-red-400" />
            </button>
          )}
          
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isBlocked ? "You have blocked this user" : isRecording ? "Recording voice message..." : "Type a message..."}
            disabled={isBlocked || isRecording}
            className="flex-1 px-5 py-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white dark:focus:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          
          {!isRecording && <EmojiPicker onSelect={handleEmojiSelect} />}
          
          {!isRecording && (
            <button
              type="submit"
              disabled={!message.trim() || uploading || isBlocked}
              className="p-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:hover:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </form>
        {uploading && !isRecording && (
          <div className="flex items-center justify-center mt-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-2" />
            Uploading...
          </div>
        )}
      </div>

      {/* Call Modal */}
      <CallModal
        isOpen={isCallOpen}
        callType={callType}
        isIncoming={isIncomingCall}
        isCalling={isCalling}
        callerName={participant?.display_name || participant?.username}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        onEnd={handleEndCall}
      />
    </div>
  );
}
