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
  author_username?: string | null;
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
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
          setTimeout(scrollToBottom, 50);

          if (me.role === "admin") {
            const res = await fetch("/api/chat?limit=1", { cache: "no-store", credentials: "include" }).catch(() => null);
            const json = await res?.json().catch(() => ({}));
            const enriched = Array.isArray(json?.data) ? json.data[0] : null;
            if (enriched?.id === newMessage.id) {
              setMessages((prev) => prev.map((m) => (m.id === enriched.id ? enriched : m)));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const deleted = payload.old as Partial<ChatMessage>;
          if (deleted?.id) setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
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

  async function onDeleteMessage(id: string) {
    if (me.role !== "admin") return;
    if (!confirm("이 채팅 메시지를 삭제할까요?")) return;
    const res = await fetch(`/api/chat?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json?.error ?? "삭제 실패");
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="glass flex flex-col overflow-hidden h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span className="text-lg">💬</span> 실시간 익명 대화
        </h3>
        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest animate-pulse" style={{ background: 'rgba(8,123,99,0.10)', color: 'var(--accent-mint)', border: '1px solid rgba(8,123,99,0.18)' }}>
          Live
        </span>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin border-2 border-sky-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center italic text-xs" style={{ color: 'var(--text-secondary)' }}>
            아직 대화가 없습니다.<br />먼저 인사를 건네보세요!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === me.userId;
            const label = me.role === "admin"
              ? `${m.author_username || "아이디 없음"} · ${m.user_id}`
              : m.anon_id;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <span className="mb-0.5 max-w-full break-all text-[10px] font-bold leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <div
                  className="max-w-[85%] px-3 py-1.5 text-[13px] font-medium leading-snug"
                  style={{
                    background: isMe ? 'var(--brand)' : 'var(--bg-elevated)',
                    color: isMe ? '#fff' : 'var(--text-primary)',
                    border: isMe ? '1px solid var(--brand)' : '1px solid var(--border-subtle)'
                  }}
                >
                  {m.content}
                </div>
                {me.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(m.id)}
                    className="mt-0.5 text-[10px] font-black text-rose-500 hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <div className="mb-2 flex gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => onSend(e)}
              className="flex h-7 w-7 items-center justify-center text-base transition-colors"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
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
            className="w-full border px-3 py-2 pr-14 text-sm focus:outline-none transition-all"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            disabled={!me.userId || sending || !input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: 'var(--brand)' }}
          >
            {sending ? "..." : "전송"}
          </button>
        </form>
      </div>
    </div>
  );
}
