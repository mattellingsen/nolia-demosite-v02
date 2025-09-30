import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface ProcurementBase {
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

export interface CreateProcurementBaseData {
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

// Fetch all procurement bases
export const useProcurementBases = () => {
  return useQuery({
    queryKey: ['procurement-bases'],
    queryFn: async (): Promise<ProcurementBase[]> => {
      const response = await fetch('/api/procurement-base');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch procurement bases');
      }

      return data.bases || [];
    },
  });
};

// Create a new procurement base
export const useCreateProcurementBase = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (baseData: CreateProcurementBaseData): Promise<ProcurementBase> => {
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

      const response = await fetch('/api/procurement-base', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create procurement base');
      }

      return data.base;
    },
    onSuccess: (base) => {
      // Invalidate and refetch bases
      queryClient.invalidateQueries({ queryKey: ['procurement-bases'] });

      // Navigate to the base details page
      router.push(`/procurement-admin/base-created?baseId=${base.id}`);
    },
  });
};

// Delete a procurement base
export const useDeleteProcurementBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (baseId: string) => {
      const response = await fetch(`/api/procurement-base/${baseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete procurement base');
      }

      return baseId;
    },
    onSuccess: () => {
      // Invalidate and refetch bases
      queryClient.invalidateQueries({ queryKey: ['procurement-bases'] });
    },
  });
};

// Get a single procurement base
export const useProcurementBase = (baseId: string | null) => {
  return useQuery({
    queryKey: ['procurement-base', baseId],
    queryFn: async (): Promise<ProcurementBase> => {
      const response = await fetch(`/api/procurement-base/${baseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch procurement base');
      }

      return data.base;
    },
    enabled: !!baseId,
  });
};

// Get job status for a procurement base
export const useProcurementBaseJobStatus = (baseId: string | null) => {
  return useQuery({
    queryKey: ['procurement-base-job-status', baseId],
    queryFn: async (): Promise<JobStatus> => {
      const response = await fetch(`/api/procurement-base/${baseId}/status`);
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

// Create procurement base asynchronously
export const useCreateProcurementBaseAsync = () => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const createBaseAsync = useCallback(async (baseData: any) => {
    setIsUploading(true);

    try {
      const response = await fetch('/api/procurement-base/create-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(baseData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create procurement base');
      }

      // Navigate to the base created page
      router.push(`/procurement-admin/base-created?baseId=${data.base.id}`);

      return data;
    } catch (error) {
      console.error('Error creating procurement base:', error);
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