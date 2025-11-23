import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  const { messages, leadId } = await req.json();

  const systemPrompt = `You are a ruthless, high-ticket closer for a premium coaching/consulting business.
Price is $15k–$50k+. NEVER mention price until they ask.
Qualify HARD: budget, timeline, authority, pain.
If they are qualified and excited → immediately collect name, email, phone and book the call + charge $499 deposit (non-refundable).
Be direct, cocky, and dominant. No fluff.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    tools: [
      {
        type: "function",
        function: {
          name: "book_call_and_charge",
          description: "Book the call and charge $499 deposit",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              company: { type: "string" },
              revenue: { type: "string" }
            },
            required: ["name", "email", "phone"]
          }
        }
      }
    ]
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];
  if (toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    // Charge via Lemon Squeezy Checkout Session
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_options: { redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/thanks` },
            checkout_data: {
              email: args.email,
              custom: { lead_id: leadId, name: args.name, phone: args.phone }
            }
          },
          relationships: {
            store: { data: { type: "stores", id: process.env.LEMON_SQUEEZY_STORE_ID } },
            variant: { data: { type: "variants", id: "YOUR_499_VARIANT_ID" } }
          }
        }
      })
    });
    const checkout = await res.json();
    return Response.json({ redirect: checkout.data.links.checkout });
  }

  return Response.json({ reply: completion.choices[0].message.content });
}

