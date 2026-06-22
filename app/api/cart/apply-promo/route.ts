import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cartItemSchema, totalize, CartTotals } from "@/lib/cart";

const BodySchema = z.object({
  items: z.array(cartItemSchema).min(1).max(100),
  code: z.string().min(1).max(50),
  region: z.string().min(1).max(10),
});

/**
 * Applies a promo code to a cart and returns the computed totals.
 *
 * Validates the request body at the boundary, delegates discount calculation
 * to `lib/cart#totalize`, and returns `CartTotals` including the percentage
 * discount derived from the supplied promo code.
 *
 * @param req - Incoming POST request containing `items`, `code`, and `region`.
 * @returns 200 with `CartTotals` on success; 400 on malformed JSON or schema
 *   violations. Error responses never include a stack trace.
 * @throws Never — all errors are caught and returned as structured JSON.
 *
 * @example
 * // POST /api/cart/apply-promo
 * // Body: { items: [{ productId: "p1", quantity: 2, unitPriceCents: 1000 }], code: "WELCOME10", region: "GB" }
 * // → { subtotalCents: 2000, discountCents: 200, taxCents: 360, totalCents: 2160 }
 */
export async function POST(req: NextRequest): Promise<NextResponse<CartTotals | { error: string }>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { items, code, region } = parsed.data;
  const totals = totalize(items, code, region);
  return NextResponse.json(totals);
}
