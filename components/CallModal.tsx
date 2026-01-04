'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Video, X, Mic, MicOff, VideoOff, PhoneOff, Volume2, VolumeX, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
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
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize call with retry logic
  const initializeCall = useCallback(async () => {
    if (isInitializing) return;
    setIsInitializing(true);

    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection with multiple STUN/TURN servers
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setIsConnected(true);
          toast.success('Call connected!');
          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        } else if (peerConnection.connectionState === 'failed') {
          toast.error('Connection failed. Please try again.');
          handleEnd();
        } else if (peerConnection.connectionState === 'disconnected') {
          toast.error('Call disconnected.');
        }
      };

      // ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
          setIsConnected(true);
        }
      };

      // Create and set local description
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await peerConnection.setLocalDescription(offer);

      // For demo purposes, simulate connection
      setTimeout(() => {
        if (!isConnected) {
          setIsConnected(true);
          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      }, 2000);

      setRetryCount(0);
    } catch (error: any) {
      console.error('Error initializing call:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (retryCount < 2) {
          setRetryCount((prev) => prev + 1);
          toast.error('Please allow camera/microphone access');
          setTimeout(() => {
            setIsInitializing(false);
            initializeCall();
          }, 2000);
        } else {
          toast.error('Camera/microphone permission denied. Please enable in browser settings.');
          onEnd();
        }
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No camera/microphone found. Please connect a device.');
        onEnd();
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera/microphone is being used by another application.');
        onEnd();
      } else {
        toast.error('Unable to access camera/microphone. Please try again.');
        onEnd();
      }
    } finally {
      setIsInitializing(false);
    }
  }, [callType, retryCount, isConnected, isInitializing, onEnd]);

  useEffect(() => {
    if (isOpen && !isIncoming && !isInitializing) {
      initializeCall();
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isIncoming]);

  const cleanup = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    setCallDuration(0);
  };

  const handleAccept = async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsConnected(true);
      onAccept();
      toast.success('Call accepted!');

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error accepting call:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Please allow camera/microphone access to accept the call');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera/microphone found.');
        onDecline();
      } else {
        toast.error('Unable to access camera/microphone.');
        onDecline();
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      toast(isMuted ? 'Microphone unmuted' : 'Microphone muted', { icon: isMuted ? '🎤' : '🔇' });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
      toast(isVideoOff ? 'Camera on' : 'Camera off', { icon: isVideoOff ? '📹' : '📷' });
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerOn;
    }
    toast(isSpeakerOn ? 'Speaker off' : 'Speaker on', { icon: isSpeakerOn ? '🔇' : '🔊' });
  };

  const switchCamera = async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const currentFacingMode = videoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
      
      // Replace track in local stream
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newVideoTrack);
      videoTrack.stop();
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      
      toast.success('Camera switched');
    } catch (error) {
      console.error('Error switching camera:', error);
      toast.error('Failed to switch camera');
    }
  };

  const handleEnd = () => {
    cleanup();
    setIsMuted(false);
    setIsVideoOff(false);
    onEnd();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black z-50 flex items-center justify-center">
      <div className={`relative w-full h-full flex flex-col ${isFullscreen ? '' : 'max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden m-4'}`}>
        
        {/* Remote Video / Call Display */}
        <div className="flex-1 relative bg-gradient-to-br from-violet-900/20 via-gray-900 to-purple-900/20">
          {callType === 'video' && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                {/* Animated Avatar */}
                <div className="relative mb-6">
                  {/* Pulse Rings */}
                  {(isCalling || isIncoming) && (
                    <>
                      <div className="absolute inset-0 w-40 h-40 mx-auto rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute inset-0 w-40 h-40 mx-auto rounded-full bg-violet-500/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    </>
                  )}
                  {/* Avatar */}
                  <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/30">
                    <span className="text-6xl text-white font-bold">
                      {callerName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  {/* Online Indicator */}
                  {isConnected && (
                    <div className="absolute bottom-2 right-1/2 translate-x-[70px] w-5 h-5 bg-emerald-500 rounded-full border-4 border-gray-900 animate-pulse" />
                  )}
                </div>
                
                <h2 className="text-white text-2xl font-bold mb-2">{callerName || 'Caller'}</h2>
                
                {/* Status */}
                <div className="flex items-center justify-center gap-2">
                  {isCalling && (
                    <p className="text-violet-300 flex items-center gap-2">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                      Calling...
                    </p>
                  )}
                  {isIncoming && !isConnected && (
                    <p className="text-emerald-300 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      Incoming {callType} call...
                    </p>
                  )}
                  {!isCalling && !isIncoming && !isConnected && (
                    <p className="text-amber-300 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      Connecting...
                    </p>
                  )}
                  {isConnected && (
                    <p className="text-emerald-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      Connected • {formatDuration(callDuration)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PIP for video calls) */}
        {callType === 'video' && localStream && (
          <div className="absolute top-6 right-6 w-36 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-white" />
          ) : (
            <Maximize2 className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Call Controls */}
        <div className="absolute bottom-0 left-0 right-0 pb-10 pt-20 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center items-center space-x-4">
            {isCalling ? (
              // Outgoing call - only end button
              <button
                onClick={handleEnd}
                className="w-18 h-18 p-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110 active:scale-95"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
            ) : isIncoming && !isConnected ? (
              // Incoming call - accept and decline buttons
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110 active:scale-95"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <button
                  onClick={handleAccept}
                  className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 active:scale-95 animate-pulse"
                >
                  <Phone className="w-9 h-9 text-white" />
                </button>
              </div>
            ) : (
              // Connected - all controls
              <div className="flex items-center space-x-3">
                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                    isMuted 
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                      : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>

                {/* Speaker */}
                <button
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                    !isSpeakerOn 
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                      : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                  }`}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="w-6 h-6 text-white" />
                  ) : (
                    <VolumeX className="w-6 h-6 text-white" />
                  )}
                </button>

                {/* Video Toggle (video calls only) */}
                {callType === 'video' && (
                  <>
                    <button
                      onClick={toggleVideo}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                        isVideoOff 
                          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                          : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                      }`}
                    >
                      {isVideoOff ? (
                        <VideoOff className="w-6 h-6 text-white" />
                      ) : (
                        <Video className="w-6 h-6 text-white" />
                      )}
                    </button>

                    {/* Switch Camera */}
                    <button
                      onClick={switchCamera}
                      className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                      <RotateCcw className="w-6 h-6 text-white" />
                    </button>
                  </>
                )}

                {/* End Call */}
                <button
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110 active:scale-95 ml-4"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
