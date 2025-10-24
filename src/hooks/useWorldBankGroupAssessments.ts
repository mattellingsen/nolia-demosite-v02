import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

export interface WorldBankGroupAssessment {
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
}

export interface WorldBankGroupAssessmentsResponse {
  success: boolean;
  assessments: WorldBankGroupAssessment[];
  fakeDemo?: boolean;
}

interface UseWorldBankGroupAssessmentsOptions {
  projectId?: string;
}

// Fetch assessments for a worldbankgroup project
export const useWorldBankGroupAssessments = (options: UseWorldBankGroupAssessmentsOptions = {}): UseQueryResult<WorldBankGroupAssessmentsResponse> => {
  const { projectId } = options;

  const result = useQuery({
    queryKey: ['worldbankgroup-assessments', projectId],
    queryFn: async (): Promise<WorldBankGroupAssessmentsResponse> => {
      const params = new URLSearchParams();

      if (projectId) {
        params.append('projectId', projectId);
      }

      const url = `/api/worldbankgroup-assessments?${params.toString()}`;
      console.log('🔄 [WorldBankGroup] useWorldBankGroupAssessments: Starting fetch from:', url);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        console.log('📡 [WorldBankGroup] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [WorldBankGroup] HTTP Error:', response.status, response.statusText, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ [WorldBankGroup] Raw response data:', data);

        // Validate response structure
        if (!data.success || !Array.isArray(data.assessments)) {
          console.error('❌ [WorldBankGroup] Invalid response structure:', data);
          throw new Error('Invalid response structure from API');
        }

        return data;
      } catch (fetchError) {
        console.error('❌ [WorldBankGroup] Fetch error:', fetchError);
        throw fetchError;
      }
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      console.log(`🔄 [WorldBankGroup] Retry attempt ${failureCount}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('❌ [WorldBankGroup] Query error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ [WorldBankGroup] Query success:', data);
    },
  });

  return result;
};

// Get a single worldbankgroup assessment
export const useWorldBankGroupAssessment = (assessmentId: string | null) => {
  return useQuery({
    queryKey: ['worldbankgroup-assessment', assessmentId],
    queryFn: async (): Promise<WorldBankGroupAssessment> => {
      const response = await fetch(`/api/worldbankgroup-assessments/${assessmentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch WorldBankGroup assessment');
      }

      return data.assessment;
    },
    enabled: !!assessmentId,
  });
};

// Create worldbankgroup assessment with hardcoded results (FAKE DEMO)
export const useCreateWorldBankGroupAssessment = () => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const createAssessment = useCallback(async (assessmentData: {
    projectId: string;
    organizationName: string;
    evaluationReportFile: {
      filename: string;
      mimeType: string;
      fileSize: number;
      content: string; // base64
    };
  }) => {
    setIsProcessing(true);

    try {
      console.log('🎭 [WorldBankGroup FAKE DEMO] Creating assessment with hardcoded output');

      const response = await fetch('/api/worldbankgroup-assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create WorldBankGroup assessment');
      }

      console.log('✅ [WorldBankGroup FAKE DEMO] Assessment created with hardcoded results:', data.assessment.id);

      // Invalidate assessments query to refetch with new assessment
      queryClient.invalidateQueries({ queryKey: ['worldbankgroup-assessments', assessmentData.projectId] });

      return data.assessment;
    } catch (error) {
      console.error('[WorldBankGroup] Error creating assessment:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  return {
    createAssessment,
    isProcessing,
  };
};

// Delete a worldbankgroup assessment
export const useDeleteWorldBankGroupAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string): Promise<void> => {
      const response = await fetch(`/api/worldbankgroup-assessments/${assessmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete WorldBankGroup assessment');
      }
    },
    onSuccess: () => {
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['worldbankgroup-assessments'] });
    },
  });
};
