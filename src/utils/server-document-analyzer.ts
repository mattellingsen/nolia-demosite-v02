// Server-side document analyzer using Node.js libraries
// This runs in API routes where pdf-parse and mammoth are available

import { DocumentAnalysis, CriteriaAnalysis } from './browser-document-analyzer';

/**
 * Extract text content from different file types (server-side with real parsing)
 */
export async function extractTextFromFile(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === 'text/plain') {
            return await file.text();
        } else if (file.type === 'application/pdf') {
            // Use pdf-parse for real PDF text extraction with dynamic import
            const pdfParse = await import('pdf-parse');
            const data = await pdfParse.default(buffer);
            return data.text;
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            // Use mammoth for real Word document text extraction with dynamic import
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } else {
            throw new Error(`Unsupported file type: ${file.type}`);
        }
    } catch (error) {
        console.error('Error extracting text from file:', error);
        throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Analyze application form document structure and content (server-side with real extraction)
 */
export async function analyzeApplicationForm(file: File): Promise<DocumentAnalysis> {
    try {
        const textContent = await extractTextFromFile(file);
        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
        
        // Extract sections (look for common section patterns)
        const sections = extractSections(textContent);
        
        // Count questions (look for question patterns)
        const questionCount = countQuestions(textContent);
        
        // Detect field types based on common patterns
        const fieldTypes = detectFieldTypes(textContent);
        
        // Determine complexity based on various factors
        const complexity = determineComplexity(textContent, sections.length, questionCount, file);
        
        return {
            questionsFound: questionCount,
            fieldTypes,
            sections: sections.map(s => s.title),
            complexity,
            textContent,
            wordCount: textContent.split(/\s+/).length,
            extractedSections: sections
        };
    } catch (error) {
        console.error('Error analyzing application form:', error);
        throw new Error(`Failed to analyze application form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Analyze selection criteria documents (server-side with real extraction)
 */
export async function analyzeSelectionCriteria(files: File[]): Promise<CriteriaAnalysis> {
    try {
        let combinedText = '';
        
        // Process all criteria files with real text extraction
        for (const file of files) {
            const text = await extractTextFromFile(file);
            combinedText += text + '\n\n';
        }
        
        // Extract criteria and weightings
        const criteriaFound = countCriteria(combinedText);
        const weightings = extractWeightings(combinedText);
        const categories = extractCriteriaCategories(combinedText);
        const scoringMethod = detectScoringMethod(combinedText);
        const detectedCriteria = extractSpecificCriteria(combinedText);
        
        return {
            criteriaFound,
            weightings,
            categories,
            scoringMethod,
            textContent: combinedText,
            detectedCriteria
        };
    } catch (error) {
        console.error('Error analyzing selection criteria:', error);
        throw new Error(`Failed to analyze selection criteria: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions (reused from browser-document-analyzer.ts for consistency)

function extractSections(text: string): Array<{ title: string; content: string; questionCount: number }> {
    const sections: Array<{ title: string; content: string; questionCount: number }> = [];
    
    // Common section patterns
    const sectionPatterns = [
        /^(\d+\.?\s*[A-Z][A-Za-z\s&]+)$/gm, // "1. Business Information" or "1 Business Information"
        /^([A-Z][A-Z\s&]{3,})$/gm, // "BUSINESS INFORMATION"
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*:?\s*$/gm, // "Business Information:" or "Business Information"
    ];
    
    const lines = text.split('\n');
    let currentSection: { title: string; content: string; questionCount: number } | null = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check if this line matches a section pattern
        let isSection = false;
        for (const pattern of sectionPatterns) {
            const match = trimmedLine.match(pattern);
            if (match && trimmedLine.length < 100) { // Reasonable section title length
                isSection = true;
                
                // Save previous section if exists
                if (currentSection) {
                    currentSection.questionCount = countQuestions(currentSection.content);
                    sections.push(currentSection);
                }
                
                // Start new section
                currentSection = {
                    title: match[1] || trimmedLine,
                    content: '',
                    questionCount: 0
                };
                break;
            }
        }
        
        // Add content to current section
        if (!isSection && currentSection) {
            currentSection.content += line + '\n';
        } else if (!isSection && !currentSection) {
            // Content before first section - create a default section
            if (sections.length === 0) {
                currentSection = {
                    title: 'General Information',
                    content: line + '\n',
                    questionCount: 0
                };
            }
        }
    }
    
    // Don't forget the last section
    if (currentSection) {
        currentSection.questionCount = countQuestions(currentSection.content);
        sections.push(currentSection);
    }
    
    return sections.filter(s => s.content.trim().length > 0);
}

function countQuestions(text: string): number {
    const questionPatterns = [
        /\?/g, // Direct question marks
        /please\s+(provide|describe|explain|list|specify|detail)/gi, // "Please provide..."
        /what\s+(is|are|was|were)/gi, // "What is..."
        /how\s+(many|much|long|often)/gi, // "How many..."
        /when\s+(did|do|will)/gi, // "When did..."
        /where\s+(is|are|was|were)/gi, // "Where is..."
        /why\s+(did|do|will)/gi, // "Why did..."
        /describe\s+/gi, // "Describe..."
        /explain\s+/gi, // "Explain..."
        /list\s+/gi, // "List..."
        /provide\s+(details|information)/gi, // "Provide details..."
        /^[\d\w]+[\.\\)]\s*[A-Z]/gm, // Numbered/lettered questions "1. What is..."
    ];
    
    const uniqueMatches = new Set<string>();
    
    for (const pattern of questionPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                uniqueMatches.add(match.toLowerCase());
            });
        }
    }
    
    return Math.max(uniqueMatches.size, 1); // At least 1 question
}

function detectFieldTypes(text: string): string[] {
    const fieldTypes = new Set<string>();
    
    const patterns = {
        'Text Input': /name|title|description|address|comments?/gi,
        'Email': /email|e-mail/gi,
        'Phone': /phone|telephone|mobile/gi,
        'Date': /date|when|deadline|start|end|birth/gi,
        'Number Input': /amount|quantity|number|count|age|years?/gi,
        'Currency': /\$|cost|price|budget|funding|money|revenue/gi,
        'File Upload': /upload|attach|document|resume|cv|certificate/gi,
        'Multiple Choice': /select|choose|option|radio|checkbox/gi,
        'Dropdown': /dropdown|select\s+from|choose\s+from/gi,
        'Textarea': /describe|explain|details|comments|notes/gi,
        'Checkbox': /agree|accept|confirm|yes\/no/gi
    };
    
    for (const [fieldType, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) {
            fieldTypes.add(fieldType);
        }
    }
    
    return Array.from(fieldTypes);
}

function determineComplexity(text: string, sectionCount: number, questionCount: number, file: File): 'Simple' | 'Medium' | 'Complex' {
    const wordCount = text.split(/\s+/).length;
    const fileSize = file.size;
    const fileName = file.name.toLowerCase();
    
    // File-based indicators
    let complexityScore = 0;
    
    // Size-based scoring
    if (fileSize > 100 * 1024) complexityScore += 2; // > 100KB
    else if (fileSize > 50 * 1024) complexityScore += 1; // > 50KB
    
    // Content-based scoring
    if (wordCount > 1000) complexityScore += 2;
    else if (wordCount > 500) complexityScore += 1;
    
    if (sectionCount > 6) complexityScore += 2;
    else if (sectionCount > 3) complexityScore += 1;
    
    if (questionCount > 20) complexityScore += 2;
    else if (questionCount > 10) complexityScore += 1;
    
    // Filename-based indicators
    if (fileName.includes('complex') || fileName.includes('detailed') || fileName.includes('comprehensive')) {
        complexityScore += 2;
    } else if (fileName.includes('simple') || fileName.includes('basic')) {
        complexityScore -= 1;
    }
    
    // Check for complex terms
    const complexTerms = [
        'technical specifications', 'financial projections', 'risk assessment',
        'compliance', 'regulatory', 'methodology', 'implementation plan',
        'evaluation criteria', 'performance indicators', 'milestones'
    ];
    
    const hasComplexTerms = complexTerms.some(term => 
        text.toLowerCase().includes(term)
    );
    
    if (hasComplexTerms) complexityScore += 2;
    
    // Final determination
    if (complexityScore >= 5) return 'Complex';
    if (complexityScore >= 2) return 'Medium';
    return 'Simple';
}

// Criteria analysis helper functions
function countCriteria(text: string): number {
    const criteriaPatterns = [
        /criteria?\s*\d+/gi,
        /requirement\s*\d+/gi,
        /^[\d\w]+[\.\\)]\s*[A-Z]/gm,
        /must\s+(have|be|demonstrate)/gi,
        /required\s+to/gi,
        /shall\s+(have|be|demonstrate)/gi,
        /should\s+(have|be|demonstrate)/gi
    ];
    
    let criteriaCount = 0;
    for (const pattern of criteriaPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            criteriaCount += matches.length;
        }
    }
    
    return Math.max(criteriaCount, 3);
}

function extractWeightings(text: string): Array<{ name: string; weight: number }> {
    const weightings: Array<{ name: string; weight: number }> = [];
    const weightPatterns = [
        /([A-Za-z\s]+)\s*[-:\\(]\s*(\d{1,2})%/g,
        /(\d{1,2})%\s*[-:\\)]\s*([A-Za-z\s]+)/g,
        /([A-Za-z\s]+)\s*\\((\d{1,2})%\\)/g
    ];
    
    for (const pattern of weightPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = (match[1] || match[2]).trim();
            const weight = parseInt(match[2] || match[1]);
            if (name && weight && weight <= 100 && name.length < 50) {
                weightings.push({ name, weight });
            }
        }
    }
    
    // Default weightings if none found
    if (weightings.length === 0) {
        return [
            { name: 'Innovation', weight: 30 },
            { name: 'Financial Viability', weight: 25 },
            { name: 'Team Experience', weight: 20 },
            { name: 'Market Potential', weight: 15 },
            { name: 'Risk Assessment', weight: 10 }
        ];
    }
    
    return weightings;
}

function extractCriteriaCategories(text: string): string[] {
    const categories = new Set<string>();
    
    const commonCategories = [
        'Technical Merit', 'Commercial Viability', 'Team Capability', 'Financial Capacity',
        'Innovation', 'Market Potential', 'Risk Assessment', 'Implementation Plan',
        'Compliance', 'Sustainability', 'Impact', 'Feasibility'
    ];
    
    commonCategories.forEach(category => {
        if (text.toLowerCase().includes(category.toLowerCase())) {
            categories.add(category);
        }
    });
    
    if (categories.size === 0) {
        return ['Technical Merit', 'Commercial Viability', 'Team Capability', 'Implementation Plan'];
    }
    
    return Array.from(categories);
}

function detectScoringMethod(text: string): 'Points' | 'Percentage' | 'Pass/Fail' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('points') || lowerText.includes('score out of')) {
        return 'Points';
    } else if (lowerText.includes('%') || lowerText.includes('percent')) {
        return 'Percentage';
    } else if (lowerText.includes('pass/fail') || lowerText.includes('pass or fail')) {
        return 'Pass/Fail';
    }
    
    if (text.includes('%')) return 'Percentage';
    if (/\b\d+\s*points?\b/gi.test(text)) return 'Points';
    
    return 'Pass/Fail';
}

function extractSpecificCriteria(text: string): string[] {
    const criteria = new Set<string>();
    
    const patterns = [
        /^[\d\w]+[\.\\)]\s*([A-Z][^.!?]*[.!?]?)/gm,
        /^[•\\-\\*]\s*([A-Z][^.!?]*[.!?]?)/gm,
        /(?:must|shall|should|required to)\s+([^.!?]*[.!?]?)/gi,
        /applicant\s+(?:must|shall|should)\s+([^.!?]*[.!?]?)/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null && criteria.size < 15) {
            const criterion = match[1].trim();
            if (criterion.length > 10 && criterion.length < 200) {
                criteria.add(criterion);
            }
        }
    });
    
    return Array.from(criteria);
}