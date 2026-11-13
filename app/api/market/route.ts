import { rateLimit } from "@/lib/limits";
import { getQuotes } from "@/lib/market";
import { company } from "@/lib/companies";
import { apiError } from "@/lib/http";
export async function GET(request: Request) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;
  try {
    const tickers = [
      ...new Set(
        (new URL(request.url).searchParams.get("tickers") || "INFY").split(","),
      ),
    ];
    if (tickers.length > 25) throw new Error("Maximum 25 tickers per request");
    tickers.forEach(company);
    return Response.json({
      quotes: await getQuotes(tickers),
      mode: "EOD",
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return apiError(e);
  }
}
