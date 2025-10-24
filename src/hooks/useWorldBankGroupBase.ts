import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface WorldBankGroupBase {
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

export interface CreateWorldBankGroupBaseData {
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

// Fetch all worldbankgroup bases
export const useWorldBankGroupBases = () => {
  return useQuery({
    queryKey: ['worldbankgroup-bases'],
    queryFn: async (): Promise<WorldBankGroupBase[]> => {
      const response = await fetch('/api/worldbankgroup-base');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch WorldBankGroup bases');
      }

      return data.bases || [];
    },
  });
};

// Create a new worldbankgroup base
export const useCreateWorldBankGroupBase = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (baseData: CreateWorldBankGroupBaseData): Promise<WorldBankGroupBase> => {
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

      const response = await fetch('/api/worldbankgroup-base', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create WorldBankGroup base');
      }

      return data.base;
    },
    onSuccess: (base) => {
      // Invalidate and refetch bases
      queryClient.invalidateQueries({ queryKey: ['worldbankgroup-bases'] });

      // Navigate to the base details page
      router.push(`/worldbankgroup-admin/base-created?baseId=${base.id}`);
    },
  });
};

// Delete a worldbankgroup base
export const useDeleteWorldBankGroupBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (baseId: string) => {
      const response = await fetch(`/api/worldbankgroup-base/${baseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete WorldBankGroup base');
      }

      return baseId;
    },
    onSuccess: () => {
      // Invalidate and refetch bases
      queryClient.invalidateQueries({ queryKey: ['worldbankgroup-bases'] });
    },
  });
};

// Get a single worldbankgroup base
export const useWorldBankGroupBase = (baseId: string | null) => {
  return useQuery({
    queryKey: ['worldbankgroup-base', baseId],
    queryFn: async (): Promise<WorldBankGroupBase> => {
      const response = await fetch(`/api/worldbankgroup-base/${baseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch WorldBankGroup base');
      }

      return data.base;
    },
    enabled: !!baseId,
  });
};

// Get job status for a worldbankgroup base (FAKE DEMO - always returns PROCESSING)
export const useWorldBankGroupBaseJobStatus = (baseId: string | null) => {
  return useQuery({
    queryKey: ['worldbankgroup-base-job-status', baseId],
    queryFn: async (): Promise<JobStatus> => {
      const response = await fetch(`/api/worldbankgroup-base/${baseId}/job-status`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status');
      }

      return data.brainBuilding;
    },
    enabled: !!baseId,
    refetchInterval: (query) => {
      // FAKE DEMO: Always keep polling since status never changes from PROCESSING
      // This shows the "20-30 minutes" message continuously
      const data = query.state.data as JobStatus | undefined;
      if (data && (data.status === 'PROCESSING' || data.status === 'PENDING')) {
        return 5000; // Poll every 5 seconds for demo
      }
      return false;
    },
  });
};

// Create worldbankgroup base asynchronously (FAKE DEMO)
export const useCreateWorldBankGroupBaseAsync = () => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const createBaseAsync = useCallback(async (baseData: any) => {
    setIsUploading(true);

    try {
      const response = await fetch('/api/worldbankgroup-base/create-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(baseData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create WorldBankGroup base');
      }

      // Navigate to the base created page
      router.push(`/worldbankgroup-admin/base-created?baseId=${data.base.id}`);

      return data;
    } catch (error) {
      console.error('[WorldBankGroup] Error creating base:', error);
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
