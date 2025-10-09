import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface WorldBankBase {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  documentsCount?: number;
  policiesAnalysis?: any;
  complianceDocsAnalysis?: any;
  standardTemplatesAnalysis?: any;
  governanceRulesAnalysis?: any;
}

export interface CreateWorldBankBaseData {
  baseName: string;
  description?: string;
  policies: File[];
  policiesAnalysis?: any;
  complianceDocs: File[];
  complianceDocsAnalysis?: any;
  standardTemplates: File[];
  standardTemplatesAnalysis?: any;
  governanceRules: File[];
  governanceRulesAnalysis?: any;
}

export interface JobStatus {
  id: string;
  baseId: string;
  baseName?: string;
  type: 'DOCUMENT_ANALYSIS' | 'RAG_PROCESSING';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  processedDocuments: number;
  totalDocuments: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  brainStatus?: {
    assembled: boolean;
    version: number;
    assembledAt?: string;
  };
}

export interface AsyncUploadResponse {
  success: boolean;
  jobId: string;
  uploads: Array<{
    documentId: string;
    filename: string;
    s3Key: string;
    presignedUrl: string;
    documentType: string;
  }>;
  message: string;
}

// Fetch all worldbank bases
export const useWorldBankBases = () => {
  return useQuery({
    queryKey: ['worldbank-bases'],
    queryFn: async (): Promise<WorldBankBase[]> => {
      const response = await fetch('/api/worldbank-base');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch worldbank bases');
      }

      return data.bases || [];
    },
  });
};

// Create a new worldbank base
export const useCreateWorldBankBase = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (baseData: CreateWorldBankBaseData): Promise<WorldBankBase> => {
      const formData = new FormData();

      // Add basic base info
      formData.append('name', baseData.baseName);
      if (baseData.description) {
        formData.append('description', baseData.description);
      }

      // Add policy files
      baseData.policies?.forEach((file: File) => {
        formData.append('policies', file);
      });

      // Add compliance docs
      baseData.complianceDocs?.forEach((file: File) => {
        formData.append('complianceDocs', file);
      });

      // Add standard templates
      baseData.standardTemplates?.forEach((file: File) => {
        formData.append('standardTemplates', file);
      });

      // Add governance rules
      baseData.governanceRules?.forEach((file: File) => {
        formData.append('governanceRules', file);
      });

      const response = await fetch('/api/worldbank-base', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create worldbank base');
      }

      return data.base;
    },
    onSuccess: (base) => {
      // Invalidate and refetch bases
      queryClient.invalidateQueries({ queryKey: ['worldbank-bases'] });

      // Navigate to the base details page
      router.push(`/worldbank-admin/base-created?baseId=${base.id}`);
    },
  });
};

// Delete a worldbank base
export const useDeleteWorldBankBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (baseId: string) => {
      const response = await fetch(`/api/worldbank-base/${baseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete worldbank base');
      }

      return baseId;
    },
    onSuccess: () => {
      // Invalidate and refetch bases
      queryClient.invalidateQueries({ queryKey: ['worldbank-bases'] });
    },
  });
};

// Get a single worldbank base
export const useWorldBankBase = (baseId: string | null) => {
  return useQuery({
    queryKey: ['worldbank-base', baseId],
    queryFn: async (): Promise<WorldBankBase> => {
      const response = await fetch(`/api/worldbank-base/${baseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch worldbank base');
      }

      return data.base;
    },
    enabled: !!baseId,
  });
};

// Get job status for a worldbank base
export const useWorldBankBaseJobStatus = (baseId: string | null) => {
  return useQuery({
    queryKey: ['worldbank-base-job-status', baseId],
    queryFn: async (): Promise<JobStatus> => {
      const response = await fetch(`/api/worldbank-base/${baseId}/status`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status');
      }

      return data.status;
    },
    enabled: !!baseId,
    refetchInterval: (query) => {
      // Only refetch if job is still processing
      const data = query.state.data as JobStatus | undefined;
      if (data && (data.status === 'PROCESSING' || data.status === 'PENDING')) {
        return 3000; // Poll every 3 seconds
      }
      return false; // Stop polling
    },
  });
};

// Create worldbank base asynchronously
export const useCreateWorldBankBaseAsync = () => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const createBaseAsync = useCallback(async (baseData: any) => {
    setIsUploading(true);

    try {
      const response = await fetch('/api/worldbank-base/create-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(baseData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create worldbank base');
      }

      // Navigate to the base created page
      router.push(`/worldbank-admin/base-created?baseId=${data.base.id}`);

      return data;
    } catch (error) {
      console.error('Error creating worldbank base:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  return {
    createBaseAsync,
    isUploading,
  };
};
