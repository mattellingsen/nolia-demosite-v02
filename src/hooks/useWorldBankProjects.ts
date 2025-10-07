import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface Project {
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

export interface CreateProjectData {
  projectName: string;
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

// Fetch all projects
export const useWorldBankProjects = () => {
  return useQuery({
    queryKey: ['worldbank-projects'],
    queryFn: async (): Promise<Project[]> => {
      const response = await fetch('/api/worldbank-projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      return data.projects;
    },
  });
};

// Create a new project
export const useCreateWorldBankProject = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (projectData: CreateProjectData): Promise<Project> => {
      const formData = new FormData();

      // Add basic project info
      formData.append('name', projectData.projectName);
      if (projectData.description) {
        formData.append('description', projectData.description);
      }

      // Add application form
      if (projectData.applicationForm) {
        formData.append('applicationForm', projectData.applicationForm);
      }

      // Add selection criteria files
      projectData.selectionCriteria.forEach((file, index) => {
        formData.append(`selectionCriteria[${index}]`, file);
      });

      // Add good examples files
      projectData.goodExamples.forEach((file, index) => {
        formData.append(`goodExamples[${index}]`, file);
      });

      // STRIPPED: Analysis data not sent to backend - backend will re-analyze uploaded files
      // This eliminates payload size issues while preserving user feedback experience
      // Backend analysis will be authoritative for the RAG system

      const response = await fetch('/api/worldbank-projects-direct-sequential', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      return data.project;
    },
    onSuccess: (newProject) => {
      // Update the projects list in the cache
      queryClient.setQueryData(['worldbank-projects'], (old: Project[] = []) => [...old, newProject]);

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['worldbank-projects'] });

      // Redirect to setup dashboard
      router.push('/worldbank/setup');
    },
    onError: (error: Error) => {
      console.error('Project creation failed:', error);
      // Error will be handled by the component using this hook
    }
  });
};

// Delete a project
export const useDeleteWorldBankProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const response = await fetch(`/api/worldbank-projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }
    },
    onSuccess: (_, deletedProjectId) => {
      // Remove the project from the cache
      queryClient.setQueryData(['worldbank-projects'], (old: Project[] = []) =>
        old.filter(project => project.id !== deletedProjectId)
      );

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['worldbank-projects'] });
    },
  });
};

// Update project status
export const useUpdateWorldBankProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: Project['status'] }): Promise<Project> => {
      const response = await fetch(`/api/worldbank-projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project status');
      }

      return data.project;
    },
    onSuccess: (updatedProject) => {
      // Update the project in the cache
      queryClient.setQueryData(['worldbank-projects'], (old: Project[] = []) =>
        old.map(project => project.id === updatedProject.id ? updatedProject : project)
      );

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['worldbank-projects'] });
    },
  });
};

// New async project creation workflow
export const useCreateWorldBankProjectAsync = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (projectData: CreateProjectData): Promise<{ project: Project; jobId: string }> => {
      // Step 1: Create project (basic info only)
      const projectResponse = await fetch('/api/worldbank-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.projectName,
          description: projectData.description,
        }),
      });

      if (!projectResponse.ok) {
        const data = await projectResponse.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const { project } = await projectResponse.json();

      // Step 2: Prepare documents for async upload
      const documents = [];

      if (projectData.applicationForm) {
        documents.push({
          filename: projectData.applicationForm.name,
          mimeType: projectData.applicationForm.type,
          fileSize: projectData.applicationForm.size,
          documentType: 'APPLICATION_FORM',
          file: projectData.applicationForm,
        });
      }

      projectData.selectionCriteria.forEach((file) => {
        documents.push({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: 'SELECTION_CRITERIA',
          file,
        });
      });

      projectData.goodExamples.forEach((file) => {
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
          projectId: project.id,
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

      return { project, jobId: uploadData.jobId };
    },
    onSuccess: ({ project }) => {
      // Update the projects list in the cache
      queryClient.setQueryData(['worldbank-projects'], (old: Project[] = []) => [...old, project]);
      queryClient.invalidateQueries({ queryKey: ['worldbank-projects'] });
    },
    onError: (error: Error) => {
      console.error('Async project creation failed:', error);
    }
  });
};

// Hook to track job progress
export const useWorldBankProjectJobStatus = (jobId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery({
    queryKey: ['worldbank-project-job-status', jobId],
    queryFn: async (): Promise<JobStatus> => {
      if (!jobId) throw new Error('Job ID is required');

      const response = await fetch(`/api/worldbank-project-jobs/${jobId}/status`);
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
export const useProcessWorldBankProjectJobs = () => {
  return useMutation({
    mutationFn: async (options?: { jobId?: string; force?: boolean }) => {
      const response = await fetch('/api/worldbank-project-jobs/process', {
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
