import { describe, expect, test } from "bun:test";
import { buildSlots, DAY1_SLOTS, DAY2_SLOTS, POSTS_PER_48H } from "../agent/lib/topics.ts";

describe("48h slot math", () => {
  test("15 posts: 7 day-one + 8 day-two", () => {
    expect(DAY1_SLOTS).toHaveLength(7);
    expect(DAY2_SLOTS).toHaveLength(8);
    expect(POSTS_PER_48H).toBe(15);
  });

  test("buildSlots returns dated, ordered, in-window slots", () => {
    const slots = buildSlots("2026-09-18");
    expect(slots).toHaveLength(15);
    const utcs = slots.map((s) => s.slotUtc);
    const sorted = [...utcs].sort();
    expect(utcs).toEqual(sorted); // chronological
    // IST date portion matches expected calendar days
    expect(slots[0].slotIst).toBe("2026-09-18 15:00 IST");
    expect(slots[6].slotIst).toBe("2026-09-19 01:12 IST");
    expect(slots[7].slotIst).toBe("2026-09-19 15:00 IST");
    expect(slots[14].slotIst).toBe("2026-09-20 01:30 IST");
    // UTC conversion: 15:00 IST = 09:30 UTC
    expect(slots[0].slotUtc).toBe("2026-09-18T09:30:00.000Z");
  });
});
