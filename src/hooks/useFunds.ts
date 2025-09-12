import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

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