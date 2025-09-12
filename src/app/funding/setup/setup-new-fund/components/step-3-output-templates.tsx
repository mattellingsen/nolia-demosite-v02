"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, File02, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Trash01, Plus, FileHeart03 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { extractTextFromFile } from "@/utils/browser-document-analyzer";
import { analyzeDocumentViaAPI } from "@/lib/api-client";

interface Step3Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

interface TemplateAnalysis {
    templatesAnalyzed: number;
    templateTypes: string[];
    outputSections: {
        name: string;
        description: string;
        required: boolean;
    }[];
}

export const Step3OutputTemplates: React.FC<Step3Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious
}) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
    const [uploadError, setUploadError] = useState<string>('');

    const analyzeTemplates = async (files: File[]) => {
        setIsAnalyzing(true);
        setUploadError('');
        
        try {
            const analysis: TemplateAnalysis = {
                templatesAnalyzed: files.length,
                templateTypes: [],
                outputSections: []
            };
            
            // Analyze each template file
            for (const file of files) {
                try {
                    // Use the same API-based analysis as Step 1 for real document parsing
                    console.log(`🔍 Analyzing template file: ${file.name} (${file.type})`);
                    
                    let textContent = '';
                    let documentAnalysis: any = null;
                    
                    // TEMPORARILY DISABLED: Analysis moved to backend
                    if (file.type === 'text/plain') {
                        textContent = await file.text();
                    } else {
                        // DISABLED: Document analysis moved to backend after upload
                        // documentAnalysis = await analyzeDocumentViaAPI(file);
                        textContent = 'Analysis will be performed after upload';
                        console.log(`📄 Skipping frontend analysis for ${file.name} - will be done on backend`);
                    }
                    
                    if (!textContent.trim()) {
                        console.warn(`⚠️ No text content extracted from ${file.name}`);
                        analysis.templateTypes.push('Output Template');
                        continue;
                    }
                    
                    // Determine template type based on filename and content
                    const templateType = determineTemplateType(file.name, textContent);
                    analysis.templateTypes.push(templateType);
                    
                    // Extract sections using the same server-side 3-rule approach as other steps
                    if (documentAnalysis && documentAnalysis.extractedSections) {
                        // For PDF/Word documents, use the server's section extraction from the API response
                        const serverSections = documentAnalysis.extractedSections.map((section: any) => ({
                            name: section.title,
                            description: 'Section content',
                            required: section.isMainSection || false
                        }));
                        analysis.outputSections.push(...serverSections);
                        console.log(`📋 Added ${serverSections.length} sections from server analysis for ${file.name}`);
                    } else {
                        // For text files, use simplified extraction
                        const sections = extractOutputSections(textContent, file.name);
                        analysis.outputSections.push(...sections);
                        console.log(`📋 Added ${sections.length} sections from client analysis for ${file.name}`);
                    }
                } catch (fileError) {
                    console.error(`❌ Failed to analyze file ${file.name}:`, fileError);
                    // Add fallback for failed files
                    analysis.templateTypes.push('Output Template');
                }
            }
            
            // Remove duplicate sections (if multiple templates have similar sections)
            analysis.outputSections = removeDuplicateSections(analysis.outputSections);
            
            setAnalysis(analysis);
            
            // Update form data with analysis results for persistence
            updateFormData({ 
                outputTemplates: files,
                outputTemplatesAnalysis: analysis
            });
            
        } catch (error) {
            console.error('Template analysis error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to analyze templates. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileUpload = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);
        setUploadError('');
        
        // Update form data immediately to show files
        updateFormData({ outputTemplates: fileArray });
        
        // Analyze templates
        await analyzeTemplates(fileArray);
    }, [updateFormData]);

    const handleRemoveFile = (fileName: string) => {
        const updatedFiles = formData.outputTemplates.filter((file: File) => file.name !== fileName);
        updateFormData({ outputTemplates: updatedFiles });
        
        if (updatedFiles.length === 0) {
            setAnalysis(null);
        }
    };

    const getFileType = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'pdf';
            case 'doc':
            case 'docx':
                return 'doc';
            case 'txt':
                return 'empty';
            default:
                return 'empty';
        }
    };

    const canProceed = formData.outputTemplates && formData.outputTemplates.length > 0 && !isAnalyzing && analysis;

    /**
     * Helper functions for template analysis
     */
    const determineTemplateType = (fileName: string, content: string): string => {
        const name = fileName.toLowerCase();
        const text = content.toLowerCase();
        
        if (name.includes('assessment') || text.includes('assessment') || name.includes('evaluation')) {
            return 'Assessment Template';
        }
        if (name.includes('report') || text.includes('report') || name.includes('summary')) {
            return 'Report Template';
        }
        if (name.includes('recommendation') || text.includes('recommendation') || name.includes('decision')) {
            return 'Decision Template';
        }
        if (name.includes('letter') || text.includes('dear ') || text.includes('sincerely')) {
            return 'Letter Template';
        }
        if (name.includes('email') || text.includes('subject:') || text.includes('from:')) {
            return 'Email Template';
        }
        return 'Output Template';
    };

    const extractOutputSections = (content: string, fileName: string): Array<{name: string; description: string; required: boolean}> => {
        console.log('🔍 Starting enhanced section extraction for:', fileName);
        console.log('📄 Document content preview:', content.substring(0, 500));
        console.log('📏 Document length:', content.length, 'characters');
        
        // Show more of the document content to help debug
        console.log('📋 Full document content (first 2000 chars):', content.substring(0, 2000));
        
        // Show lines that start with numbers to help debug numbering patterns
        const numberedLines = content.split('\n').filter(line => /^\s*\d/.test(line.trim()));
        console.log('🔢 Lines starting with numbers:', numberedLines.slice(0, 20));
        
        const sections: Array<{name: string; description: string; required: boolean}> = [];
        
        // Enhanced comprehensive section patterns for better extraction including nested sections
        const sectionPatterns = [
            // All caps headers (most common in templates) - highest priority
            { pattern: /^([A-Z][A-Z\s&:]{2,40})(?:\s*[:]\s*)?$/gm, type: 'all_caps_header', priority: 1 },
            
            // Primary numbered sections with periods (1., 2., etc)
            { pattern: /^\s*(\d+\.)\s+([A-Z][^.\n]{3,60})/gm, type: 'numbered_dot_primary', priority: 2 },
            
            // Secondary numbered sections (1.1, 1.2, etc)
            { pattern: /^\s*(\d+\.\d+\.?)\s+([A-Z][^.\n]{3,60})/gm, type: 'numbered_dot_secondary', priority: 2 },
            
            // Tertiary numbered sections (1.1.1, 1.1.2, etc)
            { pattern: /^\s*(\d+\.\d+\.\d+\.?)\s+([A-Z][^.\n]{3,60})/gm, type: 'numbered_dot_tertiary', priority: 2 },
            
            // Numbered sections with parentheses (1), (2), etc
            { pattern: /^\s*\((\d+)\)\s+([A-Z][^.\n]{3,60})/gm, type: 'numbered_paren', priority: 2 },
            
            // Letter sections (a), b), (A), (B), etc
            { pattern: /^\s*\(?([a-zA-Z])\)?\s+([A-Z][^.\n]{3,60})/gm, type: 'letter_sections', priority: 3 },
            
            // Roman numerals (I., II., III., etc)
            { pattern: /^\s*([IVXLCDM]+\.)\s+([A-Z][^.\n]{3,60})/gm, type: 'roman', priority: 3 },
            
            // Bullet point sections (•, -, *, etc)
            { pattern: /^\s*[•\-\*]\s+([A-Z][^.\n]{5,60})/gm, type: 'bullet_points', priority: 4 },
            
            // Underlined or emphasized headers
            { pattern: /^([A-Z][A-Za-z\s&:]{3,40})(?:\s*[:]\s*)?(?:\n[\-=_]{3,})?$/gm, type: 'emphasized_header', priority: 3 },
            
            // Title case headers (proper capitalization)
            { pattern: /^([A-Z][a-z]+(?: [A-Z][a-z]+){1,5})(?:\s*[:]\s*)?$/gm, type: 'title_case', priority: 4 },
            
            // Assessment-specific patterns
            { pattern: /^\s*(?:Score|Rating|Grade|Mark|Points?)[\s:]+([A-Z][^.\n]{5,50})/gim, type: 'scoring_sections', priority: 2 },
            
            // Criteria-specific patterns  
            { pattern: /^\s*(?:Criteria?|Requirement|Standard)[\s:]+([A-Z][^.\n]{5,50})/gim, type: 'criteria_sections', priority: 2 },
            
            // Field placeholders in brackets
            { pattern: /\[([A-Z][A-Z\s_]{3,30})\]/g, type: 'bracket_field', priority: 5 },
            
            // Field placeholders in braces
            { pattern: /\{([A-Z][A-Z\s_]{3,30})\}/g, type: 'brace_field', priority: 5 },
            
            // Section dividers with text
            { pattern: /^[\-=_]{3,}\s*([A-Z][^.\n]{3,40})\s*[\-=_]{3,}$/gm, type: 'section_divider', priority: 3 },
            
            // Common section keywords - lowest priority to catch missed sections
            { pattern: /(?:^|\n)\s*((?:applicant|candidate|organization|company|project|assessment|evaluation|score|rating|recommendation|decision|comments|notes|summary|details|information|background|experience|qualifications|criteria|requirements|outcome|result|conclusion|findings|analysis|financial|technical|commercial|innovation|impact|risk|timeline|methodology|resources|team|management|compliance|sustainability|feasibility|viability)(?:\s+(?:information|details|section|summary|data|notes|assessment|evaluation|analysis|score|rating))?)/gi, type: 'keyword', priority: 6 }
        ];
        
        const foundSections = new Map<string, {name: string; description: string; required: boolean; priority: number}>();
        
        sectionPatterns.forEach(({ pattern, type, priority }) => {
            let match;
            let matchCount = 0;
            
            console.log(`🔎 Trying pattern ${type}:`, pattern.toString());
            
            // Test the pattern on a small sample first
            const testMatch = pattern.exec(content.substring(0, 1000));
            if (testMatch) {
                console.log(`💡 Pattern ${type} found test match:`, testMatch[0]?.substring(0, 50));
            }
            pattern.lastIndex = 0; // Reset after test
            
            // Reset regex state
            pattern.lastIndex = 0;
            
            while ((match = pattern.exec(content)) !== null && matchCount < 100) {
                matchCount++;
                
                // Get the section name based on pattern type
                let sectionName = '';
                let sectionNumber = '';
                
                switch(type) {
                    case 'numbered_dot_primary':
                    case 'numbered_dot_secondary': 
                    case 'numbered_dot_tertiary':
                    case 'numbered_paren':
                        sectionNumber = match[1]?.trim() || '';
                        sectionName = match[2]?.trim() || '';
                        break;
                    case 'letter_sections':
                        sectionNumber = match[1]?.trim() || '';
                        sectionName = match[2]?.trim() || '';
                        break;
                    case 'roman':
                        sectionNumber = match[1]?.trim() || '';
                        sectionName = match[2]?.trim() || '';
                        break;
                    case 'bullet_points':
                    case 'all_caps_header':
                    case 'title_case':
                    case 'emphasized_header':
                    case 'bracket_field':
                    case 'brace_field':
                    case 'section_divider':
                    case 'keyword':
                        sectionName = match[1]?.trim() || '';
                        break;
                    case 'scoring_sections':
                    case 'criteria_sections':
                        sectionName = match[1]?.trim() || '';
                        break;
                    default:
                        sectionName = match[1]?.trim() || '';
                }
                
                if (!sectionName) continue;
                
                console.log(`🔎 Raw match for ${type}:`, { 
                    fullMatch: match[0]?.substring(0, 100), 
                    sectionNumber, 
                    sectionName: sectionName.substring(0, 50),
                    matchIndex: match.index
                });
                
                // Clean up the section name
                sectionName = sectionName.replace(/[^\w\s&-]/g, '').trim();
                sectionName = sectionName.replace(/\s+/g, ' ');
                
                // Skip very short, very long, or generic names
                if (sectionName.length < 3 || sectionName.length > 60) continue;
                if (/^(document|content|section|item|part|the|and|for|with|this|that)$/i.test(sectionName)) continue;
                
                // Convert to title case
                sectionName = sectionName.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                
                const key = sectionName.toLowerCase();
                
                // Only add if not already found or if this has higher priority
                if (!foundSections.has(key) || foundSections.get(key)!.priority > priority) {
                    const isRequired = isRequiredSection(sectionName, content);
                    const description = generateSectionDescription(sectionName);
                    
                    foundSections.set(key, {
                        name: sectionName,
                        description,
                        required: isRequired,
                        priority
                    });
                    
                    const displayName = sectionNumber ? `${sectionNumber} ${sectionName}` : sectionName;
                    console.log(`✅ Found section "${displayName}" (${type}, priority ${priority})`);
                }
                
                // Prevent infinite loops
                if (pattern.global === false) break;
            }
            
            console.log(`📊 Pattern ${type} found ${matchCount} potential matches`);
        });
        
        // Convert to array and sort by priority
        const sortedSections = Array.from(foundSections.values())
            .sort((a, b) => a.priority - b.priority)
            .map(({ name, description, required }) => ({ name, description, required }));
        
        console.log(`📋 Total sections found: ${sortedSections.length}`);
        console.log('📝 Sections:', sortedSections.map(s => s.name));
        
        // If still no sections found, add some defaults based on template type
        if (sortedSections.length === 0) {
            console.log('⚠️ No sections found, using defaults');
            const defaults = getDefaultSections(fileName, content);
            sortedSections.push(...defaults);
        }
        
        return sortedSections; // Return all detected sections
    };

    const isRequiredSection = (sectionName: string, fullText: string): boolean => {
        const requiredKeywords = ['applicant', 'name', 'summary', 'recommendation', 'decision', 'result', 'score'];
        const optionalKeywords = ['comments', 'notes', 'additional', 'other', 'miscellaneous', 'optional'];
        
        const lowerName = sectionName.toLowerCase();
        
        // Check if it's explicitly optional
        if (optionalKeywords.some(keyword => lowerName.includes(keyword))) {
            return false;
        }
        
        // Check if it's likely required
        if (requiredKeywords.some(keyword => lowerName.includes(keyword))) {
            return true;
        }
        
        // Default to required for shorter, more essential-sounding names
        return lowerName.length < 20;
    };

    const generateSectionDescription = (sectionName: string): string => {
        const descriptions: Record<string, string> = {
            'applicant information': 'Basic applicant details and contact information',
            'assessment summary': 'Overall evaluation results and key findings',
            'scoring breakdown': 'Individual criterion scores and ratings',
            'reviewer comments': 'Detailed feedback and assessment notes',
            'recommendation': 'Final recommendation and decision',
            'project details': 'Information about the proposed project',
            'financial information': 'Budget and financial projections',
            'team information': 'Details about the project team',
            'timeline': 'Project schedule and milestones',
            'risks': 'Identified risks and mitigation strategies',
            'outcomes': 'Expected results and deliverables',
            'next steps': 'Required actions and follow-up items'
        };
        
        const lowerName = sectionName.toLowerCase();
        
        // Try exact match first
        if (descriptions[lowerName]) {
            return descriptions[lowerName];
        }
        
        // Try partial matches
        for (const [key, desc] of Object.entries(descriptions)) {
            if (lowerName.includes(key) || key.includes(lowerName)) {
                return desc;
            }
        }
        
        // Generate generic description
        return `Information related to ${sectionName.toLowerCase()}`;
    };

    const getDefaultSections = (fileName: string, content: string): Array<{name: string; description: string; required: boolean}> => {
        // Default sections based on template type
        return [
            { name: 'Applicant Information', description: 'Basic applicant details', required: true },
            { name: 'Assessment Summary', description: 'Overall evaluation results', required: true },
            { name: 'Recommendation', description: 'Final recommendation and next steps', required: true }
        ];
    };

    const removeDuplicateSections = (sections: Array<{name: string; description: string; required: boolean}>): Array<{name: string; description: string; required: boolean}> => {
        const seen = new Set<string>();
        return sections.filter(section => {
            const key = section.name.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Instructions */}
            <div className="text-center mb-6">
                <p className="text-lg text-secondary max-w-2xl mx-auto">
                    3. Upload output templates that define how assessment results should be formatted and presented.
                </p>
            </div>

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <FileUpload.Root>
                        <FileUpload.DropZone
                            hint="PDF, Word documents, or text files up to 10MB each"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                            allowsMultiple={true}
                            maxSize={10 * 1024 * 1024} // 10MB
                            onDropFiles={handleFileUpload}
                            onDropUnacceptedFiles={(files) => {
                                setUploadError('Please upload PDF, Word document, or text files.');
                            }}
                            onSizeLimitExceed={(files) => {
                                setUploadError('File size must be less than 10MB.');
                            }}
                            className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom"
                        />
                        
                        {formData.outputTemplates && formData.outputTemplates.length > 0 && (
                            <FileUpload.List>
                                {formData.outputTemplates.map((file: File, index: number) => (
                                    <FileUpload.ListItemProgressBar
                                        key={`${file.name}-${index}`}
                                        name={file.name}
                                        size={file.size}
                                        progress={100}
                                        failed={false}
                                        type={getFileType(file.name) as any}
                                        onDelete={() => handleRemoveFile(file.name)}
                                        onRetry={() => {}}
                                    />
                                ))}
                            </FileUpload.List>
                        )}

                        {isAnalyzing && (
                            <div className="flex justify-center py-6">
                                <LoadingIndicator 
                                    type="dot-circle" 
                                    size="md" 
                                    label="Analyzing templates..." 
                                />
                            </div>
                        )}
                    </FileUpload.Root>
                    <style jsx global>{`
                        .upload-dropzone-custom {
                            box-shadow: 0 0 0 8px #F2FAFC !important;
                        }
                    `}</style>
                </div>
            </div>

            {/* Error Display */}
            {uploadError && (
                <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-error-600" />
                    <p className="text-sm text-error-700">{uploadError}</p>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && formData.outputTemplates && formData.outputTemplates.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={FileHeart03} />
                        <h3 className="text-lg font-semibold text-primary">Template Analysis Complete</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-success-600 mb-1">{analysis.templatesAnalyzed}</p>
                            <p className="text-sm text-secondary">Templates</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-success-600 mb-1">{analysis.outputSections.length}</p>
                            <p className="text-sm text-secondary">Output Sections</p>
                        </div>
                        
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-primary mb-3">Detected Output Sections:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {analysis.outputSections.map((section, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                                        <div className="w-2 h-2 rounded-full mt-2 bg-success-600"></div>
                                        <div>
                                            <p className="text-sm font-medium text-primary">{section.name}</p>
                                            <p className="text-xs text-secondary">{section.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <Button
                    size="lg"
                    color="secondary"
                    iconLeading={ArrowLeft}
                    onClick={onPrevious}
                >
                    Back to Selection Criteria
                </Button>
                
                <div className="text-sm text-secondary">
                    Step 3 of 5
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!canProceed}
                >
                    Continue to Good Examples
                </Button>
            </div>
        </div>
    );
};