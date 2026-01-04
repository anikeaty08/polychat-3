'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { io, Socket } from 'socket.io-client';
import CallModal from './CallModal';
import toast from 'react-hot-toast';

export default function GlobalCallHandler() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [callerInfo, setCallerInfo] = useState<any>(null);

  useEffect(() => {
    if (!user || !token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Global socket connected');
    });

    // Listen for incoming calls globally
    newSocket.on('call_initiated', async (data) => {
      console.log('Incoming call received:', data);
      
      // Fetch caller info
      try {
        const response = await fetch(`/api/profile/${data.callerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const callerData = await response.json();
          setCallerInfo(callerData.user);
        }
      } catch (error) {
        console.error('Failed to fetch caller info:', error);
      }

      setCallType(data.callType);
      setIsIncomingCall(true);
      setIsCallOpen(true);
      setCurrentCall({
        id: data.callId,
        conversationId: data.conversationId,
        callerId: data.callerId,
      });

      // Show notification
      toast.success(`Incoming ${data.callType} call`, {
        duration: 5000,
      });
    });

    newSocket.on('call_answered', (data) => {
      if (currentCall?.id === data.callId) {
        setIsIncomingCall(false);
        toast.success('Call answered');
      }
    });

    newSocket.on('call_ended', (data) => {
      if (currentCall?.id === data.callId) {
        setIsCallOpen(false);
        setCurrentCall(null);
        setCallerInfo(null);
        toast('Call ended');
      }
    });

    newSocket.on('call_declined', (data) => {
      if (currentCall?.id === data.callId) {
        setIsCallOpen(false);
        setCurrentCall(null);
        setCallerInfo(null);
        toast(`${data.declinerName || 'User'} declined the call`, {
          icon: '📞',
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const handleAcceptCall = async () => {
    if (!currentCall || !token) return;
    
    // Navigate to conversation if not already there
    if (currentCall.conversationId) {
      router.push(`/chats/${currentCall.conversationId}`);
    }

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
            conversationId: currentCall.conversationId,
          });
        }
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
        setCallerInfo(null);
        
        if (socket) {
          socket.emit('decline_call', {
            callId: currentCall.id,
            conversationId: currentCall.conversationId,
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
      
      setIsCallOpen(false);
      setCurrentCall(null);
      setCallerInfo(null);
      
      if (socket) {
        socket.emit('end_call', {
          callId: currentCall.id,
          conversationId: currentCall.conversationId,
        });
      }
    } catch (error) {
      console.error('End call error:', error);
    }
  };

  if (!isCallOpen) return null;

  return (
    <CallModal
      isOpen={isCallOpen}
      callType={callType}
      isIncoming={isIncomingCall}
      callerName={callerInfo?.display_name || callerInfo?.username || 'Unknown'}
      onAccept={handleAcceptCall}
      onDecline={handleDeclineCall}
      onEnd={handleEndCall}
    />
  );
}

