import { createClient } from '@supabase/supabase-js';
import { 
  MermaidDiagram, 
  MermaidDiagramVersion, 
  MermaidDiagramShare,
  CreateMermaidDiagramRequest,
  UpdateMermaidDiagramRequest,
  ShareMermaidDiagramRequest,
  CreateVersionRequest,
  ExportMermaidDiagramRequest,
  MermaidDiagramListItem,
  MermaidDiagramWithVersions,
  mapDatabaseToMermaidDiagram,
  mapDatabaseToMermaidDiagramVersion,
  mapDatabaseToMermaidDiagramShare,
  validateMermaidCode,
  generateShareToken
} from '@/lib/models/mermaid';

// Simple mapping function without Zod validation
const mapDatabaseToMermaidDiagramSimple = (row: any): MermaidDiagram => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mermaid_code: row.mermaid_code,
    created_by: row.created_by,
    workspace_id: row.workspace_id,
    is_public: row.is_public,
    share_token: row.share_token,
    created_at: row.created_at,
    updated_at: row.updated_at,
    version: row.version,
  };
};
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export class MermaidPublicService {
  private supabase = supabaseAdmin;

  // Diagram CRUD operations (public access)
  async listDiagrams(options: {
    workspaceId?: string;
    isPublic?: boolean;
    sharedWithMe?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ diagrams: MermaidDiagramListItem[]; total: number }> {
    let query = this.supabase
      .from('mermaid_diagrams')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options.workspaceId) {
      query = query.eq('workspace_id', options.workspaceId);
    }

    if (options.isPublic !== undefined) {
      query = query.eq('is_public', options.isPublic);
    }

    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    // Order by updated_at desc
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list diagrams: ${error.message}`);
    }

    const diagrams: MermaidDiagramListItem[] = data.map((row: any) => {
      const baseDiagram = mapDatabaseToMermaidDiagramSimple(row);
      return {
        id: baseDiagram.id,
        title: baseDiagram.title,
        description: baseDiagram.description,
        is_public: baseDiagram.is_public,
        share_token: baseDiagram.share_token,
        created_at: baseDiagram.created_at,
        updated_at: baseDiagram.updated_at,
        version: baseDiagram.version,
        created_by: baseDiagram.created_by,
        workspace_id: baseDiagram.workspace_id,
        owner_name: 'Public',
        organization_name: 'Public',
        can_edit: false,
        can_delete: false,
        can_share: false,
      };
    });

    return {
      diagrams,
      total: count || 0,
    };
  }

  async createDiagram(data: any): Promise<MermaidDiagram> {
    const validation = validateMermaidCode(data.mermaid_code);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Basic validation
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Title is required and must be a string');
    }
    
    if (!data.mermaid_code || typeof data.mermaid_code !== 'string') {
      throw new Error('Mermaid code is required and must be a string');
    }

    const insertData: any = {
      title: data.title,
      description: data.description || null,
      mermaid_code: data.mermaid_code,
      created_by: null, // Anonymous creation
      workspace_id: data.workspace_id || null,
      is_public: data.is_public || false,
    };

    // Only add share_token if is_public is true
    if (data.is_public) {
      insertData.share_token = generateShareToken();
    }

    const { data: result, error } = await this.supabase
      .from('mermaid_diagrams')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create diagram: ${error.message}`);
    }

    return mapDatabaseToMermaidDiagramSimple(result);
  }

  async getDiagram(id: string): Promise<MermaidDiagram> {
    const { data, error } = await this.supabase
      .from('mermaid_diagrams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Diagram not found');
      }
      throw new Error(`Failed to get diagram: ${error.message}`);
    }

    return mapDatabaseToMermaidDiagram(data);
  }

  async getPublicDiagramByToken(token: string): Promise<MermaidDiagram> {
    const { data, error } = await this.supabase
      .from('mermaid_diagrams')
      .select('*')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Public diagram not found');
      }
      throw new Error(`Failed to get public diagram: ${error.message}`);
    }

    return mapDatabaseToMermaidDiagramSimple(data);
  }
}

export const mermaidPublicService = new MermaidPublicService();
