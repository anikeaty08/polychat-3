import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

interface ChatState {
  activeConversation: string | null;
  conversations: any[];
  messages: Record<string, any[]>;
  setActiveConversation: (id: string | null) => void;
  setConversations: (conversations: any[]) => void;
  addMessage: (conversationId: string, message: any) => void;
  updateMessage: (conversationId: string, messageId: string, updates: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'polychat-auth',
    }
  )
);

export const useChatStore = create<ChatState>((set) => ({
  activeConversation: null,
  conversations: [],
  messages: {},
  setActiveConversation: (id) => set({ activeConversation: id }),
  setConversations: (conversations) => set({ conversations }),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),
  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),
}));



