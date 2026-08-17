import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { userId: "user_test_123", sessionId: "sess_test" };
const fromMock = vi.fn();
const uploadMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: fromMock,
    rpc: vi.fn(),
    storage: {
      from: () => ({
        upload: uploadMock,
        remove: removeMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/portfolio/${path}` } }),
      }),
    },
  }),
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

function providerFetch(isProvider: boolean) {
  fromMock.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { is_provider: isProvider }, error: null })),
      })),
    })),
  }));
}

const tinyJpegBase64 = Buffer.from("fake-image-bytes").toString("base64");

describe("identity.uploadPortfolioImage", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_secret_key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
    vi.clearAllMocks();
  });

  it("uploads for a provider and returns a path under the user id prefix", async () => {
    providerFetch(true);
    uploadMock.mockResolvedValue({ data: { path: "x" }, error: null });

    const res = await post("identity.uploadPortfolioImage", {
      imageBase64: tinyJpegBase64,
      contentType: "image/jpeg",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path.startsWith("user_test_123/")).toBe(true);
    expect(data.path.endsWith(".jpg")).toBe(true);
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when the caller is not a provider", async () => {
    providerFetch(false);
    const res = await post("identity.uploadPortfolioImage", {
      imageBase64: tinyJpegBase64,
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(403);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid content type", async () => {
    const res = await post("identity.uploadPortfolioImage", {
      imageBase64: tinyJpegBase64,
      contentType: "image/gif",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty base64", async () => {
    const res = await post("identity.uploadPortfolioImage", {
      imageBase64: "",
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(400);
  });
});

describe("identity.deletePortfolioImage", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_secret_key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
    vi.clearAllMocks();
  });

  it("deletes a path owned by the caller", async () => {
    removeMock.mockResolvedValue({ data: {}, error: null });

    const res = await post("identity.deletePortfolioImage", {
      path: "user_test_123/1786860377368.png",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(true);
    expect(removeMock).toHaveBeenCalledWith(["user_test_123/1786860377368.png"]);
  });

  it("rejects a path not owned by the caller (400)", async () => {
    const res = await post("identity.deletePortfolioImage", {
      path: "someone_else/1786860377368.png",
    });
    expect(res.status).toBe(400);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing path", async () => {
    const res = await post("identity.deletePortfolioImage", {});
    expect(res.status).toBe(400);
  });
});
