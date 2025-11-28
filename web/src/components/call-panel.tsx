"use client";

import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { getSocket } from "../lib/socket";

interface Props {
  conversationId?: string;
  myAddress?: string;
}

export function CallPanel({ conversationId, myAddress }: Props) {
  const [inCall, setInCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!conversationId || !myAddress) return;

    if (!socket.connected) {
      socket.connect();
    }
    
    const handleConnect = () => {
      socket.emit("join-conversation", conversationId);
    };
    
    if (socket.connected) {
      socket.emit("join-conversation", conversationId);
    } else {
      socket.on("connect", handleConnect);
    }

    const handleCallOffer = async ({ signal, from }: any) => {
      if (!from || from.toLowerCase() === myAddress.toLowerCase()) return;
      console.log("Incoming call from:", from);
      await startCall(false, signal);
    };

    const handleCallAnswer = ({ signal, from }: any) => {
      if (!from || from.toLowerCase() === myAddress.toLowerCase()) return;
      console.log("Call answered by:", from);
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    };

    const handleIceCandidate = ({ candidate, from }: any) => {
      if (!from || from.toLowerCase() === myAddress.toLowerCase()) return;
      if (peerRef.current && candidate) {
        peerRef.current.signal(candidate);
      }
    };

    socket.on("call-offer", handleCallOffer);
    socket.on("call-answer", handleCallAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("call-offer", handleCallOffer);
      socket.off("call-answer", handleCallAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [conversationId, myAddress]);

  async function startCall(initiator: boolean, incomingSignal?: Peer.SignalData) {
    if (!conversationId || !myAddress) return;

    // Check if we're in browser and media devices are available
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Media devices are not available. Please use a browser that supports camera/microphone access.");
      return;
    }

    const socket = getSocket();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone. Please check your browser permissions.");
      return;
    }
    streamRef.current = stream;

    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
    });
    peerRef.current = peer;

    peer.on("signal", (signal: Peer.SignalData) => {
      if (!conversationId || !myAddress) return;
      if (initiator) {
        console.log("Sending call offer");
        socket.emit("call-offer", { conversationId, from: myAddress, signal });
      } else {
        console.log("Sending call answer");
        socket.emit("call-answer", { conversationId, from: myAddress, signal });
      }
    });
    
    peer.on("error", (err) => {
      console.error("Peer error:", err);
      alert("Call error: " + err.message);
      hangup();
    });
    
    peer.on("close", () => {
      console.log("Peer connection closed");
      hangup();
    });

    peer.on("stream", (remoteStream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    if (incomingSignal) {
      peer.signal(incomingSignal);
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    setInCall(true);
  }

  function hangup() {
    peerRef.current?.destroy();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setInCall(false);
  }

  function toggleVideo() {
    const stream = streamRef.current;
    if (!stream) return;
    const enabled = !videoEnabled;
    stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setVideoEnabled(enabled);
  }

  function toggleAudio() {
    const stream = streamRef.current;
    if (!stream) return;
    const enabled = !audioEnabled;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setAudioEnabled(enabled);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/80 px-3 py-2">
      <button
        onClick={() => startCall(true)}
        disabled={!conversationId || inCall}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
        title="Start call"
      >
        <Phone className="h-4 w-4" />
      </button>
      <button
        onClick={hangup}
        disabled={!inCall}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
        title="End call"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
      <button
        onClick={toggleVideo}
        disabled={!inCall}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        title="Toggle video"
      >
        {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </button>
      <button
        onClick={toggleAudio}
        disabled={!inCall}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        title="Toggle audio"
      >
        {audioEnabled ? "🔊" : "🔇"}
      </button>

      <div className="ml-auto flex gap-2">
        <video
          ref={localVideoRef}
          className="h-14 w-20 rounded-lg bg-black object-cover"
          muted
          autoPlay
          playsInline
        />
        <video
          ref={remoteVideoRef}
          className="h-14 w-20 rounded-lg bg-black object-cover"
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
}


