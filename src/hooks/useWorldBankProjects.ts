import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export interface WorldbankProject {
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

// Fetch all worldbank projects
export const useWorldbankProjects = () => {
  return useQuery({
    queryKey: ['worldbank-projects'],
    queryFn: async (): Promise<WorldbankProject[]> => {
      const response = await fetch('/api/worldbank-projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch worldbank projects');
      }

      return data.projects;
    },
  });
};

// Delete a worldbank project
export const useDeleteWorldbankProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const response = await fetch(`/api/worldbank-projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete worldbank project');
      }
    },
    onSuccess: (_, deletedProjectId) => {
      // Remove the project from the cache
      queryClient.setQueryData(['worldbank-projects'], (old: WorldbankProject[] = []) =>
        old.filter(project => project.id !== deletedProjectId)
      );

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['worldbank-projects'] });
    },
  });
};
