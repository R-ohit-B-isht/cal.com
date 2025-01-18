import axios from 'axios';
import { Task } from '../types/Task';

const API_BASE_URL = 'http://localhost:5000';

export interface Relationship {
  _id?: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: 'blocks' | 'blocked-by' | 'relates-to' | 'duplicates' | 'parent-of' | 'child-of';
  createdAt?: string;
  updatedAt?: string;
}

export interface MindMapNode {
  _id: string;
  label: string;
  position: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

export interface MindMapEdge {
  _id: string;
  sourceId: string;
  targetId: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  getTasks: async (filters?: {
    status?: string;
    integration?: string;
    priority?: string;
    search?: string;
    createdAt?: { from: Date; to: Date };
    updatedAt?: { from: Date; to: Date };
    hasBlockingTasks?: boolean;
    isBlockingOthers?: boolean;
    blockedOnly?: boolean;
    sourceId?: string;
    issueKey?: string;
    assignee?: string;
    labels?: string[];
    advancedSearch?: {
      title?: string;
      description?: string;
      sourceUrl?: string;
    };
  }): Promise<Task[]> => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters || {}).filter(([_, value]) => {
        if (value === undefined || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && value !== null) {
          const dateRange = value as { from?: Date; to?: Date };
          if ('from' in value || 'to' in value) {
            return dateRange.from || dateRange.to;
          }
          return Object.values(value).some(v => v !== undefined && v !== '');
        }
        return true;
      })
    );

    // Format date ranges for API
    if (cleanFilters.createdAt) {
      const range = cleanFilters.createdAt as { from?: Date; to?: Date };
      if (range.from) cleanFilters.createdAtFrom = range.from.toISOString();
      if (range.to) cleanFilters.createdAtTo = range.to.toISOString();
      delete cleanFilters.createdAt;
    }
    if (cleanFilters.updatedAt) {
      const range = cleanFilters.updatedAt as { from?: Date; to?: Date };
      if (range.from) cleanFilters.updatedAtFrom = range.from.toISOString();
      if (range.to) cleanFilters.updatedAtTo = range.to.toISOString();
      delete cleanFilters.updatedAt;
    }

    // Flatten advanced search params
    if (cleanFilters.advancedSearch) {
      Object.entries(cleanFilters.advancedSearch).forEach(([key, value]) => {
        if (value) cleanFilters[`advanced_${key}`] = value;
      });
      delete cleanFilters.advancedSearch;
    }

    const response = await axios.get(`${API_BASE_URL}/tasks`, { params: cleanFilters });
    return response.data;
  },

  // Relationship endpoints
  getRelationships: async (filters?: { sourceTaskId?: string; targetTaskId?: string; type?: string }): Promise<Relationship[]> => {
    const response = await axios.get(`${API_BASE_URL}/relationships`, { params: filters });
    return response.data;
  },

  createRelationship: async (relationship: Omit<Relationship, '_id' | 'createdAt' | 'updatedAt'>): Promise<{ _id: string }> => {
    const response = await axios.post(`${API_BASE_URL}/relationships`, relationship);
    return response.data;
  },

  updateRelationship: async (relationshipId: string, type: Relationship['type']): Promise<void> => {
    await axios.put(`${API_BASE_URL}/relationships/${relationshipId}`, { type });
  },

  deleteRelationship: async (relationshipId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/relationships/${relationshipId}`);
  },

  getTask: async (taskId: string): Promise<Task> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}`);
    return response.data;
  },

  updateTaskStatus: async (taskId: string, status: Task['status']): Promise<void> => {
    await axios.patch(`${API_BASE_URL}/tasks/${taskId}`, { status });
  },

  // Mind Map endpoints
  getMindMapNodes: async (): Promise<MindMapNode[]> => {
    const response = await axios.get(`${API_BASE_URL}/mindmap/nodes`);
    return response.data;
  },

  createMindMapNode: async (node: { label: string; position: { x: number; y: number } }): Promise<{ _id: string }> => {
    const response = await axios.post(`${API_BASE_URL}/mindmap/nodes`, node);
    return response.data;
  },

  deleteMindMapNode: async (nodeId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/mindmap/nodes/${nodeId}`);
  },

  getMindMapEdges: async (): Promise<MindMapEdge[]> => {
    const response = await axios.get(`${API_BASE_URL}/mindmap/edges`);
    return response.data;
  },

  createMindMapEdge: async (edge: { sourceId: string; targetId: string }): Promise<{ _id: string }> => {
    const response = await axios.post(`${API_BASE_URL}/mindmap/edges`, edge);
    return response.data;
  },

  deleteMindMapEdge: async (edgeId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/mindmap/edges/${edgeId}`);
  }
};
