"use client";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages([...messages, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg], leadId: crypto.randomUUID() })
    });

    const data = await res.json();
    setLoading(false);

    if (data.redirect) {
      window.location.href = data.redirect;
    } else {
      setMessages(ms => [...ms, { role: "assistant", content: data.reply }]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-black mb-8 text-center">Most people stay broke. You won’t.</h1>
        
        <div className="bg-zinc-900 rounded-2xl p-6 min-h-96 border border-zinc-800">
          {messages.length === 0 && (
            <p className="text-zinc-500 text-center pt-20">Tell me your biggest business problem right now.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`mb-4 ${m.role === "user" ? "text-right" : ""}`}>
              <span className={`inline-block p-4 rounded-2xl max-w-xl ${m.role === "user" ? "bg-purple-600" : "bg-zinc-800"}`}>
                {m.content}
              </span>
            </div>
          ))}
          {loading && <p className="text-zinc-500">typing...</p>}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-purple-600"
            placeholder="Type here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <button onClick={send} className="bg-purple-600 hover:bg-purple-500 px-8 rounded-xl font-bold">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
