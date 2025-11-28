import { create } from "zustand";

export type MessageKind = "text" | "image";

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  kind: MessageKind;
  createdAt: number;
  cid?: string;
  read?: boolean; // Read receipt
}

export interface Contact {
  address: string;
  username?: string;
  displayName?: string;
  avatarCid?: string;
  bio?: string;
  unreadCount?: number; // Unread message count
  lastMessage?: string; // Last message preview
  lastMessageTime?: number; // Last message timestamp
}

interface ChatState {
  me?: string;
  profile?: {
    username: string;
    displayName: string;
    bio: string;
    avatarCid: string;
  };
  contacts: Contact[];
  activeConversation?: string;
  messages: Record<string, ChatMessage[]>;
  setMe: (addr: string) => void;
  setProfile: (profile: ChatState["profile"]) => void;
  addContact: (contact: Contact) => void;
  openConversation: (peer: string) => void;
  addMessage: (conversationId: string, msg: ChatMessage) => void;
  loadMessages: (conversationId: string, messages: ChatMessage[]) => void;
  markMessageRead: (conversationId: string, messageId: string) => void;
  markConversationRead: (conversationId: string) => void;
  updateContactUnread: (address: string, increment: boolean) => void;
  updateContactLastMessage: (address: string, message: string, timestamp: number) => void;
}

// Load contacts from localStorage on init
const loadContactsFromStorage = (): Contact[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("polygon-chat-contacts");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save contacts to localStorage
const saveContactsToStorage = (contacts: Contact[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("polygon-chat-contacts", JSON.stringify(contacts));
  } catch {
    // Ignore storage errors
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: loadContactsFromStorage(),
  messages: {},
  setMe: (addr) => set({ me: addr }),
  setProfile: (profile) => set({ profile }),
  addContact: (contact) =>
    set((state) => {
      if (state.contacts.find((c) => c.address === contact.address)) {
        return state;
      }
      const newContacts = [...state.contacts, contact];
      saveContactsToStorage(newContacts);
      return { contacts: newContacts };
    }),
  openConversation: (peer) => set({ activeConversation: peer }),
  addMessage: (conversationId, msg) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      // Avoid duplicates
      if (existing.find(m => m.id === msg.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, msg],
        },
      };
    }),
  loadMessages: (conversationId, messages) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      // Merge with existing messages, avoiding duplicates
      const existingIds = new Set(existing.map(m => m.id));
      const newMessages = messages.filter(m => !existingIds.has(m.id));
      const merged = [...existing, ...newMessages].sort((a, b) => a.createdAt - b.createdAt);
      
      return {
        messages: {
          ...state.messages,
          [conversationId]: merged,
        },
      };
    }),
  markMessageRead: (conversationId, messageId) =>
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: convMessages.map((msg) =>
            msg.id === messageId ? { ...msg, read: true } : msg
          ),
        },
      };
    }),
  markConversationRead: (conversationId) =>
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      // Only update if there are actually unread messages to avoid unnecessary updates
      const hasUnread = convMessages.some((msg) => !msg.read);
      if (!hasUnread) return state; // No changes needed
      
      // Mark messages as read
      const updatedMessages = convMessages.map((msg) => ({ ...msg, read: true }));
      
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    }),
  updateContactUnread: (address, increment) =>
    set((state) => {
      const updatedContacts = state.contacts.map((contact) => {
        if (contact.address.toLowerCase() === address.toLowerCase()) {
          if (increment) {
            return {
              ...contact,
              unreadCount: (contact.unreadCount || 0) + 1,
            };
          } else {
            // Reset unread count
            return {
              ...contact,
              unreadCount: 0,
            };
          }
        }
        return contact;
      });
      saveContactsToStorage(updatedContacts);
      return { contacts: updatedContacts };
    }),
  updateContactLastMessage: (address, message, timestamp) =>
    set((state) => {
      const updatedContacts = state.contacts.map((contact) => {
        if (contact.address.toLowerCase() === address.toLowerCase()) {
          return {
            ...contact,
            lastMessage: message,
            lastMessageTime: timestamp,
          };
        }
        return contact;
      });
      saveContactsToStorage(updatedContacts);
      return { contacts: updatedContacts };
    }),
}));



