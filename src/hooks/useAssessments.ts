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

  const result = useQuery({
    queryKey: ['assessments', fundId, limit, offset],
    queryFn: async (): Promise<AssessmentsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (fundId) {
        params.append('fundId', fundId);
      }

      const url = `/api/assessments?${params.toString()}`;
      console.log('🔄 useAssessments: Starting fetch from:', url);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Ensure we're not using cache
          cache: 'no-store',
        });

        console.log('📡 useAssessments: Response status:', response.status);
        console.log('📡 useAssessments: Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ useAssessments: HTTP Error:', response.status, response.statusText, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ useAssessments: Raw response data:', data);
        console.log('✅ useAssessments: Data structure valid:', {
          hasSuccess: !!data.success,
          hasAssessments: !!data.assessments,
          assessmentsCount: data.assessments?.length || 0,
          hasPagination: !!data.pagination,
        });

        // Validate response structure
        if (!data.success || !Array.isArray(data.assessments)) {
          console.error('❌ useAssessments: Invalid response structure:', data);
          throw new Error('Invalid response structure from API');
        }

        return data;
      } catch (fetchError) {
        console.error('❌ useAssessments: Fetch error:', fetchError);
        throw fetchError;
      }
    },
    staleTime: 0, // Always refetch fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      console.log(`🔄 useAssessments: Retry attempt ${failureCount}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Add detailed logging for all state changes
    onError: (error) => {
      console.error('❌ useAssessments: Query error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ useAssessments: Query success:', data);
    },
    onSettled: (data, error) => {
      console.log('🏁 useAssessments: Query settled:', { data: !!data, error: !!error });
    },
  });

  // Log every state change
  console.log('🔍 useAssessments: Current state:', {
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