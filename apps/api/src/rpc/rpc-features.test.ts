import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = {
  isSignedIn: true,
  userId: "user_test_123",
  sessionId: "sess_test",
};

// Mock Supabase
const rpcMock = vi.fn();

function chainable(resolver: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.gte = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.single = vi.fn(resolver);
  chain.maybeSingle = vi.fn(resolver);
  return chain;
}

const fromMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: fromMock,
    rpc: rpcMock,
  }),
}));

// Mock Clerk middleware
vi.mock("../middleware/clerk.js", () => ({
  getAuthUser: () => ({ userId: authState.userId, sessionId: authState.sessionId }),
  requireClerkAuth: async (c: any, next: any) => {
    c.set("authUser", { userId: authState.userId, sessionId: authState.sessionId });
    await next();
  },
}));

import { app } from "../index.js";

describe("RPC Features (Demands & Discovery)", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_secret_key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
    
    vi.clearAllMocks();
  });

  describe("Demands RPC", () => {
    it("creates a demand successfully", async () => {
      const mockDemand = {
        id: "demand_1",
        contractor_id: authState.userId,
        service_type: "Roçada / Capina",
        description: "Preciso de alguém para roçar um terreno de 500m2 no centro.",
        municipality: "Concórdia",
        location: { coordinates: [-52.03, -27.23] },
        urgency: "media",
        visibility_radius: 20,
        status: "aberta",
        created_at: new Date().toISOString(),
      };

      fromMock.mockImplementation(() => {
        const duplicateCheck = chainable(() =>
          Promise.resolve({ data: null, error: null })
        );
        const insertChain = chainable(() =>
          Promise.resolve({ data: mockDemand, error: null })
        );
        return {
          select: duplicateCheck.select,
          eq: duplicateCheck.eq,
          gte: duplicateCheck.gte,
          order: duplicateCheck.order,
          limit: duplicateCheck.limit,
          maybeSingle: duplicateCheck.maybeSingle,
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: insertChain.single,
            })),
          })),
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.create",
          input: {
            serviceType: "Roçada / Capina",
            description: "Preciso de alguém para roçar um terreno de 500m2 no centro.",
            municipality: "Concórdia",
            latitude: -27.23,
            longitude: -52.03,
            urgency: "media",
            visibilityRadius: 20,
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("demand_1");
      expect(data.serviceType).toBe("Roçada / Capina");
    });

    it("returns 409 when duplicate demand is detected within 5 seconds", async () => {
      const recentDuplicate = {
        id: "demand_dup",
        contractor_id: authState.userId,
        service_type: "Roçada / Capina",
        description: "Preciso de alguém para roçar um terreno de 500m2 no centro.",
        created_at: new Date().toISOString(),
      };

      fromMock.mockImplementation(() => {
        const duplicateCheck = chainable(() =>
          Promise.resolve({ data: recentDuplicate, error: null })
        );
        return {
          select: duplicateCheck.select,
          eq: duplicateCheck.eq,
          gte: duplicateCheck.gte,
          order: duplicateCheck.order,
          limit: duplicateCheck.limit,
          maybeSingle: duplicateCheck.maybeSingle,
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.create",
          input: {
            serviceType: "Roçada / Capina",
            description: "Preciso de alguém para roçar um terreno de 500m2 no centro.",
            municipality: "Concórdia",
            latitude: -27.23,
            longitude: -52.03,
            urgency: "media",
            visibilityRadius: 20,
          },
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("Duplicate demand");
      expect(data.id).toBe("demand_dup");
    });

    it("lists my demands", async () => {
      const mockDemands = [
        { id: "d1", contractor_id: authState.userId, service_type: "Roçada", location: { coordinates: [-52.03, -27.23] }, urgency: "media", status: "aberta", visibility_radius: 10, created_at: "2026-06-19T00:00:00Z", updated_at: "2026-06-19T00:00:00Z" },
        { id: "d2", contractor_id: authState.userId, service_type: "Pintura", location: { coordinates: [-52.03, -27.23] }, urgency: "media", status: "aberta", visibility_radius: 10, created_at: "2026-06-19T00:00:00Z", updated_at: "2026-06-19T00:00:00Z" },
      ];

      fromMock.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockDemands, error: null }),
          }),
        }),
      }));

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.listMyDemands",
          input: {},
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
    });

    it("updates a demand when the caller is the owner", async () => {
      const demandId = "a1111111-1111-4111-8111-111111111111";
      const existing = {
        contractor_id: authState.userId,
        status: "aberta",
      };
      const updatedRow = {
        id: demandId,
        contractor_id: authState.userId,
        service_type: "Roçada / Capina",
        description: "Descricao atualizada com pelo menos trinta caracteres.",
        municipality: "Concórdia",
        location: { coordinates: [-52.03, -27.23] },
        urgency: "alta",
        visibility_radius: 20,
        status: "aberta",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      fromMock.mockImplementation(() => {
        const ownershipChain = chainable(() =>
          Promise.resolve({ data: existing, error: null })
        );
        const updateChain = chainable(() =>
          Promise.resolve({ data: updatedRow, error: null })
        );
        return {
          select: ownershipChain.select,
          eq: ownershipChain.eq,
          single: ownershipChain.single,
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: updateChain.single,
                })),
              })),
            })),
          })),
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.update",
          input: {
            id: demandId,
            description: "Descricao atualizada com pelo menos trinta caracteres.",
            urgency: "alta",
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(demandId);
      expect(data.description).toBe("Descricao atualizada com pelo menos trinta caracteres.");
    });

    it("returns 403 when updating a demand owned by another user", async () => {
      const demandId = "a1111111-1111-4111-8111-111111111111";
      const existing = {
        contractor_id: "other_user",
        status: "aberta",
      };

      fromMock.mockImplementation(() => {
        const ownershipChain = chainable(() =>
          Promise.resolve({ data: existing, error: null })
        );
        return {
          select: ownershipChain.select,
          eq: ownershipChain.eq,
          single: ownershipChain.single,
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.update",
          input: {
            id: demandId,
            description: "Tentativa de edicao indevida com trinta caracteres.",
          },
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden");
    });

    it("deletes a concluida demand when the caller is the owner", async () => {
      const demandId = "a3333333-3333-4333-8333-333333333333";
      const existing = {
        contractor_id: authState.userId,
        status: "concluida",
      };

      fromMock.mockImplementation(() => {
        const ownershipChain = chainable(() =>
          Promise.resolve({ data: existing, error: null })
        );
        const deleteChain = chainable(() => Promise.resolve({ error: null }));
        return {
          select: ownershipChain.select,
          eq: ownershipChain.eq,
          single: ownershipChain.single,
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: deleteChain.eq,
            })),
          })),
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.delete",
          input: { id: demandId },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deleted).toBe(true);
      expect(data.id).toBe(demandId);
    });

    it("returns 403 when deleting a demand owned by another user", async () => {
      const demandId = "a3333333-3333-4333-8333-333333333333";
      const existing = {
        contractor_id: "other_user",
        status: "encerrada",
      };

      fromMock.mockImplementation(() => {
        const ownershipChain = chainable(() =>
          Promise.resolve({ data: existing, error: null })
        );
        return {
          select: ownershipChain.select,
          eq: ownershipChain.eq,
          single: ownershipChain.single,
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.delete",
          input: { id: demandId },
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden");
    });

    it("deletes an open demand successfully", async () => {
      const demandId = "a1111111-1111-4111-8111-111111111111";
      const existing = {
        contractor_id: authState.userId,
        status: "aberta",
      };

      fromMock.mockImplementation(() => {
        const ownershipChain = chainable(() =>
          Promise.resolve({ data: existing, error: null })
        );
        const deleteChain = chainable(() => Promise.resolve({ error: null }));
        return {
          select: ownershipChain.select,
          eq: ownershipChain.eq,
          single: ownershipChain.single,
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: deleteChain.eq,
            })),
          })),
        };
      });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "demands.delete",
          input: { id: demandId },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deleted).toBe(true);
    });
  });

  describe("Identity RPC", () => {
    it("getProfile returns displayName and avatarUrl", async () => {
      const mockProfile = {
        clerk_user_id: authState.userId,
        is_contractor: true,
        is_provider: false,
        display_name: "Maria Souza",
        avatar_url: null,
        service_categories: [],
      };

      fromMock.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      }));

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ procedure: "identity.getProfile", input: {} }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.displayName).toBe("Maria Souza");
      expect(data.avatarUrl).toBeNull();
    });

    it("updateProfile saves displayName", async () => {
      const updatedRow = {
        clerk_user_id: authState.userId,
        display_name: "João Pedro",
      };

      fromMock.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
            }),
          }),
        }),
      }));

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "identity.updateProfile",
          input: { displayName: "João Pedro" },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.displayName).toBe("João Pedro");
    });

    it("updateProfile rejects a name shorter than 2 characters", async () => {
      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "identity.updateProfile",
          input: { displayName: "A" },
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("Discovery RPC", () => {
    it("searches providers successfully", async () => {
      const mockProviders = [
        { 
          clerk_user_id: "provider_1", 
          is_provider: true, 
          service_categories: ["Roçada / Capina"],
          distance_meters: 1500 
        }
      ];

      rpcMock.mockResolvedValue({ data: mockProviders, error: null });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "discovery.searchProviders",
          input: {
            latitude: -27.23,
            longitude: -52.03,
            category: "Roçada / Capina",
            radius: 50
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].clerkUserId).toBe("provider_1");
      expect(data[0].distanceMeters).toBe(1500);
    });
  });
});
