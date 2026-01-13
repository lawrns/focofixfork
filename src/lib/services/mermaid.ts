import { supabase as supabaseClient } from '@/lib/supabase-client';
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
  validateMermaidCode,
  generateShareToken
} from '@/lib/models/mermaid';

// Use untyped supabase client to avoid type instantiation depth issues
const untypedSupabase = supabaseClient as any;

// Simple mapping function without Zod validation
const mapDatabaseToMermaidDiagramSimple = (row: any): MermaidDiagram => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mermaid_code: row.mermaid_code,
    created_by: row.created_by,
    organization_id: row.organization_id,
    is_public: row.is_public,
    share_token: row.share_token,
    created_at: row.created_at,
    updated_at: row.updated_at,
    version: row.version,
  };
};

const mapDatabaseToMermaidDiagramVersionSimple = (row: any): MermaidDiagramVersion => {
  return {
    id: row.id,
    diagram_id: row.diagram_id,
    mermaid_code: row.mermaid_code,
    version_number: row.version_number,
    created_by: row.created_by,
    created_at: row.created_at,
    change_description: row.change_description,
  };
};

const mapDatabaseToMermaidDiagramShareSimple = (row: any): MermaidDiagramShare => {
  return {
    id: row.id,
    diagram_id: row.diagram_id,
    shared_with_user_id: row.shared_with_user_id,
    permission: row.permission,
    shared_by: row.shared_by,
    created_at: row.created_at,
  };
};

export class MermaidService {
  private supabase = untypedSupabase;

  // Diagram CRUD operations
  async createDiagram(data: CreateMermaidDiagramRequest): Promise<MermaidDiagram> {
    const validation = validateMermaidCode(data.mermaid_code);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Get current user (can be null for anonymous users)
    const { data: { user } } = await this.supabase.auth.getUser();

    const { data: result, error } = await this.supabase
      .from('mermaid_diagrams')
      .insert({
        title: data.title,
        description: data.description || null,
        mermaid_code: data.mermaid_code,
        created_by: user?.id || null,
        organization_id: data.organization_id || null,
        is_public: data.is_public || false,
        share_token: data.is_public ? generateShareToken() : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create diagram: ${error.message}`);
    }

    return mapDatabaseToMermaidDiagramSimple(result);
  }

  async getDiagram(id: string, shareToken?: string): Promise<MermaidDiagramWithVersions> {
    let query = this.supabase
      .from('mermaid_diagrams')
      .select(`
        *,
        versions:mermaid_diagram_versions(*),
        shares:mermaid_diagram_shares(*)
      `)
      .eq('id', id);

    // If share token is provided, check public access
    if (shareToken) {
      query = query.or(`is_public.eq.true,share_token.eq.${shareToken}`);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error(`Failed to get diagram: ${error.message}`);
    }

    return {
      ...mapDatabaseToMermaidDiagramSimple(data),
      versions: data.versions?.map(mapDatabaseToMermaidDiagramVersionSimple) || [],
      shares: data.shares?.map(mapDatabaseToMermaidDiagramShareSimple) || [],
    };
  }

  async updateDiagram(id: string, data: UpdateMermaidDiagramRequest): Promise<MermaidDiagram> {
    if (data.mermaid_code) {
      const validation = validateMermaidCode(data.mermaid_code);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    const updateData: any = { ...data };
    if (data.is_public !== undefined && data.share_token === undefined) {
      updateData.share_token = data.is_public ? generateShareToken() : null;
    }

    const { data: result, error } = await this.supabase
      .from('mermaid_diagrams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update diagram: ${error.message}`);
    }

    return mapDatabaseToMermaidDiagramSimple(result);
  }

  async deleteDiagram(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('mermaid_diagrams')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete diagram: ${error.message}`);
    }
  }

  async listDiagrams(options: {
    organizationId?: string;
    isPublic?: boolean;
    sharedWithMe?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ diagrams: MermaidDiagramListItem[]; total: number }> {
    // Temporarily bypass RLS for testing
    let query = this.supabase
      .from('mermaid_diagrams')
      .select('*', { count: 'exact', head: false })
      .eq('is_public', true); // Only show public diagrams for now

    // Apply filters
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    if (options.isPublic !== undefined) {
      query = query.eq('is_public', options.isPublic);
    }

    if (options.sharedWithMe) {
      const { data: sharedDiagrams } = await this.supabase
        .from('mermaid_diagram_shares')
        .select('diagram_id')
        .eq('shared_with_user_id', (await this.supabase.auth.getUser()).data.user?.id);
      
      const diagramIds = sharedDiagrams?.map(d => d.diagram_id) || [];
      if (diagramIds.length > 0) {
        query = query.in('id', diagramIds);
      }
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
        organization_id: baseDiagram.organization_id,
        owner_name: 'Loading...', // Would be fetched separately
        organization_name: 'Loading...', // Would be fetched separately
        can_edit: true, // This would be determined by actual permissions
        can_delete: true, // This would be determined by actual permissions
        can_share: true, // This would be determined by actual permissions
      };
    });

    return {
      diagrams,
      total: count || 0,
    };
  }

  // Sharing operations
  async shareDiagram(id: string, data: ShareMermaidDiagramRequest): Promise<MermaidDiagram> {
    const updateData: any = {};

    if (data.is_public !== undefined) {
      updateData.is_public = data.is_public;
      updateData.share_token = data.is_public ? generateShareToken() : null;
    }

    if (data.shared_with_user_id && data.permission) {
      // Create specific user share
      const { error: shareError } = await this.supabase
        .from('mermaid_diagram_shares')
        .upsert({
          diagram_id: id,
          shared_with_user_id: data.shared_with_user_id,
          permission: data.permission,
          shared_by: (await this.supabase.auth.getUser()).data.user?.id,
        });

      if (shareError) {
        throw new Error(`Failed to share diagram: ${shareError.message}`);
      }
    }

    if (Object.keys(updateData).length > 0) {
      return this.updateDiagram(id, updateData);
    }

    return this.getDiagram(id);
  }

  async revokeShare(diagramId: string, userId?: string): Promise<void> {
    let query = this.supabase
      .from('mermaid_diagram_shares')
      .delete()
      .eq('diagram_id', diagramId);

    if (userId) {
      query = query.eq('shared_with_user_id', userId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to revoke share: ${error.message}`);
    }
  }

  // Version operations
  async getVersions(diagramId: string): Promise<MermaidDiagramVersion[]> {
    const { data, error } = await this.supabase
      .from('mermaid_diagram_versions')
      .select('*')
      .eq('diagram_id', diagramId)
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`Failed to get versions: ${error.message}`);
    }

    return data.map(mapDatabaseToMermaidDiagramVersionSimple);
  }

  async createVersion(diagramId: string, data: CreateVersionRequest): Promise<MermaidDiagramVersion> {
    const validation = validateMermaidCode(data.mermaid_code);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Get the latest version number
    const { data: latestVersion } = await this.supabase
      .from('mermaid_diagram_versions')
      .select('version_number')
      .eq('diagram_id', diagramId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVersion?.version_number || 0) + 1;

    const { data: result, error } = await this.supabase
      .from('mermaid_diagram_versions')
      .insert({
        diagram_id: diagramId,
        mermaid_code: data.mermaid_code,
        version_number: nextVersion,
        change_description: data.change_description,
        created_by: (await this.supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }

    // Update the main diagram with new version and code
    await this.updateDiagram(diagramId, {
      mermaid_code: data.mermaid_code,
    });

    return mapDatabaseToMermaidDiagramVersionSimple(result);
  }

  async restoreVersion(diagramId: string, versionNumber: number): Promise<MermaidDiagram> {
    const { data: version, error } = await this.supabase
      .from('mermaid_diagram_versions')
      .select('*')
      .eq('diagram_id', diagramId)
      .eq('version_number', versionNumber)
      .single();

    if (error || !version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    return this.updateDiagram(diagramId, {
      mermaid_code: version.mermaid_code,
    });
  }

  // Export operations
  async exportDiagram(id: string, options: ExportMermaidDiagramRequest): Promise<Blob> {
    const diagram = await this.getDiagram(id);

    try {
      switch (options.format) {
        case 'svg':
          return this.exportAsSVG(diagram.mermaid_code, options);
        case 'png':
          return this.exportAsPNG(diagram.mermaid_code, options);
        case 'pdf':
          return this.exportAsPDF(diagram.mermaid_code, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      throw new Error(`Failed to export diagram: ${error}`);
    }
  }

  private async exportAsSVG(mermaidCode: string, options: ExportMermaidDiagramRequest): Promise<Blob> {
    // Client-side SVG export using mermaid
    const { svg } = await this.renderMermaidDiagram(mermaidCode, 'svg');
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  private async exportAsPNG(mermaidCode: string, options: ExportMermaidDiagramRequest): Promise<Blob> {
    // For PNG export, we'll need to use a server-side approach or canvas
    // For now, return a placeholder
    throw new Error('PNG export not yet implemented');
  }

  private async exportAsPDF(mermaidCode: string, options: ExportMermaidDiagramRequest): Promise<Blob> {
    // For PDF export, we'll need puppeteer or similar
    // For now, return a placeholder
    throw new Error('PDF export not yet implemented');
  }

  private async renderMermaidDiagram(code: string, format: 'svg'): Promise<{ svg: string }> {
    // This would use mermaid.js to render the diagram
    // For now, return a placeholder
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><text x="400" y="300" text-anchor="middle">Mermaid Diagram</text></svg>`
    };
  }

  // Public access operations
  async getPublicDiagramByToken(shareToken: string): Promise<MermaidDiagram> {
    const { data, error } = await this.supabase
      .from('mermaid_diagrams')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .single();

    if (error) {
      throw new Error(`Public diagram not found: ${error.message}`);
    }

    return mapDatabaseToMermaidDiagramSimple(data);
  }
}

// Export singleton instance
export const mermaidService = new MermaidService();
