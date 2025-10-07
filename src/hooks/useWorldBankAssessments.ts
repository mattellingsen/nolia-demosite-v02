import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface WorldBankAssessment {
  id: string;
  projectId: string;
  organizationName: string;
  projectName?: string;
  assessmentType: 'AI_POWERED' | 'PATTERN_BASED' | 'MANUAL';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface WorldBankAssessmentsResponse {
  success: boolean;
  assessments: WorldBankAssessment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface UseWorldBankAssessmentsOptions {
  projectId?: string;
  limit?: number;
  offset?: number;
}

export const useWorldBankAssessments = (options: UseWorldBankAssessmentsOptions = {}): UseQueryResult<WorldBankAssessmentsResponse> => {
  const { projectId, limit = 50, offset = 0 } = options;

  const result = useQuery({
    queryKey: ['worldbank-assessments', projectId, limit, offset],
    queryFn: async (): Promise<WorldBankAssessmentsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (projectId) {
        params.append('projectId', projectId);
      }

      const url = `/api/worldbank-assessments?${params.toString()}`;
      console.log('🔄 useWorldBankAssessments: Starting fetch from:', url);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Ensure we're not using cache
          cache: 'no-store',
        });

        console.log('📡 useWorldBankAssessments: Response status:', response.status);
        console.log('📡 useWorldBankAssessments: Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ useWorldBankAssessments: HTTP Error:', response.status, response.statusText, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ useWorldBankAssessments: Raw response data:', data);
        console.log('✅ useWorldBankAssessments: Data structure valid:', {
          hasSuccess: !!data.success,
          hasAssessments: !!data.assessments,
          assessmentsCount: data.assessments?.length || 0,
          hasPagination: !!data.pagination,
        });

        // Validate response structure
        if (!data.success || !Array.isArray(data.assessments)) {
          console.error('❌ useWorldBankAssessments: Invalid response structure:', data);
          throw new Error('Invalid response structure from API');
        }

        return data;
      } catch (fetchError) {
        console.error('❌ useWorldBankAssessments: Fetch error:', fetchError);
        throw fetchError;
      }
    },
    staleTime: 0, // Always refetch fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      console.log(`🔄 useWorldBankAssessments: Retry attempt ${failureCount}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Add detailed logging for all state changes
    onError: (error) => {
      console.error('❌ useWorldBankAssessments: Query error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ useWorldBankAssessments: Query success:', data);
    },
    onSettled: (data, error) => {
      console.log('🏁 useWorldBankAssessments: Query settled:', { data: !!data, error: !!error });
    },
  });

  // Log every state change
  console.log('🔍 useWorldBankAssessments: Current state:', {
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    isSuccess: result.isSuccess,
    hasData: !!result.data,
    dataStructure: result.data ? {
      success: result.data.success,
      assessmentsCount: result.data.assessments?.length,
      paginationTotal: result.data.pagination?.total,
    } : null,
    error: result.error?.message,
    fetchStatus: result.fetchStatus,
    status: result.status,
  });

  return result;
};
