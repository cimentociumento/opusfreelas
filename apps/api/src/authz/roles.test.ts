import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = {
  isSignedIn: true,
  userId: "user_provider_false",
  sessionId: "sess_current",
};

const profileState = {
  is_contractor: true,
  is_provider: false,
};

const listMock = vi.fn(async () => ({ data: [{ id: "sess_current" }, { id: "sess_other" }] }));
const revokeMock = vi.fn(async () => ({}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    sessions: {
      getSessionList: listMock,
      revokeSession: revokeMock,
    },
  }),
  verifyToken: vi.fn(async () => {
    if (!authState.isSignedIn) return null;
    return { sub: authState.userId, sid: authState.sessionId };
  }),
}));

const maybeSingleMock = vi.fn(async () => ({ data: { clerk_user_id: authState.userId, ...profileState }, error: null }));
const singleMock = vi.fn(async () => ({ data: { clerk_user_id: authState.userId, ...profileState }, error: null }));

const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock, single: singleMock }));
const upsertMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: selectMock,
      upsert: upsertMock,
    }),
  }),
}));

import { app } from "../index.js";

describe("AUTH-03 guards", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_secret_key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
    authState.isSignedIn = true;
    authState.userId = "user_provider_false";
    authState.sessionId = "sess_current";
    profileState.is_contractor = true;
    profileState.is_provider = false;
    listMock.mockClear();
    revokeMock.mockClear();
    maybeSingleMock.mockClear();
    singleMock.mockClear();
  });

  it("returns 401 without Bearer token", async () => {
    const res = await app.request("/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ procedure: "identity.getProfile", input: {} }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 for providerOnlyPing when profile is not provider", async () => {
    const res = await app.request("/rpc", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ procedure: "identity.providerOnlyPing", input: {} }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 200 for providerOnlyPing when profile is provider", async () => {
    profileState.is_provider = true;

    const res = await app.request("/rpc", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ procedure: "identity.providerOnlyPing", input: { message: "ok" } }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("revokes other sessions and keeps current session", async () => {
    const res = await app.request("/sessions/revoke-others", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    expect(listMock).toHaveBeenCalled();
    expect(revokeMock).toHaveBeenCalledTimes(1);
    expect(revokeMock).toHaveBeenCalledWith("sess_other");
  });
});