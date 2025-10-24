import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface WorldBankGroupProject {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  documentsCount?: number;
  applicationFormAnalysis?: any;
  selectionCriteriaAnalysis?: any;
  goodExamplesAnalysis?: any;
}

export interface JobStatus {
  id: string;
  projectId: string;
  projectName?: string;
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
}

// Fetch all worldbankgroup projects
export const useWorldBankGroupProjects = () => {
  return useQuery({
    queryKey: ['worldbankgroup-projects'],
    queryFn: async (): Promise<WorldBankGroupProject[]> => {
      const response = await fetch('/api/worldbankgroup-projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch WorldBankGroup projects');
      }

      return data.projects || [];
    },
  });
};

// Delete a worldbankgroup project
export const useDeleteWorldBankGroupProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const response = await fetch(`/api/worldbankgroup-projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete WorldBankGroup project');
      }
    },
    onSuccess: (_, deletedProjectId) => {
      // Remove the project from the cache
      queryClient.setQueryData(['worldbankgroup-projects'], (old: WorldBankGroupProject[] = []) =>
        old.filter(project => project.id !== deletedProjectId)
      );

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['worldbankgroup-projects'] });
    },
  });
};

// Get a single worldbankgroup project
export const useWorldBankGroupProject = (projectId: string | null) => {
  return useQuery({
    queryKey: ['worldbankgroup-project', projectId],
    queryFn: async (): Promise<WorldBankGroupProject> => {
      const response = await fetch(`/api/worldbankgroup-projects/${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch WorldBankGroup project');
      }

      return data.project;
    },
    enabled: !!projectId,
  });
};

// Get job status for a worldbankgroup project (FAKE DEMO - always returns PROCESSING)
export const useWorldBankGroupProjectJobStatus = (projectId: string | null) => {
  return useQuery({
    queryKey: ['worldbankgroup-project-job-status', projectId],
    queryFn: async (): Promise<JobStatus> => {
      const response = await fetch(`/api/worldbankgroup-projects/${projectId}/job-status`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status');
      }

      return data.brainBuilding;
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      // FAKE DEMO: Always keep polling since status never changes from PROCESSING
      const data = query.state.data as JobStatus | undefined;
      if (data && (data.status === 'PROCESSING' || data.status === 'PENDING')) {
        return 5000; // Poll every 5 seconds for demo
      }
      return false;
    },
  });
};

// Create worldbankgroup project asynchronously (FAKE DEMO)
export const useCreateWorldBankGroupProjectAsync = () => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const createProjectAsync = useCallback(async (projectData: any) => {
    setIsUploading(true);

    try {
      const response = await fetch('/api/worldbankgroup-projects/create-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create WorldBankGroup project');
      }

      // Navigate to the project created page
      router.push(`/worldbankgroup/project-created?projectId=${data.project.id}`);

      return data;
    } catch (error) {
      console.error('[WorldBankGroup] Error creating project:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  return {
    createProjectAsync,
    isUploading,
  };
};
