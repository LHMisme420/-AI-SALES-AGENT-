import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    // TODO: Integrate Lemon Squeezy here (from earlier code)
    // For now, simulate redirect to Calendly
    return Response.json({ redirect: `${process.env.CALENDLY_LINK}?name=${args.name}&email=${args.email}` });
  }

  return Response.json({ reply: completion.choices[0].message.content });
}
