"use client";

import { useChatStore } from "../state/chat-store";
import { User2, MessageSquare } from "lucide-react";

interface Props {
  onSelectProfile: () => void;
}

export function ChatSidebar({ onSelectProfile }: Props) {
  const { contacts, activeConversation, openConversation, profile } =
    useChatStore();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-800/80 bg-gradient-to-b from-zinc-950/80 via-zinc-950/60 to-zinc-950/40 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/80 bg-zinc-950/60 relative">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Logged in as</span>
          <span className="text-sm font-semibold text-zinc-100 mt-0.5">
            {profile?.displayName || profile?.username || "New user"}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Edit button clicked - opening profile modal");
            onSelectProfile();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-700/50 bg-violet-600/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-600/20 hover:border-violet-600/60 active:bg-violet-600/30 cursor-pointer relative z-50 transition-all"
          type="button"
          style={{ pointerEvents: 'auto', zIndex: 50 }}
        >
          <User2 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <div className="px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-2 bg-zinc-950/40">
        <MessageSquare className="h-3.5 w-3.5" />
        Recent Chats
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {contacts.length === 0 && (
          <div className="px-3 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/50 mb-3">
              <MessageSquare className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              No chats yet. Start a conversation by entering an address or username.
            </p>
          </div>
        )}
        {contacts
          .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
          .map((c) => {
            const active = activeConversation === c.address;
            return (
              <button
                key={c.address}
                onClick={() => openConversation(c.address)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all relative ${
                  active
                    ? "bg-gradient-to-r from-violet-600/25 to-violet-600/15 border border-violet-600/30 text-violet-50 shadow-lg shadow-violet-900/20"
                    : "text-zinc-200 hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/50"
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                  active 
                    ? "bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 ring-2 ring-violet-500/50" 
                    : "bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 group-hover:from-violet-500 group-hover:to-fuchsia-500"
                }`}>
                  {c.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold truncate ${active ? "text-violet-50" : "text-zinc-100"}`}>
                      {c.displayName || c.username || c.address.slice(0, 6) + "..." + c.address.slice(-4)}
                    </span>
                    {c.unreadCount && c.unreadCount > 0 && !active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white flex-shrink-0 animate-pulse ring-2 ring-violet-500/30">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.lastMessage ? (
                    <span className={`text-[11px] line-clamp-1 truncate mt-0.5 ${active ? "text-violet-200/80" : "text-zinc-500"}`}>
                      {c.lastMessage}
                    </span>
                  ) : c.bio ? (
                    <span className={`text-[11px] line-clamp-1 truncate mt-0.5 ${active ? "text-violet-200/70" : "text-zinc-500"}`}>
                      {c.bio}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
}