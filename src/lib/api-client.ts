// API client for the funding system

export interface FundData {
  id?: string;
  name: string;
  description?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt?: string;
  updatedAt?: string;
  applicationFormAnalysis?: any;
  selectionCriteriaAnalysis?: any;
  goodExamplesAnalysis?: any;
  documents?: DocumentMetadata[];
  documentsCount?: number;
}

export interface DocumentMetadata {
  id: string;
  documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES';
  filename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * Analyze a single document (application form) via API
 */
export async function analyzeDocumentViaAPI(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/analyze/document', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(errorData.error || 'Failed to analyze document');
  }
  
  const result = await response.json();
  return result.analysis;
}

/**
 * Analyze multiple selection criteria documents via API
 */
export async function analyzeCriteriaViaAPI(files: File[]): Promise<any> {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append(`files[${index}]`, file);
  });
  
  const response = await fetch('/api/analyze/criteria', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Criteria analysis failed' }));
    throw new Error(errorData.error || 'Failed to analyze selection criteria');
  }
  
  const result = await response.json();
  return result.analysis;
}

/**
 * Create a new fund with documents
 */
export async function createFund(fundData: {
  name: string;
  description?: string;
  applicationForm?: File;
  selectionCriteria?: File[];
  goodExamples?: File[];
}): Promise<FundData> {
  const formData = new FormData();
  formData.append('name', fundData.name);
  
  if (fundData.description) {
    formData.append('description', fundData.description);
  }
  
  if (fundData.applicationForm) {
    formData.append('applicationForm', fundData.applicationForm);
  }
  
  if (fundData.selectionCriteria) {
    fundData.selectionCriteria.forEach((file, index) => {
      formData.append(`selectionCriteria[${index}]`, file);
    });
  }
  
  if (fundData.goodExamples) {
    fundData.goodExamples.forEach((file, index) => {
      formData.append(`goodExamples[${index}]`, file);
    });
  }
  
  const response = await fetch('/api/funds', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create fund' }));
    throw new Error(errorData.error || 'Failed to create fund');
  }
  
  const result = await response.json();
  return result.fund;
}

/**
 * Get all funds
 */
export async function getAllFunds(): Promise<FundData[]> {
  const response = await fetch('/api/funds');
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch funds' }));
    throw new Error(errorData.error || 'Failed to fetch funds');
  }
  
  const result = await response.json();
  return result.funds;
}

/**
 * Get a specific fund with documents
 */
export async function getFund(fundId: string): Promise<FundData> {
  const response = await fetch(`/api/funds/${fundId}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Fund not found' }));
    throw new Error(errorData.error || 'Fund not found');
  }
  
  const result = await response.json();
  return result.fund;
}

/**
 * Download a document
 */
export async function downloadDocument(documentId: string): Promise<Blob> {
  const response = await fetch(`/api/documents/${documentId}/download`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(errorData.error || 'Failed to download document');
  }
  
  return await response.blob();
}

/**
 * Get document download URL for direct linking
 */
export function getDocumentDownloadUrl(documentId: string): string {
  return `/api/documents/${documentId}/download`;
}

/**
 * Analyze multiple good example documents via API
 */
export async function analyzeGoodExamplesViaAPI(files: File[]): Promise<any> {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append(`file${index}`, file);
  });
  
  const response = await fetch('/api/analyze/good-examples', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Good examples analysis failed' }));
    throw new Error(errorData.error || 'Failed to analyze good examples');
  }
  
  const result = await response.json();
  return result;
}

/**
 * Run test assessment on application document via API
 */
export async function runTestAssessmentViaAPI(applicationFile: File, criteria: any): Promise<any> {
  const formData = new FormData();
  formData.append('application', applicationFile);
  
  if (criteria) {
    formData.append('criteria', JSON.stringify(criteria));
  }
  
  const response = await fetch('/api/analyze/test-assessment', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Test assessment failed' }));
    throw new Error(errorData.error || 'Failed to run test assessment');
  }
  
  const result = await response.json();
  return result;
}