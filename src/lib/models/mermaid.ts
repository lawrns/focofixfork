import { z } from 'zod';

// Database schema types
export const MermaidDiagramSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  mermaid_code: z.string().min(1, 'Mermaid code is required'),
  created_by: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  is_public: z.boolean().default(false),
  share_token: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().positive().default(1),
});

export const MermaidDiagramVersionSchema = z.object({
  id: z.string().uuid(),
  diagram_id: z.string().uuid(),
  mermaid_code: z.string().min(1, 'Mermaid code is required'),
  version_number: z.number().int().positive(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  change_description: z.string().optional(),
});

export const MermaidDiagramShareSchema = z.object({
  id: z.string().uuid(),
  diagram_id: z.string().uuid(),
  shared_with_user_id: z.string().uuid().nullable(),
  permission: z.enum(['view', 'edit']),
  shared_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});

// API request/response types
export const CreateMermaidDiagramRequestSchema = MermaidDiagramSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  version: true,
});

export const UpdateMermaidDiagramRequestSchema = MermaidDiagramSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  version: true,
}).partial();

export const ShareMermaidDiagramRequestSchema = z.object({
  is_public: z.boolean().optional(),
  shared_with_user_id: z.string().uuid().optional(),
  permission: z.enum(['view', 'edit']).optional(),
});

export const CreateVersionRequestSchema = z.object({
  mermaid_code: z.string().min(1, 'Mermaid code is required'),
  change_description: z.string().optional(),
});

export const ExportMermaidDiagramRequestSchema = z.object({
  format: z.enum(['png', 'svg', 'pdf']),
});

// Export types
export type MermaidDiagram = z.infer<typeof MermaidDiagramSchema>;
export type MermaidDiagramVersion = z.infer<typeof MermaidDiagramVersionSchema>;
export type MermaidDiagramShare = z.infer<typeof MermaidDiagramShareSchema>;
export type CreateMermaidDiagramRequest = z.infer<typeof CreateMermaidDiagramRequestSchema>;
export type UpdateMermaidDiagramRequest = z.infer<typeof UpdateMermaidDiagramRequestSchema>;
export type ShareMermaidDiagramRequest = z.infer<typeof ShareMermaidDiagramRequestSchema>;
export type CreateVersionRequest = z.infer<typeof CreateVersionRequestSchema>;
export type ExportMermaidDiagramRequest = z.infer<typeof ExportMermaidDiagramRequestSchema>;

// Helper types for UI
export interface MermaidDiagramListItem {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
  version: number;
  created_by?: string;
  organization_id?: string;
  owner_name?: string;
  organization_name?: string;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
}

export interface MermaidDiagramWithVersions extends MermaidDiagram {
  versions: MermaidDiagramVersion[];
  shares: MermaidDiagramShare[];
}

export interface MermaidExportOptions {
  format: 'png' | 'svg' | 'pdf';
  width?: number;
  height?: number;
  backgroundColor?: string;
  theme?: 'light' | 'dark' | 'forest' | 'neutral';
}

// Database mapping functions
export const mapDatabaseToMermaidDiagram = (row: any): MermaidDiagram => {
  return MermaidDiagramSchema.parse({
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
  });
};

export const mapDatabaseToMermaidDiagramVersion = (row: any): MermaidDiagramVersion => {
  return MermaidDiagramVersionSchema.parse({
    id: row.id,
    diagram_id: row.diagram_id,
    mermaid_code: row.mermaid_code,
    version_number: row.version_number,
    created_by: row.created_by,
    created_at: row.created_at,
    change_description: row.change_description,
  });
};

export const mapDatabaseToMermaidDiagramShare = (row: any): MermaidDiagramShare => {
  return MermaidDiagramShareSchema.parse({
    id: row.id,
    diagram_id: row.diagram_id,
    shared_with_user_id: row.shared_with_user_id,
    permission: row.permission,
    shared_by: row.shared_by,
    created_at: row.created_at,
  });
};

// Validation helpers
export const validateMermaidCode = (code: string): { isValid: boolean; error?: string } => {
  try {
    // Basic validation - check if it's not empty and has some mermaid-like content
    if (!code || code.trim().length === 0) {
      return { isValid: false, error: 'Mermaid code cannot be empty' };
    }

    // Check for common mermaid diagram types
    const validKeywords = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 
      'quadrantChart', 'requirementDiagram', 'gitgraph', 'mindmap',
      'timeline', 'zenuml', 'sankey', 'block', 'architecture',
      'c4', 'packet', 'circuit', 'wireframe'
    ];

    const hasValidKeyword = validKeywords.some(keyword => 
      code.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasValidKeyword) {
      return { 
        isValid: false, 
        error: 'Invalid mermaid syntax. Must start with a valid diagram type (graph, flowchart, sequenceDiagram, etc.)' 
      };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid mermaid syntax' };
  }
};

// Generate share token
export const generateShareToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};
