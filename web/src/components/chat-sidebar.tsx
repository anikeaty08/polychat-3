"use client";

import { useChatStore } from "../state/chat-store";
import { User2 } from "lucide-react";

interface Props {
  onSelectProfile: () => void;
}

export function ChatSidebar({ onSelectProfile }: Props) {
  const { contacts, activeConversation, openConversation, profile } =
    useChatStore();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-950/60">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 relative">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500">Logged in as</span>
          <span className="text-sm font-medium text-zinc-100">
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
          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-900/80 active:bg-zinc-800 cursor-pointer relative z-50"
          type="button"
          style={{ pointerEvents: 'auto', zIndex: 50 }}
        >
          <User2 className="h-3 w-3" />
          Edit
        </button>
      </div>

      <div className="px-4 py-2 text-xs uppercase tracking-wide text-zinc-500">
        Chats
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {contacts.length === 0 && (
          <div className="px-2 py-4 text-xs text-zinc-500">
            Start a chat by entering an address or username in the main panel.
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
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition relative ${
                  active
                    ? "bg-violet-600/20 text-violet-50"
                    : "text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white">
                  {c.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {c.displayName || c.username || c.address.slice(0, 6) + "..." + c.address.slice(-4)}
                    </span>
                    {c.unreadCount && c.unreadCount > 0 && !active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-semibold text-white flex-shrink-0">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.lastMessage ? (
                    <span className="text-[11px] text-zinc-500 line-clamp-1 truncate">
                      {c.lastMessage}
                    </span>
                  ) : c.bio ? (
                    <span className="text-[11px] text-zinc-500 line-clamp-1 truncate">
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


