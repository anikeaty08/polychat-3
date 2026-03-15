'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  RotateCcw,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CallModalProps {
  isOpen: boolean;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  callerName?: string;
  isCalling?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  socket?: Socket | null;
  callId?: string | null;
  remoteUserId?: string | null;
  initialOffer?: RTCSessionDescriptionInit | null;
}

export default function CallModal({
  isOpen,
  callType,
  isIncoming,
  callerName,
  isCalling = false,
  onAccept,
  onDecline,
  onEnd,
  socket,
  callId,
  remoteUserId,
  initialOffer = null,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const outgoingStartedRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const rtcConfig: RTCConfiguration = useMemo(
    () => ({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    }),
    []
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopAndClearStream = (stream: MediaStream | null) => {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  };

  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    try {
      peerConnectionRef.current?.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {
          // ignore
        }
      });
      peerConnectionRef.current?.close();
    } catch {
      // ignore
    } finally {
      peerConnectionRef.current = null;
    }

    stopAndClearStream(localStream);
    stopAndClearStream(remoteStream);
    setLocalStream(null);
    setRemoteStream(null);
    setPendingOffer(null);
    setIsConnected(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    outgoingStartedRef.current = false;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [localStream, remoteStream]);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      setRemoteStream(stream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !socket || !callId || !remoteUserId) return;
      socket.emit('webrtc_ice_candidate', {
        callId,
        receiverId: remoteUserId,
        candidate: event.candidate,
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);
        }
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setIsConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsConnected(true);
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);
        }
      }
      if (pc.iceConnectionState === 'failed') {
        toast.error('Call connection failed (ICE).');
      }
    };

    return pc;
  }, [rtcConfig, socket, callId, remoteUserId]);

  const getMediaStream = useCallback(async () => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === 'video'
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [callType]);

  const startAsCaller = useCallback(async () => {
    if (!socket || !callId || !remoteUserId) return;
    if (outgoingStartedRef.current) return;
    outgoingStartedRef.current = true;

    try {
      const stream = await getMediaStream();
      const pc = ensurePeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_offer', {
        callId,
        receiverId: remoteUserId,
        offer,
        callType,
      });
    } catch (error: any) {
      console.error('Failed to start call:', error);
      outgoingStartedRef.current = false;
      toast.error(error?.message || 'Unable to start call.');
      onEnd();
    }
  }, [socket, callId, remoteUserId, getMediaStream, ensurePeerConnection, callType, onEnd]);

  const startAsCallee = useCallback(async () => {
    if (!socket || !callId || !remoteUserId) return;
    if (!pendingOffer) {
      toast.error('Still connecting… please wait a moment and try again.');
      return;
    }

    try {
      const stream = await getMediaStream();
      const pc = ensurePeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        callId,
        receiverId: remoteUserId,
        answer,
      });
    } catch (error: any) {
      console.error('Failed to accept call:', error);
      toast.error(error?.message || 'Unable to accept call.');
      onDecline();
    }
  }, [socket, callId, remoteUserId, pendingOffer, getMediaStream, ensurePeerConnection, onDecline]);

  const handleAccept = async () => {
    try {
      onAccept();
      await startAsCallee();
      toast.success('Call accepted');
    } catch (error: any) {
      console.error('Accept call error:', error);
      toast.error('Unable to accept call.');
      onDecline();
    }
  };

  const handleEnd = () => {
    cleanup();
    onEnd();
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    setIsMuted((v) => !v);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    setIsVideoOff((v) => !v);
  };

  const switchCamera = async () => {
    if (callType !== 'video') return;
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const currentTrack = localStream?.getVideoTracks()?.[0];
    if (!currentTrack) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      await sender?.replaceTrack(newTrack);

      currentTrack.stop();
      const updated = new MediaStream([newTrack, ...(localStream?.getAudioTracks() || [])]);
      setLocalStream(updated);
      if (localVideoRef.current) localVideoRef.current.srcObject = updated;
    } catch (error) {
      console.error('Switch camera error:', error);
      toast.error('Unable to switch camera.');
    }
  };

  useEffect(() => {
    if (!socket || !callId) return;

    const onOffer = (data: any) => {
      if (!data || data.callId !== callId) return;
      setPendingOffer(data.offer || null);
    };

    const onAnswer = async (data: any) => {
      if (!data || data.callId !== callId) return;
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === 'closed') return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (error) {
        console.error('Set remote answer failed:', error);
      }
    };

    const onCandidate = async (data: any) => {
      if (!data || data.callId !== callId) return;
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === 'closed') return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Add ICE candidate failed:', error);
      }
    };

    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onCandidate);

    return () => {
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onCandidate);
    };
  }, [socket, callId]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialOffer) setPendingOffer(initialOffer);
  }, [isOpen, initialOffer]);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    if (isCalling && !isIncoming) {
      // Outgoing call: start immediately (create offer + send it)
      startAsCaller();
    }

    return () => {
      cleanup();
    };
  }, [isOpen, isCalling, isIncoming, startAsCaller, cleanup]);

  if (!isOpen) return null;

  const title = isIncoming ? `Incoming ${callType} call` : callType === 'video' ? 'Video call' : 'Audio call';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-lg mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-black text-white shadow-2xl ${
          isFullscreen ? 'max-w-5xl h-[85vh]' : ''
        }`}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{callerName || 'Unknown'}</p>
              <p className="text-xs text-white/70">
                {title}
                {isConnected ? ` • ${formatDuration(callDuration)}` : isCalling ? ' • Ringing…' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 transition-all"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={handleEnd}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className={`relative ${isFullscreen ? 'h-full' : 'h-[70vh]'} flex items-center justify-center`}>
          {callType === 'video' ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute bottom-24 right-4 w-32 h-44 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl bg-white/10 mx-auto flex items-center justify-center">
                <Phone className="w-10 h-10" />
              </div>
              <p className="mt-4 text-white/80">{isConnected ? 'Connected' : isIncoming ? 'Incoming call…' : 'Calling…'}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/85 to-transparent">
          <div className="flex justify-center items-center gap-4">
            {isIncoming && !isConnected ? (
              <>
                <button
                  onClick={() => {
                    cleanup();
                    onDecline();
                  }}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/25 transition-all active:scale-95"
                  title="Decline"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <button
                  onClick={handleAccept}
                  className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
                  title="Accept"
                >
                  <Phone className="w-9 h-9 text-white" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                    isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/15'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {callType === 'video' && (
                  <>
                    <button
                      onClick={toggleVideo}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                        isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/15'
                      }`}
                      title={isVideoOff ? 'Turn video on' : 'Turn video off'}
                    >
                      {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </button>

                    <button
                      onClick={switchCamera}
                      className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
                      title="Switch camera"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                  </>
                )}

                <button
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/25 transition-all active:scale-95 ml-2"
                  title="End call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
