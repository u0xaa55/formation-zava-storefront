import { describe, it, expect } from "vitest";
import { applyDiscount, totalize } from "../lib/cart";
import { POST } from "../app/api/cart/apply-promo/route";

// ─── applyDiscount unit tests ──────────────────────────────────────────────

describe("applyDiscount", () => {
  it("returns 0 for null code", () => {
    expect(applyDiscount(2000, null)).toBe(0);
  });

  it("applies WELCOME10 (10 % of subtotal)", () => {
    expect(applyDiscount(2000, "WELCOME10")).toBe(200);
    expect(applyDiscount(2000, "welcome10")).toBe(200); // case-insensitive
  });

  it("applies VIP25 when subtotal ≥ 10 000 cents", () => {
    expect(applyDiscount(10_000, "VIP25")).toBe(2500);
    expect(applyDiscount(50_000, "VIP25")).toBe(12_500);
  });

  it("does not apply VIP25 when subtotal < 10 000 cents", () => {
    expect(applyDiscount(9_999, "VIP25")).toBe(0);
  });

  it("FREESHIP produces 0 price discount", () => {
    expect(applyDiscount(5000, "FREESHIP")).toBe(0);
  });

  it("returns 0 for an unknown code", () => {
    expect(applyDiscount(2000, "BOGUS99")).toBe(0);
  });
});

// ─── POST /api/cart/apply-promo handler tests ─────────────────────────────

const BASE_URL = "http://localhost/api/cart/apply-promo";
const ITEM = { productId: "p1", quantity: 2, unitPriceCents: 1000 };

describe("POST /api/cart/apply-promo", () => {
  it("returns 200 with correct CartTotals for a valid payload", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [ITEM], code: "WELCOME10", region: "GB" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const data = await res.json();
    // subtotal = 2 * 1000 = 2000; discount = 10% = 200; taxable = 1800; tax GB = 360; total = 2160
    expect(data).toEqual({
      subtotalCents: 2000,
      discountCents: 200,
      taxCents: 360,
      totalCents: 2160,
    });
  });

  it("returns discountCents 0 for an unknown code", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [ITEM], code: "NOPE", region: "GB" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.discountCents).toBe(0);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_json");
  });

  it("returns 400 when items is empty", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [], code: "WELCOME10", region: "GB" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_request");
  });

  it("returns 400 when code exceeds 50 chars", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [ITEM], code: "A".repeat(51), region: "GB" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when region is missing", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [ITEM], code: "WELCOME10" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

// ─── totalize integration (discount + tax chained) ────────────────────────

describe("totalize with promo codes", () => {
  it("returns non-negative totalCents even when subtotal is zero", () => {
    const result = totalize(
      [{ productId: "p1", quantity: 1, unitPriceCents: 0 }],
      "WELCOME10",
      "GB",
    );
    expect(result.totalCents).toBeGreaterThanOrEqual(0);
    expect(result.discountCents).toBe(0);
  });

  it("VIP25 does not apply below the £100 threshold", () => {
    const result = totalize(
      [{ productId: "p1", quantity: 1, unitPriceCents: 5000 }],
      "VIP25",
      "GB",
    );
    expect(result.discountCents).toBe(0);
  });

  it("VIP25 applies and tax is computed on discounted amount", () => {
    // subtotal = 20 000; discount = 25% = 5000; taxable = 15 000; tax GB = 3000; total = 18 000
    const result = totalize(
      [{ productId: "p1", quantity: 1, unitPriceCents: 20_000 }],
      "VIP25",
      "GB",
    );
    expect(result.subtotalCents).toBe(20_000);
    expect(result.discountCents).toBe(5_000);
    expect(result.taxCents).toBe(3_000);
    expect(result.totalCents).toBe(18_000);
  });
});
