import type { WorkspaceStarterPlanItem } from "@/lib/workspaces/preview-builders";
import { WorkspaceAgentStudioService } from "@/lib/workspace-agent/studio";

export async function applySupportingAsset(args: {
  workspaceId: string;
  userId: string;
  activeAgentId: string | null;
  item: WorkspaceStarterPlanItem;
  pageService: {
    createPage: (...args: any[]) => Promise<any>;
    createDatabase: (...args: any[]) => Promise<any>;
  };
  studioService: WorkspaceAgentStudioService;
}) {
  const { item } = args;

  if (item.kind === "page") {
    const created = await args.pageService.createPage(args.workspaceId, args.userId, {
      title: item.title.trim(),
      parent_id: null,
      blocks: [{ block_type: "paragraph", plain_text: item.detail, props: {} }],
    });
    return {
      item_id: item.id,
      kind: item.kind,
      status: "applied",
      entity_id: created.page.id,
    };
  }

  if (item.kind === "database") {
    const created = await args.pageService.createDatabase(args.workspaceId, args.userId, {
      parent_doc_id: null,
      title: item.title.trim(),
      description: item.detail.trim(),
      schema: [
        { name: "Name", type: "title" },
        { name: "Status", type: "select", options: ["Backlog", "In Progress", "Done"] },
        { name: "Notes", type: "rich_text" },
      ],
      default_view: { layout: "table" },
    });
    return {
      item_id: item.id,
      kind: item.kind,
      status: "applied",
      entity_id: created.database.id,
    };
  }

  if (item.kind === "connector" && item.provider) {
    const created = await args.studioService.upsertConnector(args.workspaceId, args.userId, {
      provider: item.provider,
      label: item.title.trim(),
      status: "disconnected",
      capabilities: item.capabilities ?? [],
      config: {},
    });
    return {
      item_id: item.id,
      kind: item.kind,
      status: "applied",
      entity_id: created.id,
    };
  }

  if (item.kind === "automation") {
    const created = await args.studioService.createAutomation(args.workspaceId, args.userId, {
      name: item.title.trim(),
      description: item.detail.trim(),
      trigger_type: item.triggerType ?? "manual",
      event_name: null,
      schedule: item.triggerType === "schedule" ? (item.schedule ?? "0 9 * * 1") : null,
      entity_type: "workspace",
      entity_id: null,
      prompt: item.prompt ?? item.detail,
      agent_id: args.activeAgentId,
      writeback_mode: "page_append",
      enabled: false,
    });
    return {
      item_id: item.id,
      kind: item.kind,
      status: "applied",
      entity_id: created.id,
    };
  }

  throw new Error(`Invalid supporting asset item: ${item.id}`);
}
