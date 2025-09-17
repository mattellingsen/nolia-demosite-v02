import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface Fund {
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

export interface CreateFundData {
  fundName: string;
  description?: string;
  applicationForm: File;
  applicationFormAnalysis?: any;
  selectionCriteria: File[];
  selectionCriteriaAnalysis?: any;
  goodExamples: File[];
  goodExamplesAnalysis?: any;
}

export interface JobStatus {
  id: string;
  fundId: string;
  fundName?: string;
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

// Fetch all funds
export const useFunds = () => {
  return useQuery({
    queryKey: ['funds'],
    queryFn: async (): Promise<Fund[]> => {
      const response = await fetch('/api/funds');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch funds');
      }
      
      return data.funds;
    },
  });
};

// Create a new fund
export const useCreateFund = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (fundData: CreateFundData): Promise<Fund> => {
      const formData = new FormData();
      
      // Add basic fund info
      formData.append('name', fundData.fundName);
      if (fundData.description) {
        formData.append('description', fundData.description);
      }
      
      // Add application form
      if (fundData.applicationForm) {
        formData.append('applicationForm', fundData.applicationForm);
      }
      
      // Add selection criteria files
      fundData.selectionCriteria.forEach((file, index) => {
        formData.append(`selectionCriteria[${index}]`, file);
      });
      
      // Add good examples files
      fundData.goodExamples.forEach((file, index) => {
        formData.append(`goodExamples[${index}]`, file);
      });
      
      // STRIPPED: Analysis data not sent to backend - backend will re-analyze uploaded files
      // This eliminates payload size issues while preserving user feedback experience
      // Backend analysis will be authoritative for the RAG system

      const response = await fetch('/api/funds-direct-sequential', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create fund');
      }
      
      return data.fund;
    },
    onSuccess: (newFund) => {
      // Update the funds list in the cache
      queryClient.setQueryData(['funds'], (old: Fund[] = []) => [...old, newFund]);
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      
      // Redirect to setup dashboard
      router.push('/funding/setup');
    },
    onError: (error: Error) => {
      console.error('Fund creation failed:', error);
      // Error will be handled by the component using this hook
    }
  });
};

// Delete a fund
export const useDeleteFund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fundId: string): Promise<void> => {
      const response = await fetch(`/api/funds/${fundId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete fund');
      }
    },
    onSuccess: (_, deletedFundId) => {
      // Remove the fund from the cache
      queryClient.setQueryData(['funds'], (old: Fund[] = []) => 
        old.filter(fund => fund.id !== deletedFundId)
      );
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['funds'] });
    },
  });
};

// Update fund status
export const useUpdateFundStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fundId, status }: { fundId: string; status: Fund['status'] }): Promise<Fund> => {
      const response = await fetch(`/api/funds/${fundId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update fund status');
      }
      
      return data.fund;
    },
    onSuccess: (updatedFund) => {
      // Update the fund in the cache
      queryClient.setQueryData(['funds'], (old: Fund[] = []) => 
        old.map(fund => fund.id === updatedFund.id ? updatedFund : fund)
      );
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['funds'] });
    },
  });
};

// New async fund creation workflow
export const useCreateFundAsync = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (fundData: CreateFundData): Promise<{ fund: Fund; jobId: string }> => {
      // Step 1: Create fund (basic info only)
      const fundResponse = await fetch('/api/funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fundData.fundName,
          description: fundData.description,
        }),
      });

      if (!fundResponse.ok) {
        const data = await fundResponse.json();
        throw new Error(data.error || 'Failed to create fund');
      }

      const { fund } = await fundResponse.json();

      // Step 2: Prepare documents for async upload
      const documents = [];
      
      if (fundData.applicationForm) {
        documents.push({
          filename: fundData.applicationForm.name,
          mimeType: fundData.applicationForm.type,
          fileSize: fundData.applicationForm.size,
          documentType: 'APPLICATION_FORM',
          file: fundData.applicationForm,
        });
      }

      fundData.selectionCriteria.forEach((file) => {
        documents.push({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: 'SELECTION_CRITERIA',
          file,
        });
      });

      fundData.goodExamples.forEach((file) => {
        documents.push({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: 'GOOD_EXAMPLES',
          file,
        });
      });

      // Step 3: Set up async upload
      const uploadResponse = await fetch('/api/documents/upload-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fundId: fund.id,
          documents: documents.map(({ file, ...doc }) => doc), // Remove file object for JSON
        }),
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || 'Failed to setup async upload');
      }

      const uploadData: AsyncUploadResponse = await uploadResponse.json();

      // Step 4: Upload files to S3 using presigned URLs
      await Promise.all(
        uploadData.uploads.map(async (upload, index) => {
          const file = documents[index].file;
          
          const uploadToS3 = await fetch(upload.presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });

          if (!uploadToS3.ok) {
            throw new Error(`Failed to upload ${file.name} to S3`);
          }
        })
      );

      return { fund, jobId: uploadData.jobId };
    },
    onSuccess: ({ fund }) => {
      // Update the funds list in the cache
      queryClient.setQueryData(['funds'], (old: Fund[] = []) => [...old, fund]);
      queryClient.invalidateQueries({ queryKey: ['funds'] });
    },
    onError: (error: Error) => {
      console.error('Async fund creation failed:', error);
    }
  });
};

// Hook to track job progress
export const useJobStatus = (jobId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery({
    queryKey: ['job-status', jobId],
    queryFn: async (): Promise<JobStatus> => {
      if (!jobId) throw new Error('Job ID is required');
      
      const response = await fetch(`/api/jobs/${jobId}/status`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status');
      }
      
      return data.job;
    },
    enabled: !!jobId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval || (jobId ? 2000 : false), // Poll every 2 seconds
    refetchIntervalInBackground: false,
  });
};

// Hook to manually trigger processing of pending jobs (for development)
export const useProcessJobs = () => {
  return useMutation({
    mutationFn: async (options?: { jobId?: string; force?: boolean }) => {
      const response = await fetch('/api/jobs/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || { force: true }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process jobs');
      }
      
      return data;
    },
  });
};