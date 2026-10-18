import type { NextRequest } from "next/server";
import { handleCatalogPublication, type CatalogPublicationContext } from "@/lib/catalogPublicationHttp";

export const runtime = "nodejs";

export async function GET(req: NextRequest, context: CatalogPublicationContext) {
  return handleCatalogPublication(req, context, "preview");
}
