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

  it("updateProfile persists name and municipality", async () => {
    fromMock.mockImplementation(() => {
      const updateChain = chainable(() =>
        Promise.resolve({
          data: {
            clerk_user_id: authState.userId,
            display_name: "Maria Souza",
            municipality: "Concórdia",
          },
          error: null,
        })
      );
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ select: vi.fn(() => ({ single: updateChain.single })) })),
        })),
      };
    });

    const res = await post("identity.updateProfile", {
      displayName: "Maria Souza",
      municipality: "Concórdia",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Maria Souza");
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
});
