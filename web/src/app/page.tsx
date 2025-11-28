"use client";

import { WalletConnectButton } from "../components/wallet-connect-button";
import { ChatSidebar } from "../components/chat-sidebar";
import { ChatWindow } from "../components/chat-window";
import { ProfileSheet } from "../components/profile-sheet";
import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { polygonChatRegistryAbi, registryAddress } from "../lib/contracts";
import { useChatStore } from "../state/chat-store";
import { getConversationId } from "../lib/conversation";
import { getSocket } from "../lib/socket";

export default function Home() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { setProfile, contacts, addContact, me, addMessage, updateContactUnread, updateContactLastMessage } = useChatStore();
  
  // Debug: Log when profileOpen changes
  useEffect(() => {
    console.log("Profile modal state changed:", profileOpen);
  }, [profileOpen]);

  // Check if user has a profile
  const { data: userProfile } = useReadContract({
    address: registryAddress,
    abi: polygonChatRegistryAbi,
    functionName: "getProfile",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Load profile and previous contacts when connected
  useEffect(() => {
    if (!address || !isConnected) return;
    
    if (userProfile && (userProfile as any).exists) {
      const profile = userProfile as any;
      setProfile({
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarCid: profile.avatarCid,
      });
      // Close profile modal if it was open
      if (profileOpen) {
        setProfileOpen(false);
      }
      
      // Load previous contacts from events (MessagePointerUpdated events)
      // This will find all conversations the user has participated in
      loadPreviousContacts(address);
    } else if (userProfile && !(userProfile as any).exists && !profileOpen) {
      // User connected but no profile - show profile creation (only if not already open)
      setProfileOpen(true);
    }
  }, [userProfile, address, isConnected, setProfile, profileOpen, addContact]);
  
  // Global socket listener for incoming messages (from any conversation)
  useEffect(() => {
    if (!me || !address) return;
    
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    
    const handleIncomingMessage = async (payload: any) => {
      if (!payload.from || payload.from.toLowerCase() === me.toLowerCase()) return;
      
      const senderAddress = payload.from.toLowerCase();
      const conversationId = payload.conversationId;
      
      // Check if contact exists, if not, load their profile and add them
      const existingContact = contacts.find(
        (c) => c.address.toLowerCase() === senderAddress
      );
      
      if (!existingContact) {
        // Load profile for the sender
        try {
          const { createPublicClient, http } = await import("viem");
          const { polygonAmoy } = await import("../lib/chains");
          
          const publicClient = createPublicClient({
            chain: polygonAmoy,
            transport: http(),
          });
          
          const profile = await publicClient.readContract({
            address: registryAddress,
            abi: polygonChatRegistryAbi,
            functionName: "getProfile",
            args: [senderAddress as `0x${string}`],
          }) as any;
          
          if (profile.exists) {
            addContact({
              address: senderAddress,
              username: profile.username,
              displayName: profile.displayName,
              bio: profile.bio,
              avatarCid: profile.avatarCid,
              unreadCount: 1,
              lastMessage: payload.body?.substring(0, 50) || "",
              lastMessageTime: payload.createdAt || Date.now(),
            });
          } else {
            addContact({
              address: senderAddress,
              unreadCount: 1,
              lastMessage: payload.body?.substring(0, 50) || "",
              lastMessageTime: payload.createdAt || Date.now(),
            });
          }
        } catch (err) {
          console.error("Failed to load sender profile:", err);
          // Add with just address
          addContact({
            address: senderAddress,
            unreadCount: 1,
            lastMessage: payload.body?.substring(0, 50) || "",
            lastMessageTime: payload.createdAt || Date.now(),
          });
        }
      } else {
        // Update unread count and last message
        updateContactUnread(senderAddress, true);
        updateContactLastMessage(
          senderAddress,
          payload.body?.substring(0, 50) || "",
          payload.createdAt || Date.now()
        );
      }
      
      // Add message to store
      if (conversationId) {
        addMessage(conversationId, {
          id: payload.id || `${Date.now()}`,
          from: payload.from,
          to: payload.to || me,
          body: payload.body || "",
          kind: payload.kind || "text",
          createdAt: payload.createdAt || Date.now(),
          cid: payload.cid,
          read: false,
        });
      }
    };
    
    // Listen for incoming call offers
    const handleIncomingCall = async (payload: any) => {
      if (!payload.from || payload.from.toLowerCase() === me.toLowerCase()) return;
      
      const senderAddress = payload.from.toLowerCase();
      
      // Check if contact exists, if not, add them
      const existingContact = contacts.find(
        (c) => c.address.toLowerCase() === senderAddress
      );
      
      if (!existingContact) {
        // Load profile for the caller
        try {
          const { createPublicClient, http } = await import("viem");
          const { polygonAmoy } = await import("../lib/chains");
          
          const publicClient = createPublicClient({
            chain: polygonAmoy,
            transport: http(),
          });
          
          const profile = await publicClient.readContract({
            address: registryAddress,
            abi: polygonChatRegistryAbi,
            functionName: "getProfile",
            args: [senderAddress as `0x${string}`],
          }) as any;
          
          if (profile.exists) {
            addContact({
              address: senderAddress,
              username: profile.username,
              displayName: profile.displayName,
              bio: profile.bio,
              avatarCid: profile.avatarCid,
            });
          } else {
            addContact({ address: senderAddress });
          }
        } catch (err) {
          console.error("Failed to load caller profile:", err);
          addContact({ address: senderAddress });
        }
      }
    };
    
    socket.on("message", handleIncomingMessage);
    socket.on("call-offer", handleIncomingCall);
    
    return () => {
      socket.off("message", handleIncomingMessage);
      socket.off("call-offer", handleIncomingCall);
    };
  }, [me, address, contacts, addContact, addMessage, updateContactUnread, updateContactLastMessage]);
  
  // Load previous contacts from contract events
  async function loadPreviousContacts(myAddress: string) {
    try {
      const { createPublicClient, http } = await import("viem");
      const { polygonAmoy } = await import("../lib/chains");
      
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(),
      });
      
      // Get events from recent blocks (Alchemy free tier limits to 10 blocks at a time)
      // We'll check the last 100 blocks in batches of 10
      const currentBlock = await publicClient.getBlockNumber();
      const maxBlocksToCheck = 100; // Check last 100 blocks
      const blockRange = 10; // Alchemy free tier limit
      const fetchedEvents: any[] = [];
      const fetchedRecipientEvents: any[] = [];
      
      // Fetch events in batches of 10 blocks
      for (let i = 0; i < maxBlocksToCheck; i += blockRange) {
        const toBlock = currentBlock - BigInt(i);
        const fromBlock = toBlock - BigInt(blockRange - 1);
        
        // Skip if fromBlock would be negative
        if (fromBlock < BigInt(0)) break;
        
        try {
          // Get MessagePointerUpdated events where user is sender
          const events = await publicClient.getLogs({
            address: registryAddress,
            event: {
              type: "event",
              name: "MessagePointerUpdated",
              inputs: [
                { name: "conversationId", type: "bytes32", indexed: true },
                { name: "sender", type: "address", indexed: true },
                { name: "recipient", type: "address", indexed: true },
                { name: "cid", type: "string", indexed: false },
                { name: "contentHash", type: "bytes32", indexed: false },
                { name: "messageCount", type: "uint256", indexed: false },
              ],
            },
            args: {
              sender: myAddress as `0x${string}`,
            },
            fromBlock,
            toBlock,
          });
          
          // Get events where user is recipient
          const recipientEvents = await publicClient.getLogs({
            address: registryAddress,
            event: {
              type: "event",
              name: "MessagePointerUpdated",
              inputs: [
                { name: "conversationId", type: "bytes32", indexed: true },
                { name: "sender", type: "address", indexed: true },
                { name: "recipient", type: "address", indexed: true },
                { name: "cid", type: "string", indexed: false },
                { name: "contentHash", type: "bytes32", indexed: false },
                { name: "messageCount", type: "uint256", indexed: false },
              ],
            },
            args: {
              recipient: myAddress as `0x${string}`,
            },
            fromBlock,
            toBlock,
          });
          
          fetchedEvents.push(...events);
          fetchedRecipientEvents.push(...recipientEvents);
        } catch (err) {
          console.error(`Error fetching events for blocks ${fromBlock}-${toBlock}:`, err);
          // Continue with next batch
        }
      }
      
      // Combine and deduplicate contacts
      const allEvents = [...fetchedEvents, ...fetchedRecipientEvents];
      const contactAddresses = new Set<string>();
      
      for (const event of allEvents) {
        const args = event.args as any;
        const otherAddress = 
          args.sender?.toLowerCase() === myAddress.toLowerCase()
            ? args.recipient?.toLowerCase()
            : args.sender?.toLowerCase();
        
        if (otherAddress && otherAddress !== myAddress.toLowerCase()) {
          contactAddresses.add(otherAddress);
        }
      }
      
      // Load profiles for all contacts
      for (const contactAddr of contactAddresses) {
        // Skip if already in contacts
        if (contacts.find(c => c.address.toLowerCase() === contactAddr)) continue;
        
        try {
          const profile = await publicClient.readContract({
            address: registryAddress,
            abi: polygonChatRegistryAbi,
            functionName: "getProfile",
            args: [contactAddr as `0x${string}`],
          }) as any;
          
          if (profile.exists) {
            addContact({
              address: contactAddr,
              username: profile.username,
              displayName: profile.displayName,
              bio: profile.bio,
              avatarCid: profile.avatarCid,
            });
          } else {
            // Add with just address if no profile
            addContact({ address: contactAddr });
          }
        } catch (err) {
          console.error(`Failed to load profile for ${contactAddr}:`, err);
          // Add with just address
          addContact({ address: contactAddr });
        }
      }
    } catch (err) {
      console.error("Failed to load previous contacts:", err);
    }
  }

  // Show wallet connect screen if not connected
  if (!isConnected || !address) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#020617] to-black px-4 py-6">
        <div className="w-full max-w-md rounded-[32px] border border-zinc-800/80 bg-zinc-950/90 p-8 shadow-[0_0_80px_rgba(139,92,246,0.25)] backdrop-blur-xl text-center">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Polygon Chat</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Decentralized messaging on blockchain
          </p>
          <WalletConnectButton />
          <p className="text-xs text-zinc-500 mt-6">
            Connect your wallet to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#020617] to-black px-4 py-6">
      <main className="flex h-[640px] w-full max-w-5xl overflow-hidden rounded-[32px] border border-zinc-800/80 bg-zinc-950/90 shadow-[0_0_80px_rgba(139,92,246,0.25)] backdrop-blur-xl">
        <ChatSidebar onSelectProfile={() => setProfileOpen(true)} />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">
                Polygon Chat
              </h1>
              <p className="text-[11px] text-zinc-500">
                Decentralized messaging on blockchain
              </p>
            </div>
            <WalletConnectButton />
          </div>
          <ChatWindow />
        </div>
      </main>
      <ProfileSheet 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)}
        required={!userProfile || !(userProfile as any).exists}
      />
    </div>
  );
}
