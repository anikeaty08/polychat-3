'use client';

import { useEffect, useRef, useState } from 'react';
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
  const currentCallRef = useRef<any>(null);
  const [callerInfo, setCallerInfo] = useState<any>(null);
  const [callOffer, setCallOffer] = useState<RTCSessionDescriptionInit | null>(null);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    if (!user || !token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('Global socket connected');
    });

    newSocket.on('call_initiated', async (data: any) => {
      try {
        const response = await fetch(`/api/profile/${data.callerId}`, {
          headers: { Authorization: `Bearer ${token}` },
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
      setCallOffer(data.offer || null);
      setCurrentCall({
        id: data.callId,
        conversationId: data.conversationId,
        callerId: data.callerId,
      });

      toast.success(`Incoming ${data.callType} call`, { duration: 5000 });
    });

    newSocket.on('call_answered', (data: any) => {
      if (currentCallRef.current?.id === data.callId) {
        setIsIncomingCall(false);
      }
    });

    newSocket.on('call_ended', (data: any) => {
      if (currentCallRef.current?.id === data.callId) {
        setIsCallOpen(false);
        setCurrentCall(null);
        setCallerInfo(null);
        setCallOffer(null);
      }
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const handleAcceptCall = async () => {
    if (!currentCall || !token) return;

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

      if (response.ok && socket) {
        setIsIncomingCall(false);
        socket.emit('answer_call', {
          callId: currentCall.id,
          conversationId: currentCall.conversationId,
          receiverId: currentCall.callerId,
        });
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
        setCallOffer(null);

        socket?.emit('decline_call', {
          callId: currentCall.id,
          conversationId: currentCall.conversationId,
          receiverId: currentCall.callerId,
          declinerName: user?.displayName || user?.username || 'User',
        });
      }
    } catch (error) {
      console.error('Decline call error:', error);
      toast.error('Failed to decline call');
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
    } catch (error) {
      console.error('End call error:', error);
    }

    setIsCallOpen(false);
    setCurrentCall(null);
    setCallerInfo(null);
    setCallOffer(null);

    socket?.emit('end_call', {
      callId: currentCall.id,
      conversationId: currentCall.conversationId,
      receiverId: currentCall.callerId,
    });
  };

  if (!isCallOpen) return null;

  return (
    <CallModal
      isOpen={isCallOpen}
      callType={callType}
      isIncoming={isIncomingCall}
      callerName={callerInfo?.display_name || callerInfo?.username || 'Unknown'}
      socket={socket}
      callId={currentCall?.id}
      remoteUserId={currentCall?.callerId}
      initialOffer={callOffer}
      onAccept={handleAcceptCall}
      onDecline={handleDeclineCall}
      onEnd={handleEndCall}
    />
  );
}
