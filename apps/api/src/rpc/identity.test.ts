import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { userId: "user_test_123", sessionId: "sess_test" };
const fromMock = vi.fn();

function chainable(resolver: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.update = vi.fn(self);
  chain.single = vi.fn(resolver);
  chain.maybeSingle = vi.fn(resolver);
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: fromMock, rpc: vi.fn() }),
}));

vi.mock("../middleware/clerk.js", () => ({
  getAuthUser: () => ({ userId: authState.userId, sessionId: authState.sessionId }),
  requireClerkAuth: async (c: any, next: any) => {
    c.set("authUser", { userId: authState.userId, sessionId: authState.sessionId });
    await next();
  },
}));

import { app } from "../index.js";

function post(procedure: string, input: unknown) {
  return app.request("/rpc", {
    method: "POST",
    headers: { authorization: "Bearer test-token", "content-type": "application/json" },
    body: JSON.stringify({ procedure, input }),
  });
}

describe("Identity RPC", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_secret_key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
    vi.clearAllMocks();
  });

  it("getProfile returns social fields", async () => {
    fromMock.mockImplementation(() =>
      chainable(() =>
        Promise.resolve({
          data: {
            clerk_user_id: authState.userId,
            is_contractor: true,
            is_provider: false,
            service_categories: [],
            display_name: "Maria Souza",
            avatar_url: null,
            municipality: "Concórdia",
            bio: null,
            years_experience: null,
            portfolio_urls: [],
          },
          error: null,
        })
      )
    );

    const res = await post("identity.getProfile", {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Maria Souza");
    expect(data.municipality).toBe("Concórdia");
  });

  it("updateProfile persists name and municipality via upsert (existing user)", async () => {
    const upsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              clerk_user_id: authState.userId,
              display_name: "Maria Souza",
              municipality: "Concórdia",
            },
            error: null,
          })
        ),
      })),
    }));
    fromMock.mockImplementation(() => ({ upsert: upsertMock }));

    const res = await post("identity.updateProfile", {
      displayName: "Maria Souza",
      municipality: "Concórdia",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Maria Souza");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ clerk_user_id: authState.userId }),
      { onConflict: "clerk_user_id" }
    );
  });

  it("updateProfile succeeds for a brand-new user with no pre-existing profiles row", async () => {
    // Regression test for the S1: a fresh Clerk sign-up has zero rows in
    // `profiles`. .update() would match 0 rows and error; .upsert() must
    // insert instead, unblocking onboarding step 1.
    const upsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              clerk_user_id: authState.userId,
              display_name: "Novo Usuário",
              municipality: "Concórdia",
            },
            error: null,
          })
        ),
      })),
    }));
    fromMock.mockImplementation(() => ({ upsert: upsertMock }));

    const res = await post("identity.updateProfile", {
      displayName: "Novo Usuário",
      municipality: "Concórdia",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Novo Usuário");
    expect(data.municipality).toBe("Concórdia");
  });

  it("updateProfile rejects a blank name with 400", async () => {
    const res = await post("identity.updateProfile", { displayName: " ", municipality: "X" });
    expect(res.status).toBe(400);
  });

  it("updateProviderSocialProfile rejects when caller is not a provider (403)", async () => {
    fromMock.mockImplementation(() =>
      chainable(() => Promise.resolve({ data: { is_provider: false }, error: null }))
    );

    const res = await post("identity.updateProviderSocialProfile", {
      bio: "Trabalho com roçada e capina há vários anos na região de Concórdia.",
      yearsExperience: 5,
      portfolioUrls: ["user_test_123/p1.jpg"],
    });
    expect(res.status).toBe(403);
  });

  it("updateProviderSocialProfile rejects a short bio with 400", async () => {
    const res = await post("identity.updateProviderSocialProfile", {
      bio: "curto",
      yearsExperience: 5,
      portfolioUrls: ["user_test_123/p1.jpg"],
    });
    expect(res.status).toBe(400);
  });

  it("updateProviderSocialProfile succeeds for a provider with self-owned portfolio paths", async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        // is_provider check
        return chainable(() => Promise.resolve({ data: { is_provider: true }, error: null }));
      }
      // update().eq().select().single()
      return chainable(() =>
        Promise.resolve({
          data: {
            clerk_user_id: authState.userId,
            bio: "Trabalho com roçada e capina há vários anos na região de Concórdia.",
            years_experience: 5,
            portfolio_urls: ["user_test_123/1.jpg"],
          },
          error: null,
        })
      );
    });

    const res = await post("identity.updateProviderSocialProfile", {
      bio: "Trabalho com roçada e capina há vários anos na região de Concórdia.",
      yearsExperience: 5,
      portfolioUrls: ["user_test_123/1.jpg"],
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.portfolioUrls).toEqual(["user_test_123/1.jpg"]);
  });

  it("updateProviderSocialProfile rejects portfolio paths not owned by the caller (400)", async () => {
    // A provider hitting /rpc directly with someone else's (or a fabricated)
    // storage path must not be able to fake the anti-fraud upload gate.
    fromMock.mockImplementation(() =>
      chainable(() => Promise.resolve({ data: { is_provider: true }, error: null }))
    );

    const res = await post("identity.updateProviderSocialProfile", {
      bio: "Trabalho com roçada e capina há vários anos na região de Concórdia.",
      yearsExperience: 5,
      portfolioUrls: ["someone_else/x.jpg"],
    });
    expect(res.status).toBe(400);
  });
});
