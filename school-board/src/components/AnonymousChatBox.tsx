"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFreeBoard } from "@/app/community/free/layout";

type ChatMessage = {
  id: string;
  content: string;
  user_id: string;
  anon_id: string;
  created_at: string;
};

const EMOJIS = ["😀", "👍", "❤️", "🔥", "🚀"];

export default function AnonymousChatBox() {
  const { me } = useFreeBoard();
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    async function loadInitial() {
      const res = await fetch("/api/chat?limit=50");
      const json = await res.json();
      if (json.data) {
        setMessages(json.data.reverse());
      }
      setLoading(false);
      setTimeout(scrollToBottom, 50);
    }
    loadInitial();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel("chat_public")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function onSend(text: string) {
    if (!me.userId) return alert("로그인이 필요합니다.");
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("전송 실패");
      setInput("");
    } catch (err) {
      alert("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass flex flex-col overflow-hidden rounded-[2rem] h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="text-lg">💬</span> 실시간 익명 대화
        </h3>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
          Live
        </span>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-600 italic text-xs">
            아직 대화가 없습니다.<br />먼저 인사를 건네보세요!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === me.userId;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <span className="mb-1 text-[10px] font-bold text-slate-500">{m.anon_id}</span>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm font-medium ${isMe
                      ? "bg-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-500/20"
                      : "bg-white/10 text-slate-200 rounded-tl-none border border-white/5"
                    }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Input */}
      <div className="border-t border-white/5 bg-white/[0.02] p-4">
        <div className="mb-3 flex gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => onSend(e)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-lg hover:bg-white/10 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend(input);
          }}
          className="relative"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={me.userId ? "메시지를 입력하세요..." : "로그인 후 대화가 가능합니다."}
            disabled={!me.userId || sending}
            className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 pr-16 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
          />
          <button
            type="submit"
            disabled={!me.userId || sending || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 disabled:opacity-50 transition-all"
          >
            {sending ? "..." : "전송"}
          </button>
        </form>
      </div>
    </div>
  );
}
