import { rateLimit } from "@/lib/limits";
import { getAnnouncements } from "@/lib/announcements";
import { inWindow } from "@/lib/domain";
import { company } from "@/lib/companies";
import { apiError } from "@/lib/http";
export async function GET(request: Request) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;
  try {
    const p = new URL(request.url).searchParams;
    const tickers = (p.get("tickers") || "INFY").split(",");
    if (tickers.length > 25) throw new Error("Maximum 25 tickers");
    tickers.forEach(company);
    const data = await getAnnouncements();
    const window = p.get("window") || "24h";
    const cats = p.get("categories")?.split(",");
    return Response.json({
      ...data,
      items: data.items.filter(
        (i) =>
          tickers.includes(i.ticker) &&
          inWindow(
            i.filedAt,
            window,
            Date.now(),
            p.get("start") || undefined,
            p.get("end") || undefined,
          ) &&
          (!cats || cats.includes(i.category)),
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
