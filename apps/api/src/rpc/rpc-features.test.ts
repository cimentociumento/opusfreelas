import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = {
  isSignedIn: true,
  userId: "user_test_123",
  sessionId: "sess_test",
};

// Mock Supabase
const rpcMock = vi.fn();
const insertMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: insertMock,
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    }),
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

      insertMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockDemand, error: null })
        })
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

    it("lists my demands", async () => {
      const mockDemands = [
        { id: "d1", contractor_id: authState.userId, service_type: "Roçada" },
        { id: "d2", contractor_id: authState.userId, service_type: "Pintura" },
      ];

      selectMock.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockDemands, error: null })
        })
      });

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
