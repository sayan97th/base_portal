/**
 * Unit tests for the public order link contract: encoding/decoding the
 * `cart` query param that basesearchmarketing.com hands off to the portal's
 * public checkout wizard. Decoding is the security-relevant half — this data
 * arrives from an external, unauthenticated source, so malformed or
 * unrecognized entries must be dropped rather than trusted.
 */

import {
  encodePublicOrderCart,
  decodePublicOrderCart,
  type PublicOrderCartItem,
} from "@/lib/public-order-link";

function makeItem(overrides: Partial<PublicOrderCartItem> = {}): PublicOrderCartItem {
  return {
    product_type: "link_building",
    tier_id: "dr30",
    tier_name: "DR 30+",
    unit_price: 100,
    quantity: 2,
    ...overrides,
  };
}

describe("encodePublicOrderCart / decodePublicOrderCart", () => {
  it("round-trips a single item", () => {
    const items = [makeItem()];
    const decoded = decodePublicOrderCart(encodePublicOrderCart(items));
    expect(decoded).toEqual(items);
  });

  it("round-trips multiple items across product types", () => {
    const items = [
      makeItem({ product_type: "link_building", tier_id: "dr30" }),
      makeItem({ product_type: "content_optimization", tier_id: "co-800", quantity: 1 }),
      makeItem({ product_type: "new_content", tier_id: "nc-500", quantity: 3 }),
      makeItem({ product_type: "content_brief", tier_id: "cb-1", quantity: 5 }),
    ];
    expect(decodePublicOrderCart(encodePublicOrderCart(items))).toEqual(items);
  });

  it("produces a URL-safe string with no +, /, or = characters", () => {
    // unicode-ish tier names are the most likely source of + / = in base64
    const encoded = encodePublicOrderCart([makeItem({ tier_name: "DR 40+ / Premium" })]);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns an empty array for a null param", () => {
    expect(decodePublicOrderCart(null)).toEqual([]);
  });

  it("returns an empty array for an empty string param", () => {
    expect(decodePublicOrderCart("")).toEqual([]);
  });

  it("returns an empty array for garbled, non-base64 input", () => {
    expect(decodePublicOrderCart("!!!not-base64!!!")).toEqual([]);
  });

  it("returns an empty array when the decoded payload isn't valid JSON", () => {
    const not_json_b64 = Buffer.from("not valid json", "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePublicOrderCart(not_json_b64)).toEqual([]);
  });

  it("returns an empty array when the JSON payload is not an array", () => {
    const obj_b64 = Buffer.from(JSON.stringify({ not: "an array" }), "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePublicOrderCart(obj_b64)).toEqual([]);
  });

  describe("dropping invalid entries instead of trusting them", () => {
    it("drops an entry with an unrecognized product_type", () => {
      const items = [makeItem({ product_type: "not_a_real_product" as never })];
      expect(decodePublicOrderCart(encodePublicOrderCart(items))).toEqual([]);
    });

    it("drops an entry with a missing tier_id", () => {
      const encoded = encodePublicOrderCart([{ ...makeItem(), tier_id: "" }]);
      expect(decodePublicOrderCart(encoded)).toEqual([]);
    });

    it("drops an entry with a missing tier_name", () => {
      const encoded = encodePublicOrderCart([{ ...makeItem(), tier_name: "" }]);
      expect(decodePublicOrderCart(encoded)).toEqual([]);
    });

    it("drops an entry with a negative unit_price", () => {
      const encoded = encodePublicOrderCart([{ ...makeItem(), unit_price: -10 }]);
      expect(decodePublicOrderCart(encoded)).toEqual([]);
    });

    it("drops an entry with a zero quantity", () => {
      const encoded = encodePublicOrderCart([{ ...makeItem(), quantity: 0 }]);
      expect(decodePublicOrderCart(encoded)).toEqual([]);
    });

    it("drops an entry with a negative quantity", () => {
      const encoded = encodePublicOrderCart([{ ...makeItem(), quantity: -3 }]);
      expect(decodePublicOrderCart(encoded)).toEqual([]);
    });

    it("drops an entry with a non-integer quantity", () => {
      const encoded = encodePublicOrderCart([{ ...makeItem(), quantity: 1.5 }]);
      expect(decodePublicOrderCart(encoded)).toEqual([]);
    });

    it("keeps the valid entries and drops only the invalid ones in a mixed array", () => {
      const valid_item = makeItem({ tier_id: "dr30" });
      const encoded = encodePublicOrderCart([
        valid_item,
        { ...makeItem(), quantity: -1 },
        { ...makeItem(), product_type: "bogus" as never },
      ]);
      expect(decodePublicOrderCart(encoded)).toEqual([valid_item]);
    });
  });
});
