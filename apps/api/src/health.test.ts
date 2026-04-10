import { assertCanActAs } from "@amauc/shared";
import { describe, expect, it } from "vitest";
import { app } from "./index.js";

describe("/health", () => {
  it("returns ok", async () => {
    assertCanActAs(
      { roles: { isContractor: true, isProvider: true } },
      "contractor"
    );
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
