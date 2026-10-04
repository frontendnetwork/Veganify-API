import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Test, TestingModule } from "@nestjs/testing";

import { GradesService } from "./grades.service";

const originalFetch = globalThis.fetch;

const mockFetch = (response: Response) => {
  globalThis.fetch = mock().mockResolvedValue(
    response
  ) as unknown as typeof globalThis.fetch;
};

const mockFetchRejected = (error: Error) => {
  globalThis.fetch = mock().mockRejectedValue(
    error
  ) as unknown as typeof globalThis.fetch;
};

describe("GradesService", () => {
  let service: GradesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradesService],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("checkBarcode", () => {
    it("should return parsed JSON on a 200 response", async () => {
      const data = { grade: "A", name: "Oat Milk" };
      mockFetch(new Response(JSON.stringify(data), { status: 200 }));

      const result = await service.checkBarcode("12345678");

      expect(result).toEqual(data);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://grades.veganify.app/api/12345678.json",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should throw an error carrying response.status on a non-ok response", async () => {
      mockFetch(new Response("Not Found", { status: 404 }));

      await expect(service.checkBarcode("00000000")).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should throw on a 500 server error", async () => {
      mockFetch(new Response("Internal Server Error", { status: 500 }));

      await expect(service.checkBarcode("11111111")).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    it("should propagate network failures", async () => {
      mockFetchRejected(new TypeError("Failed to fetch"));

      await expect(service.checkBarcode("12345678")).rejects.toThrow(
        "Failed to fetch"
      );
    });
  });

  describe("notifyMissingBarcode", () => {
    it("should POST to the Pushover API with the correct body", async () => {
      mockFetch(new Response("{}", { status: 200 }));

      await service.notifyMissingBarcode("99887766");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.pushover.net/1/messages.json",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      const calls = (globalThis.fetch as unknown as ReturnType<typeof mock>)
        .mock.calls;
      const body = JSON.parse(
        (calls[0] as [string, RequestInit])[1].body as string
      );
      expect(body).toMatchObject({
        message: expect.stringContaining("99887766"),
        priority: 0,
      });
    });

    it("should swallow errors when Pushover is unreachable (fire-and-forget)", async () => {
      mockFetchRejected(new Error("Connection refused"));

      await expect(
        service.notifyMissingBarcode("12345678")
      ).resolves.toBeUndefined();
    });

    it("should swallow errors when Pushover returns a non-ok status", async () => {
      mockFetch(new Response("Service Unavailable", { status: 503 }));

      await expect(
        service.notifyMissingBarcode("12345678")
      ).resolves.toBeUndefined();
    });
  });
});
