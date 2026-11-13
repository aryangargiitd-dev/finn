import { rateLimit } from "@/lib/limits";
import { searchCompanies } from "@/lib/companies";
export async function GET(request: Request) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;
  return Response.json({
    companies: searchCompanies(
      new URL(request.url).searchParams.get("q") || "",
    ),
  });
}
