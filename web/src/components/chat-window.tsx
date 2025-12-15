"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { polygonChatRegistryAbi, registryAddress } from "../lib/contracts";
import { getSocket } from "../lib/socket";
import { useChatStore } from "../state/chat-store";
import { getConversationId, hashMessageBody } from "../lib/conversation";
import { uploadJsonToLighthouse, fetchLighthouseJson } from "../lib/lighthouse";
import { CallPanel } from "./call-panel";
import { Ban, CheckCheck, Smile } from "lucide-react";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export function ChatWindow() {
  const { address } = useAccount();
  const {
    activeConversation,
    messages,
    addMessage,
    loadMessages,
    markConversationRead,
    markMessageRead,
    contacts,
    addContact,
    openConversation,
    me,
    setMe,
    updateContactUnread,
    updateContactLastMessage,
  } = useChatStore();
  const [input, setInput] = useState("");
  const [target, setTarget] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastReadConversationRef = useRef<string | undefined>(undefined);
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (address) setMe(address);
  }, [address, setMe]);

  const conversationId = useMemo(() => {
    if (!me || !activeConversation) return undefined;
    return getConversationId(me, activeConversation);
  }, [me, activeConversation]);
  
  // Check if user is blocked
  const { data: isBlocked } = useReadContract({
    address: registryAddress,
    abi: polygonChatRegistryAbi,
    functionName: "isBlocked",
    args: me && activeConversation ? [me as `0x${string}`, activeConversation as `0x${string}`] : undefined,
    query: {
      enabled: !!me && !!activeConversation,
    },
  });
  
  // Get conversation meta to load messages
  const { data: conversationMeta } = useReadContract({
    address: registryAddress,
    abi: polygonChatRegistryAbi,
    functionName: "getConversationMeta",
    args: conversationId ? [conversationId] : undefined,
    query: {
      enabled: !!conversationId,
    },
  });
  
  // Load messages from contract/Lighthouse when conversation opens (only once)
  const loadedCidsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!conversationId || !conversationMeta) return;
    
    const meta = conversationMeta as any;
    if (!meta.latestCid || meta.latestCid === "") return;
    
    // Only load if we haven't loaded this CID before
    const convIdStr = String(conversationId);
    const cacheKey = `${convIdStr}-${meta.latestCid}`;
    if (loadedCidsRef.current.has(cacheKey)) return;
    
    // Check if we already have messages for this conversation
    const existingMessages = messages[convIdStr] || [];
    if (existingMessages.length > 0) {
      // Don't reload if we already have messages (they might be newer)
      loadedCidsRef.current.add(cacheKey);
      return;
    }
    
    setLoadingMessages(true);
    fetchLighthouseJson<any>(meta.latestCid)
      .then((data) => {
        // If it's a single message, convert to array
        const messagesArray = Array.isArray(data) ? data : [data];
        const loadedMessages = messagesArray.map((msg: any, idx: number) => ({
          id: `${msg.createdAt || Date.now()}-${idx}`,
          from: msg.from,
          to: msg.to,
          body: msg.body || (msg.type === "text" ? msg.body : ""),
          kind: (msg.kind || msg.type || "text") as "text" | "image",
          createdAt: msg.createdAt || Date.now(),
          cid: meta.latestCid,
          read: false,
        }));
        loadMessages(convIdStr, loadedMessages);
        loadedCidsRef.current.add(cacheKey);
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
      })
      .finally(() => {
        setLoadingMessages(false);
      });
  }, [conversationId, conversationMeta, loadMessages, messages]);
  
  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (!conversationId || !me || !activeConversation) return;
    
    const convIdStr = String(conversationId);
    
    // Reset unread count for this contact
    updateContactUnread(activeConversation, false);
    
    // Use a timeout to check messages after they're loaded
    const timeoutId = setTimeout(() => {
      const convMessages = messages[convIdStr] || [];
      
      // Only mark as read if there are unread messages from the other person
      const unreadMessages = convMessages.filter(
        (msg) => msg.from !== me && !msg.read
      );
      
      if (unreadMessages.length > 0) {
        // Mark all messages from the other person as read
        markConversationRead(convIdStr);
        
        // Notify via socket that messages were read
        const socket = getSocket();
        if (socket.connected) {
          console.log("Sending read receipt for conversation:", convIdStr);
          socket.emit("messages-read", {
            conversationId: convIdStr,
            reader: me,
          });
        } else {
          socket.once("connect", () => {
            console.log("Sending read receipt after connection:", convIdStr);
            socket.emit("messages-read", {
              conversationId: convIdStr,
              reader: me,
            });
          });
        }
      }
    }, 500); // Delay to ensure messages are loaded
    
    return () => clearTimeout(timeoutId);
  }, [conversationId, me, activeConversation]); // Only depend on conversationId and me

  useEffect(() => {
    if (!conversationId) return;
    // Convert conversationId to string for Socket.io room names
    const convIdHex = String(conversationId);
    const socket = getSocket();
    
    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }
    
    // Wait for connection before joining
    const handleConnect = () => {
      console.log("Socket connected, joining conversation:", convIdHex);
      socket.emit("join-conversation", convIdHex);
    };
    
    if (socket.connected) {
      socket.emit("join-conversation", convIdHex);
    } else {
      socket.on("connect", handleConnect);
    }

    const handleMessage = (payload: any) => {
      console.log("Message received:", payload);
      if (payload.conversationId !== convIdHex) {
        console.log("Message conversationId mismatch:", payload.conversationId, "expected:", convIdHex);
        return;
      }
      // Only add if message is from the other person (not from me)
      if (payload.from && payload.from.toLowerCase() !== me?.toLowerCase()) {
        console.log("Adding message from other user:", payload.from);
        addMessage(convIdHex, payload);
        
        // Update contact's last message
        if (activeConversation) {
          updateContactLastMessage(
            activeConversation,
            payload.body?.substring(0, 50) || "",
            payload.createdAt || Date.now()
          );
        }
      }
    };

    socket.on("message", handleMessage);
    
    // Handle read receipts - when other person reads our messages
    const handleMessagesRead = (payload: any) => {
      const payloadConvId = String(payload.conversationId || "");
      if (payloadConvId === convIdHex && payload.reader && payload.reader.toLowerCase() !== me?.toLowerCase()) {
        // Other person read the messages - mark our sent messages as read
        console.log("Read receipt received from:", payload.reader, "for conversation:", convIdHex);
        
        // Use a small delay to ensure messages are loaded
        setTimeout(() => {
          const convMessages = messages[convIdHex] || [];
          const myMessages = convMessages.filter((msg) => msg.from === me && !msg.read);
          
          if (myMessages.length > 0) {
            console.log(`Marking ${myMessages.length} messages as read`);
            // Mark all our messages as read
            myMessages.forEach((msg) => {
              markMessageRead(convIdHex, msg.id);
            });
          }
        }, 100);
      }
    };
    socket.on("messages-read", handleMessagesRead);
    
    // Log when joined
    socket.on("joined-conversation", (id: string) => {
      console.log("Joined conversation:", id);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("message", handleMessage);
      socket.off("messages-read", handleMessagesRead);
      socket.off("joined-conversation");
      socket.emit("leave-conversation", convIdHex);
    };
  }, [conversationId, me, addMessage]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!me || !activeConversation || !conversationId || !input.trim()) return;

    const convIdHex = conversationId;
    const now = Date.now();
    const body = input.trim();
    setInput("");

    const payload = {
      type: "text",
      body,
      from: me,
      to: activeConversation,
      createdAt: now,
    };

    try {
      // Upload message to Lighthouse
      const cid = await uploadJsonToLighthouse(payload);
      const hash = hashMessageBody(body, now);

      // Store message pointer on-chain
      await writeContractAsync({
        address: registryAddress,
        abi: polygonChatRegistryAbi,
        functionName: "upsertMessagePointer",
        args: [activeConversation as `0x${string}`, cid, hash],
      });

      const msg = {
        id: `${now}`,
        from: me,
        to: activeConversation,
        body,
        kind: "text" as const,
        createdAt: now,
        cid,
        read: false, // Will be marked as read when recipient views
      };
      
      // Add to local state first (optimistic update)
      addMessage(convIdHex, msg);
      
      // Broadcast via socket
      const socket = getSocket();
      // Ensure conversationId is a string for Socket.io
      const convIdStr = String(convIdHex);
      const messagePayload = { 
        conversationId: convIdStr, 
        ...msg 
      };
      console.log("Sending message via socket:", messagePayload);
      
      if (!socket.connected) {
        socket.connect();
        socket.once("connect", () => {
          socket.emit("message", messagePayload);
        });
      } else {
        socket.emit("message", messagePayload);
      }
    } catch (err) {
      console.error("Message send error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // Restore input on error
      setInput(body);
      
      if (errorMsg.includes("ProfileMissing")) {
        alert("The recipient doesn't have a profile yet. They need to create one first.");
      } else if (errorMsg.includes("BlockedParticipant")) {
        alert("You cannot message this user. One of you has blocked the other.");
      } else if (errorMsg.includes("rejected") || errorMsg.includes("denied")) {
        alert("Transaction was rejected. Please try again.");
      } else {
        alert(`Failed to send message: ${errorMsg}\n\nPlease check:\n- Your wallet is connected\n- You have Amoy MATIC for gas\n- The recipient has a profile`);
      }
    }
  }

  async function handleOpenNewChat(e: FormEvent) {
    e.preventDefault();
    if (!target.trim() || !me) return;
    
    const cleaned = target.trim().toLowerCase();
    const addrLike = cleaned.startsWith("0x") && cleaned.length > 20;
    
    try {
      const { readContract } = await import("wagmi/actions");
      const { createPublicClient, http } = await import("viem");
      const { polygonAmoy } = await import("../lib/chains");
      
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(),
      });
      
      let address: `0x${string}`;
      
      if (addrLike) {
        // It's an address
        address = cleaned.toLowerCase() as `0x${string}`;
      } else {
        // It's a username - resolve to address
        const ownerAddress = await publicClient.readContract({
          address: registryAddress,
          abi: polygonChatRegistryAbi,
          functionName: "ownerOfUsername",
          args: [cleaned],
        }) as `0x${string}`;
        
        if (!ownerAddress || ownerAddress === "0x0000000000000000000000000000000000000000") {
          alert(`Username "${cleaned}" not found. Make sure the user has created a profile.`);
          return;
        }
        
        address = ownerAddress.toLowerCase() as `0x${string}`;
      }
      
      // Fetch profile for this user
      const profile = await publicClient.readContract({
        address: registryAddress,
        abi: polygonChatRegistryAbi,
        functionName: "getProfile",
        args: [address],
      }) as any;
      
      if (profile.exists) {
        addContact({
          address,
          username: profile.username,
          displayName: profile.displayName,
          bio: profile.bio,
          avatarCid: profile.avatarCid,
        });
        // Auto-open the conversation
        openConversation(address);
      } else {
        alert(`User does not have a profile yet.`);
        return;
      }
      
      setTarget("");
    } catch (err) {
      console.error("Error opening chat:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to open chat: ${errorMsg}`);
    }
  }

  const onEmojiClick = (emojiData: any) => {
    setInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  if (!me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-400">
        <p className="text-sm">Connect your wallet to start chatting.</p>
      </div>
    );
  }

  const convMessages = conversationId ? messages[conversationId] || [] : [];
  const activeContact =
    contacts.find((c) => c.address === activeConversation) ?? null;

  return (
    <section className="flex flex-1 flex-col bg-gradient-to-br from-zinc-950 via-zinc-950 to-[#05010f]">
      <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
        <div className="flex flex-col flex-1">
          <span className="text-xs text-zinc-500">Conversation</span>
          <span className="text-sm font-medium text-zinc-100">
            {activeContact
              ? activeContact.displayName ||
                activeContact.username ||
                activeContact.address.slice(0, 6) +
                  "..." +
                  activeContact.address.slice(-4)
              : "No chat selected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeConversation && (
            <>
              <button
                onClick={async () => {
                  if (!me || !activeConversation) return;
                  try {
                    await writeContractAsync({
                      address: registryAddress,
                      abi: polygonChatRegistryAbi,
                      functionName: "setBlockStatus",
                      args: [activeConversation as `0x${string}`, !isBlocked],
                    });
                    alert(isBlocked ? "User unblocked" : "User blocked");
                  } catch (err) {
                    console.error("Block error:", err);
                    alert("Failed to update block status");
                  }
                }}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-1"
                title={isBlocked ? "Unblock user" : "Block user"}
              >
                <Ban className="h-3 w-3" />
                {isBlocked ? "Unblock" : "Block"}
              </button>
              {conversationId && (
                <CallPanel
                  conversationId={String(conversationId)}
                  myAddress={me}
                />
              )}
            </>
          )}
        </div>
      </header>

      {!activeConversation && (
        <div className="border-b border-zinc-900 px-5 py-3">
          <form
            onSubmit={handleOpenNewChat}
            className="flex items-center gap-2"
          >
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="New chat: enter wallet address (0x...) or username"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
            >
              Start
            </button>
          </form>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loadingMessages && (
          <div className="mt-16 text-center text-sm text-zinc-500">
            Loading messages...
          </div>
        )}
        {!loadingMessages && convMessages.length === 0 && (
          <div className="mt-16 text-center text-sm text-zinc-500">
            {activeConversation
              ? isBlocked
                ? "You have blocked this user. Unblock to send messages."
                : "No messages yet. Say hi 👋"
              : "Select a chat on the left or start a new one."}
          </div>
        )}
        {convMessages.map((m) => {
          const mine = m.from === me;
          return (
            <div
              key={m.id}
              className={`flex ${
                mine ? "justify-end" : "justify-start"
              } text-sm`}
            >
              <div
                className={`max-w-xs rounded-2xl px-3 py-2 ${
                  mine
                    ? "bg-violet-600 text-zinc-50 rounded-br-sm"
                    : "bg-zinc-900 text-zinc-100 rounded-bl-sm"
                }`}
              >
                <div>{m.body}</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {mine && (
                    <span title={m.read ? "Read" : "Sent"}>
                      <CheckCheck
                        className={`h-3 w-3 ${
                          m.read ? "text-blue-400" : "text-zinc-500"
                        }`}
                      />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <footer className="border-t border-zinc-800 px-5 py-3 relative">
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-5 z-50">
            <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 rounded-2xl bg-zinc-900/80 px-3 py-2"
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!activeConversation || !!isBlocked}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeConversation
                ? isBlocked
                  ? "You have blocked this user..."
                  : "Type a message..."
                : "Pick a chat first..."
            }
            disabled={!activeConversation || !!isBlocked}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <button
            type="submit"
            disabled={!activeConversation || !input.trim() || !!isBlocked}
            className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            Send
          </button>
        </form>
      </footer>
    </section>
  );
}