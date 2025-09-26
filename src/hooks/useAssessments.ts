import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface Assessment {
  id: string;
  fundId: string;
  organizationName: string;
  projectName?: string;
  assessmentType: 'AI_POWERED' | 'PATTERN_BASED' | 'MANUAL';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
  createdAt: string;
  updatedAt: string;
  fund: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface AssessmentsResponse {
  success: boolean;
  assessments: Assessment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface UseAssessmentsOptions {
  fundId?: string;
  limit?: number;
  offset?: number;
}

export const useAssessments = (options: UseAssessmentsOptions = {}): UseQueryResult<AssessmentsResponse> => {
  const { fundId, limit = 50, offset = 0 } = options;

  return useQuery({
    queryKey: ['assessments', fundId, limit, offset],
    queryFn: async (): Promise<AssessmentsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (fundId) {
        params.append('fundId', fundId);
      }

      console.log('useAssessments: Fetching from:', `/api/assessments?${params.toString()}`);
      const response = await fetch(`/api/assessments?${params.toString()}`);

      if (!response.ok) {
        console.error('useAssessments: Failed to fetch:', response.status, response.statusText);
        throw new Error(`Failed to fetch assessments: ${response.status}`);
      }

      const data = await response.json();
      console.log('useAssessments: Successfully fetched:', data);
      return data;
    },
    staleTime: 0, // Always refetch fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
  });
};