import { rateLimit } from "@/lib/limits";
import { research, answerQuestion } from "@/lib/research";
import { apiError, cached } from "@/lib/http";
export async function GET(request: Request) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;
  try {
    const p = new URL(request.url).searchParams;
    return Response.json(
      await research(p.get("ticker") || "INFY", p.get("refresh") === "1"),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  const limited = rateLimit(request, 10);
  if (limited) return limited;
  try {
    if (Number(request.headers.get("content-length")) > 5000)
      throw new Error("Request too large");
    const raw = await request.text();
    if (raw.length > 5000) throw new Error("Request too large");
    const body = JSON.parse(raw);
    if (
      typeof body.question !== "string" ||
      body.question.trim().length < 3 ||
      body.question.length > 800
    )
      throw new Error("Question must be 3–800 characters");
    const result = await cached(
      `question:${body.ticker}:${body.useLive === true}:${body.question}`,
      3600e3,
      async () =>
        answerQuestion(
          await research(body.ticker, body.useLive === true),
          body.question,
        ),
    );
    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}
