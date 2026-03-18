import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceSwitcher } from "@/components/navigation/workspace-switcher";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";

vi.mock("@/lib/hooks/use-auth");
vi.mock("next/navigation");

global.fetch = vi.fn();

interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

describe("WorkspaceSwitcher Component", () => {
  const mockWorkspaces: Workspace[] = [
    { id: "1", name: "Design Team", slug: "design-team", icon: "🎨" },
    { id: "2", name: "Engineering", slug: "engineering", icon: "⚙️" },
    { id: "3", name: "Product", slug: "product", icon: "📦" },
  ];

  const mockUser = { id: "user123", email: "user@example.com" };
  const mockRouter = { push: vi.fn() };

  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    const trigger = await screen.findByRole("button");
    await user.click(trigger);
    return await screen.findByRole("menu");
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (useRouter as any).mockReturnValue(mockRouter);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ workspaces: mockWorkspaces }),
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders trigger with current workspace name", async () => {
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /design team/i }),
      ).toBeInTheDocument();
    });
  });

  it("opens dropdown and renders workspace items", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    const menu = await openMenu(user);
    expect(menu).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /engineering/i }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /product/i }),
    ).toBeInTheDocument();
  });

  it("marks current workspace as active", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    const menu = await openMenu(user);
    const activeItem = within(menu).getByRole("menuitem", {
      name: /design team/i,
    });
    expect(activeItem).toHaveTextContent(/active/i);
  });

  it("switches workspace and navigates", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    const menu = await openMenu(user);
    await user.click(
      within(menu).getByRole("menuitem", { name: /engineering/i }),
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/workspaces/2");
    });
  });

  it("renders create workspace option and calls onCreateOpen", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onCreateOpen = vi.fn();

    render(
      <WorkspaceSwitcher
        currentWorkspace="design-team"
        onCreateOpen={onCreateOpen}
      />,
    );
    const menu = await openMenu(user);

    await user.click(
      within(menu).getByRole("menuitem", { name: /create workspace/i }),
    );
    expect(onCreateOpen).toHaveBeenCalledTimes(1);
  });

  it("shows search input when there are at least 5 workspaces", async () => {
    const manyWorkspaces = Array.from({ length: 6 }, (_, i) => ({
      id: String(i + 1),
      name: `Workspace ${i + 1}`,
      slug: `workspace-${i + 1}`,
    }));
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workspaces: manyWorkspaces }),
    });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<WorkspaceSwitcher currentWorkspace="workspace-1" />);

    await openMenu(user);
    expect(
      await screen.findByPlaceholderText(/search workspaces/i),
    ).toBeInTheDocument();
  });

  it("filters workspace list via search query", async () => {
    const manyWorkspaces = [
      { id: "1", name: "Design Team", slug: "design-team" },
      { id: "2", name: "Engineering", slug: "engineering" },
      { id: "3", name: "Product", slug: "product" },
      { id: "4", name: "Ops", slug: "ops" },
      { id: "5", name: "Support", slug: "support" },
      { id: "6", name: "Sales", slug: "sales" },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workspaces: manyWorkspaces }),
    });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    const menu = await openMenu(user);
    const searchInput =
      await screen.findByPlaceholderText(/search workspaces/i);
    await user.type(searchInput, "eng");

    await waitFor(() => {
      expect(
        within(menu).getByRole("menuitem", { name: /engineering/i }),
      ).toBeInTheDocument();
    });
  });

  it("opens menu via keyboard shortcut Ctrl+Shift+W", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    await user.keyboard("{Control>}{Shift>}w{/Shift}{/Control}");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("calls workspace API with credentials include", async () => {
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/workspaces", {
        credentials: "include",
      });
    });
  });

  it("retries workspace fetch on initial failure", async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: mockWorkspaces }),
      });

    render(<WorkspaceSwitcher currentWorkspace="design-team" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      },
      { timeout: 3500 },
    );
  });

  it("renders status region for announcements", async () => {
    render(<WorkspaceSwitcher currentWorkspace="design-team" />);
    await waitFor(() => {
      expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    });
  });
});
