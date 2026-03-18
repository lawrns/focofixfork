import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import RunDetailPage from "@/app/runs/[id]/page";

vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/hooks/use-auth";

const mockPush = vi.fn();
const mockReload = vi.fn();

const mockRun = {
  id: "run-abc123",
  runner: "clawdbot",
  status: "failed",
  task_id: null,
  started_at: "2026-03-08T10:00:00Z",
  ended_at: "2026-03-08T10:05:00Z",
  summary: "Deploy frontend changes",
  created_at: "2026-03-08T09:59:00Z",
  tokens_in: 1500,
  tokens_out: 800,
  cost_usd: 0.0234,
  artifacts: [],
  trace: {
    ai_routing: {
      requested: { model: "claude-opus-4-20250514" },
      actual: { executor_model: "claude-opus-4-20250514" },
    },
  },
};

const mockTurns = [
  {
    id: "turn-1",
    run_id: "run-abc123",
    idx: 0,
    kind: "execution",
    prompt: "Deploy frontend changes",
    status: "failed",
    outcome_kind: "failed",
    preferred_model: "claude-opus-4-20250514",
    actual_model: "claude-opus-4-20250514",
    gateway_run_id: null,
    correlation_id: null,
    summary: "Deployment failed because the requested model is unavailable.",
    output: "The model 'gpt-5.4-medium' does not exist or is not available",
    session_path: null,
    created_at: "2026-03-08T10:00:00Z",
    ended_at: "2026-03-08T10:05:00Z",
  },
];

const mockTimeline = [
  {
    id: "evt-1",
    kind: "execution",
    title: "Tool call: deploy",
    status: "failed",
    source: "clawdbot",
    timestamp: "2026-03-08T10:05:00Z",
    payload: { tokens_in: 500, tokens_out: 200 },
  },
];

function makeTimelineResponse(overrides: Record<string, unknown> = {}): {
  data: Record<string, unknown>;
} {
  return {
    data: {
      run: mockRun,
      thread: mockRun,
      turns: mockTurns,
      active_turn: mockTurns[0],
      outcome: "failed",
      timeline: mockTimeline,
      artifacts_by_turn: {},
      inspector: { run_trace: mockRun.trace, turns: mockTurns },
      session: null,
      ...overrides,
    },
  };
}

function mockFetchSuccess(body: unknown = makeTimelineResponse()) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFetch404() {
  return vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: "Not found" }),
  });
}

function setup(fetchFn?: ReturnType<typeof vi.fn>) {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: { id: "user-1" },
    loading: false,
  });
  (useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: "run-abc123" });
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  });

  global.fetch = fetchFn ?? mockFetchSuccess();

  return render(<RunDetailPage />);
}

describe("RunDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    mockReload.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        reload: mockReload,
      },
    });
  });

  it("shows loading spinner while fetching", () => {
    const pendingFetch = vi.fn().mockReturnValue(new Promise(() => {}));
    setup(pendingFetch);

    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it('shows "Run not found" for 404 response', async () => {
    setup(mockFetch404());

    await waitFor(() => {
      expect(screen.getByText("Run not found")).toBeInTheDocument();
    });
  });

  it("renders summary, status, runner, duration, and turn count", async () => {
    setup();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Deploy frontend changes" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Deploy frontend changes",
    );
    expect(screen.getAllByText("failed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("clawdbot")).toBeInTheDocument();
    expect(screen.getByText("Duration: 5m 0s")).toBeInTheDocument();
    expect(screen.getByText("Turns: 1")).toBeInTheDocument();
  });

  it("renders turn output content when turns exist", async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByText("Turn 1")).toBeInTheDocument();
    });

    expect(screen.getByText("Prompt:")).toBeInTheDocument();
    expect(
      screen.getAllByText("Deploy frontend changes").length,
    ).toBeGreaterThan(1);
    expect(screen.getByText("Output:")).toBeInTheDocument();
    expect(
      screen.getByText(/gpt-5\.4-medium.*does not exist/i),
    ).toBeInTheDocument();
  });

  it("shows empty execution state when no turns exist", async () => {
    setup(
      mockFetchSuccess(makeTimelineResponse({ turns: [], active_turn: null })),
    );

    await waitFor(() => {
      expect(screen.getByText("No execution evidence")).toBeInTheDocument();
    });

    expect(
      screen.getByText("This run has no recorded turns yet."),
    ).toBeInTheDocument();
  });

  it("toggles inspector payload", async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByText("Inspector")).toBeInTheDocument();
    });

    const initialPreCount = document.querySelectorAll("pre").length;
    fireEvent.click(screen.getByText("Inspector"));
    expect(document.querySelectorAll("pre").length).toBe(initialPreCount + 1);
  });

  it("submits continue requests to the continue endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, opts?: RequestInit) => {
        if (url.includes("/continue") && opts?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ turnId: "turn-new-1" }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeTimelineResponse()),
        });
      });

    setup(fetchMock);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Continue this run..."),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Continue this run..."), {
      target: { value: "Retry with a different model" },
    });
    fireEvent.click(screen.getByRole("button", { name: "" }));

    await waitFor(() => {
      const continueCalls = fetchMock.mock.calls.filter(
        ([url, opts]: [string, RequestInit?]) =>
          url.includes("/continue") && opts?.method === "POST",
      );
      expect(continueCalls.length).toBe(1);
      expect(continueCalls[0][0]).toBe("/api/runs/run-abc123/continue");
    });
  });

  it("retries through the continue endpoint using the active turn prompt", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, opts?: RequestInit) => {
        if (url.includes("/continue") && opts?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ turnId: "turn-retry-1" }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeTimelineResponse()),
        });
      });

    setup(fetchMock);

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      const retryCalls = fetchMock.mock.calls.filter(
        ([url, opts]: [string, RequestInit?]) =>
          url.includes("/continue") && opts?.method === "POST",
      );
      expect(retryCalls.length).toBeGreaterThanOrEqual(1);
      expect(retryCalls[0][0]).toBe("/api/runs/run-abc123/continue");
    });
  });
});
