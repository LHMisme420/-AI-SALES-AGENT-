"use client";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, leadId: crypto.randomUUID() })
      });

      if (!res.ok) throw new Error('API failed');

      const data = await res.json();
      setLoading(false);

      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        setMessages(ms => [...ms, { role: "assistant", content: data.reply }]);
      }
    } catch (error) {
      setLoading(false);
      setMessages(ms => [...ms, { role: "assistant", content: "Glitch hit—check OpenAI key & reload. We rebuild unbreakable." }]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-black mb-8 text-center">Most people stay broke. You won’t.</h1>
        
        <div className="bg-zinc-900 rounded-2xl p-6 min-h-96 border border-zinc-800 mb-4">
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
          {loading && <p className="text-zinc-500 text-center">AI loading the blade...</p>}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-purple-600"
            placeholder="Your move..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <button onClick={send} disabled={loading} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-8 rounded-xl font-bold">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { @apply bg-black text-white; }
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { messages, leadId } = await req.json();

  const systemPrompt = `You are a ruthless high-ticket closer for premium coaching/consulting. 
Deals: $15k–$50k+. NEVER mention price until qualified. 
Qualify HARD: $100k+ annual budget, decision-maker authority, acute pain (revenue stall, team chaos, etc.), 90-day timeline. 
If qualified + excited: Immediately collect name, email, phone → trigger $499 non-refundable deposit + Calendly book. 
Be direct, cocky, dominant. No fluff, no "maybe" — push or disqualify.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      tools: [{
        type: 'function',
        function: {
          name: 'book_call_and_charge',
          description: 'Book the call + charge $499 deposit',
          parameters: {
            type: 'object',
            properties: { 
              name: { type: 'string' }, 
              email: { type: 'string' }, 
              phone: { type: 'string' },
              company: { type: 'string' },
              revenue: { type: 'string' }
            },
            required: ['name', 'email', 'phone']
          }
        }
      }]
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    if (toolCall?.function.name === 'book_call_and_charge') {
      const args = JSON.parse(toolCall.function.arguments);
      const checkoutRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              product_options: { 
                redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/thanks?calendly=${process.env.CALENDLY_LINK}&name=${encodeURIComponent(args.name)}&email=${encodeURIComponent(args.email)}` 
              },
              checkout_data: { 
                email: args.email,
                custom: { lead_id: leadId, name: args.name, phone: args.phone, company: args.company, revenue: args.revenue }
              }
            },
            relationships: {
              store: { data: { type: 'stores', id: process.env.LEMON_SQUEEZY_STORE_ID } },
              variant: { data: { type: 'variants', id: 'YOUR_VARIANT_ID' } }  // SWAP WITH REAL $499 VARIANT ID
            }
          }
        })
      });
      const checkout = await checkoutRes.json();
      if (checkout.data?.attributes?.url) {
        return NextResponse.json({ redirect: checkout.data.attributes.url });
      } else {
        return NextResponse.json({ reply: 'Charge glitch—DM details to lock in.' }, { status: 500 });
      }
    }

    return NextResponse.json({ reply: completion.choices[0].message.content || 'What\'s choking your empire?' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: 'Blackout—DM [your-email] for manual close.' }, { status: 500 });
  }
}
