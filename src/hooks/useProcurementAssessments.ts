import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface ProcurementAssessment {
  id: string;
  tenderId: string;
  organizationName: string;
  projectName?: string;
  assessmentType: 'AI_POWERED' | 'PATTERN_BASED' | 'MANUAL';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
  createdAt: string;
  updatedAt: string;
  tender: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface ProcurementAssessmentsResponse {
  success: boolean;
  assessments: ProcurementAssessment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface UseProcurementAssessmentsOptions {
  tenderId?: string;
  limit?: number;
  offset?: number;
}

export const useProcurementAssessments = (options: UseProcurementAssessmentsOptions = {}): UseQueryResult<ProcurementAssessmentsResponse> => {
  const { tenderId, limit = 50, offset = 0 } = options;

  const result = useQuery({
    queryKey: ['procurement-assessments', tenderId, limit, offset],
    queryFn: async (): Promise<ProcurementAssessmentsResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (tenderId) {
        params.append('tenderId', tenderId);
      }

      const url = `/api/procurement-assessments?${params.toString()}`;
      console.log('🔄 useProcurementAssessments: Starting fetch from:', url);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Ensure we're not using cache
          cache: 'no-store',
        });

        console.log('📡 useProcurementAssessments: Response status:', response.status);
        console.log('📡 useProcurementAssessments: Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ useProcurementAssessments: HTTP Error:', response.status, response.statusText, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ useProcurementAssessments: Raw response data:', data);
        console.log('✅ useProcurementAssessments: Data structure valid:', {
          hasSuccess: !!data.success,
          hasAssessments: !!data.assessments,
          assessmentsCount: data.assessments?.length || 0,
          hasPagination: !!data.pagination,
        });

        // Validate response structure
        if (!data.success || !Array.isArray(data.assessments)) {
          console.error('❌ useProcurementAssessments: Invalid response structure:', data);
          throw new Error('Invalid response structure from API');
        }

        return data;
      } catch (fetchError) {
        console.error('❌ useProcurementAssessments: Fetch error:', fetchError);
        throw fetchError;
      }
    },
    staleTime: 0, // Always refetch fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      console.log(`🔄 useProcurementAssessments: Retry attempt ${failureCount}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Add detailed logging for all state changes
    onError: (error) => {
      console.error('❌ useProcurementAssessments: Query error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ useProcurementAssessments: Query success:', data);
    },
    onSettled: (data, error) => {
      console.log('🏁 useProcurementAssessments: Query settled:', { data: !!data, error: !!error });
    },
  });

  // Log every state change
  console.log('🔍 useProcurementAssessments: Current state:', {
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