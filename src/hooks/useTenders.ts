import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface Tender {
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

export interface CreateTenderData {
  tenderName: string;
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
  tenderId: string;
  tenderName?: string;
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

// Fetch all tenders
export const useTenders = () => {
  return useQuery({
    queryKey: ['tenders'],
    queryFn: async (): Promise<Tender[]> => {
      const response = await fetch('/api/tenders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tenders');
      }

      return data.tenders;
    },
  });
};

// Create a new tender
export const useCreateTender = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (tenderData: CreateTenderData): Promise<Tender> => {
      const formData = new FormData();

      // Add basic tender info
      formData.append('name', tenderData.tenderName);
      if (tenderData.description) {
        formData.append('description', tenderData.description);
      }

      // Add application form
      if (tenderData.applicationForm) {
        formData.append('applicationForm', tenderData.applicationForm);
      }

      // Add selection criteria files
      tenderData.selectionCriteria.forEach((file, index) => {
        formData.append(`selectionCriteria[${index}]`, file);
      });

      // Add good examples files
      tenderData.goodExamples.forEach((file, index) => {
        formData.append(`goodExamples[${index}]`, file);
      });

      // STRIPPED: Analysis data not sent to backend - backend will re-analyze uploaded files
      // This eliminates payload size issues while preserving user feedback experience
      // Backend analysis will be authoritative for the RAG system

      const response = await fetch('/api/tenders-direct-sequential', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tender');
      }

      return data.tender;
    },
    onSuccess: (newTender) => {
      // Update the tenders list in the cache
      queryClient.setQueryData(['tenders'], (old: Tender[] = []) => [...old, newTender]);

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tenders'] });

      // Redirect to setup dashboard
      router.push('/procurement/setup');
    },
    onError: (error: Error) => {
      console.error('Tender creation failed:', error);
      // Error will be handled by the component using this hook
    }
  });
};

// Delete a tender
export const useDeleteTender = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenderId: string): Promise<void> => {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete tender');
      }
    },
    onSuccess: (_, deletedTenderId) => {
      // Remove the tender from the cache
      queryClient.setQueryData(['tenders'], (old: Tender[] = []) =>
        old.filter(tender => tender.id !== deletedTenderId)
      );

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
};

// Update tender status
export const useUpdateTenderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenderId, status }: { tenderId: string; status: Tender['status'] }): Promise<Tender> => {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tender status');
      }

      return data.tender;
    },
    onSuccess: (updatedTender) => {
      // Update the tender in the cache
      queryClient.setQueryData(['tenders'], (old: Tender[] = []) =>
        old.map(tender => tender.id === updatedTender.id ? updatedTender : tender)
      );

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
};

// New async tender creation workflow
export const useCreateTenderAsync = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (tenderData: CreateTenderData): Promise<{ tender: Tender; jobId: string }> => {
      // Step 1: Create tender (basic info only)
      const tenderResponse = await fetch('/api/tenders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tenderData.tenderName,
          description: tenderData.description,
        }),
      });

      if (!tenderResponse.ok) {
        const data = await tenderResponse.json();
        throw new Error(data.error || 'Failed to create tender');
      }

      const { tender } = await tenderResponse.json();

      // Step 2: Prepare documents for async upload
      const documents = [];

      if (tenderData.applicationForm) {
        documents.push({
          filename: tenderData.applicationForm.name,
          mimeType: tenderData.applicationForm.type,
          fileSize: tenderData.applicationForm.size,
          documentType: 'APPLICATION_FORM',
          file: tenderData.applicationForm,
        });
      }

      tenderData.selectionCriteria.forEach((file) => {
        documents.push({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: 'SELECTION_CRITERIA',
          file,
        });
      });

      tenderData.goodExamples.forEach((file) => {
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
          tenderId: tender.id,
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

      return { tender, jobId: uploadData.jobId };
    },
    onSuccess: ({ tender }) => {
      // Update the tenders list in the cache
      queryClient.setQueryData(['tenders'], (old: Tender[] = []) => [...old, tender]);
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
    onError: (error: Error) => {
      console.error('Async tender creation failed:', error);
    }
  });
};

// Hook to track job progress
export const useTenderJobStatus = (jobId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery({
    queryKey: ['tender-job-status', jobId],
    queryFn: async (): Promise<JobStatus> => {
      if (!jobId) throw new Error('Job ID is required');

      const response = await fetch(`/api/tender-jobs/${jobId}/status`);
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
export const useProcessTenderJobs = () => {
  return useMutation({
    mutationFn: async (options?: { jobId?: string; force?: boolean }) => {
      const response = await fetch('/api/tender-jobs/process', {
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