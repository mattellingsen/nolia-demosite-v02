// Browser-compatible document analyzer
// Handles plain text files only - PDF/Word documents should use API-based analysis

export interface DocumentAnalysis {
    questionsFound: number;
    fieldTypes: string[];
    sections: string[];
    complexity: 'Simple' | 'Medium' | 'Complex';
    textContent: string;
    wordCount: number;
    extractedSections: {
        title: string;
        content: string;
        questionCount: number;
        isMainSection: boolean;
    }[];
}

export interface CriteriaAnalysis {
    criteriaFound: number;
    weightings: { name: string; weight: number }[];
    categories: string[];
    scoringMethod: 'Points' | 'Percentage' | 'Pass/Fail';
    textContent: string;
    detectedCriteria: string[];
    extractedSections?: any[];
    
    // Optional AI reasoning data (only present if AI analysis was successful)
    aiReasoning?: {
        documentRoles: Array<{
            filename: string;
            identifiedRole: string;
            purpose: string;
            keyContributions: string[];
        }>;
        
        unifiedCriteria: Array<{
            category: string;
            weight: number;
            requirements: string[];
            sourceDocuments: string[];
            reasoning: string;
        }>;
        
        conflictsIdentified: Array<{
            type: 'weight_mismatch' | 'requirement_conflict' | 'scoring_inconsistency';
            description: string;
            affectedDocuments: string[];
            recommendation: string;
        }>;
        
        synthesizedFramework: {
            scoringMethod: 'Points' | 'Percentage' | 'Pass/Fail';
            passingThreshold: number;
            weightingJustification: string;
            assessmentProcess: string[];
        };
    };
}

/**
 * Extract text content from different file types (browser-compatible)
 * Only handles plain text files - PDF/Word documents require API-based processing
 */
export async function extractTextFromFile(file: File): Promise<string> {
    try {
        if (file.type === 'text/plain') {
            return await file.text();
        } else if (
            file.type === 'application/pdf' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            throw new Error(`Cannot process ${file.type} files in browser. Please use API-based analysis.`);
        } else {
            throw new Error(`Unsupported file type: ${file.type}`);
        }
    } catch (error) {
        console.error('Error extracting text from file:', error);
        throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Analyze application form document structure and content
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
 * Analyze selection criteria documents
 */
export async function analyzeSelectionCriteria(files: File[]): Promise<CriteriaAnalysis> {
    try {
        let combinedText = '';
        
        // Process all criteria files
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

/**
 * Extract sections from document text
 */
function extractSections(text: string): Array<{ title: string; content: string; questionCount: number }> {
    // Conservative approach - estimate realistic section count for forms
    const textLength = text.length;
    const totalQuestions = countQuestions(text);
    
    // Most application forms have 3-6 main sections
    let estimatedSections = 4; // Conservative default
    
    // Adjust based on document length
    if (textLength > 3000) estimatedSections = 5;
    if (textLength > 5000) estimatedSections = 6;
    if (textLength < 1500) estimatedSections = 3;
    
    // Create realistic section names
    const sectionNames = [
        'Application Details',
        'Organization Information', 
        'Project Information',
        'Financial Information',
        'Supporting Materials',
        'Additional Requirements'
    ];
    
    const sections = [];
    const questionsPerSection = Math.ceil(totalQuestions / estimatedSections);
    
    for (let i = 0; i < estimatedSections; i++) {
        sections.push({
            title: sectionNames[i],
            content: text.substring(i * (textLength / estimatedSections), (i + 1) * (textLength / estimatedSections)),
            questionCount: questionsPerSection
        });
    }
    
    return sections;
}

/**
 * Count questions in text using various patterns
 */
function countQuestions(text: string): number {
    // Real form field patterns that indicate actual questions/inputs
    const fieldPatterns = [
        // Direct input instructions
        /\b(?:enter|provide|complete|fill in|input|type)\s+(?:your?|the|a|an)?\s*[a-z\s]{2,30}\b/gi,
        
        // Form field labels with colons or underlines  
        /\b[a-z\s]{2,40}:\s*(?:_+|\[.*?\]|\.\.\.|$)/gmi,
        
        // Placeholder text patterns
        /\[(?:to be completed|enter|provide|your?)[^\]]{0,50}\]/gi,
        
        // Field labels ending with input indicators
        /\b[a-z\s]{2,40}\s*(?:___+|\.\.\.|_____)/gmi,
        
        // Question-style prompts
        /(?:what|how|when|where|which|why)\s+(?:is|are|do|does|did|will|would|should|can)\s+[^?]{5,80}\?/gi,
        
        // Amount/number fields
        /(?:amount|total|number|quantity|count|value|price|cost):\s*(?:\$|£|€)?\s*(?:_+|\[.*?\])/gi,
        
        // Date fields
        /(?:date|when|deadline):\s*(?:_+|\[.*?\]|\/\s*\/)/gi,
        
        // Upload/attachment fields
        /(?:upload|attach|browse|select)\s+(?:file|document|cv|resume)/gi
    ];
    
    let totalFields = 0;
    
    fieldPatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
            const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase().trim()))];
            totalFields += uniqueMatches.length;
        }
    });
    
    // Additional context-aware counting
    const enterFields = (text.match(/\benter\s+(?:your?|the|a|an)?\s*[a-z\s]{2,30}(?:\s+here|\s+below|$)/gi) || []).length;
    const labeledFields = (text.match(/^[^\n]{3,50}:\s*(?:_+|\[.*?\]|\.\.\.)$/gmi) || []).length;
    
    totalFields += enterFields + labeledFields;
    
    // Return actual count without artificial minimums
    return Math.max(totalFields, 0);
}

/**
 * Detect field types based on text patterns
 */
function detectFieldTypes(text: string): string[] {
    const fieldTypes = new Set<string>();
    
    // More precise patterns that look for actual form field indicators, not just instructional text
    const patterns = {
        // Text fields - look for field labels ending with colons or input indicators
        'Text Input': /(company\s+name|business\s+name|contact\s+person|email\s+address|phone\s+number|address|website):\s*$/gmi,
        
        // Number fields - look for specific numeric input patterns
        'Number Input': /(amount|total|budget|funding|revenue|employees?|years?)\s*[:=]\s*[\$]?\s*[_\[\]\.]+/gmi,
        
        // Date fields - look for date input patterns
        'Date Picker': /(date|deadline|start|end|birth|founded|established)\s*[:=]\s*[_\/\[\]\.]+/gmi,
        
        // File upload - look for explicit upload instructions
        'File Upload': /(upload|attach)\s+(file|document|evidence|proof)/gi,
        
        // Multiple choice - look for actual choice indicators, not general instructions
        'Multiple Choice': /(\☐|\□|○)\s*[A-Za-z]|\b(tick\s+one|select\s+one|choose\s+one)\b(?!\s+of\s+the\s+following)/gi,
        
        // Dropdown - look for dropdown-specific language
        'Dropdown': /(dropdown|select\s+from\s+list|choose\s+from\s+dropdown)/gi,
        
        // Textarea - look for multi-line input indicators
        'Textarea': /(describe|explain|provide\s+details|comments):\s*\n\s*[_\[\]\.]{10,}/gmi,
        
        // Checkbox - look for actual checkbox symbols and agreement patterns
        'Checkbox': /(\☐|\□|✓)\s*(i\s+agree|i\s+acknowledge|yes\/no|confirm)/gi
    };
    
    for (const [fieldType, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) {
            fieldTypes.add(fieldType);
        }
    }
    
    // Fallback to simpler detection if specific patterns don't match
    // but only for very clear field indicators
    if (fieldTypes.size === 0) {
        const fallbackPatterns = {
            'Text Input': /[A-Za-z\s]+:\s*_{5,}/g, // Label followed by underscores
            'Number Input': /\$\s*_{3,}|amount:\s*_{3,}/gi, // Money or amount fields
            'Date Picker': /\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/g, // Date format examples
            'File Upload': /\[attach\s+file\]|\[upload\]/gi, // Upload placeholders
            'Checkbox': /\[\s*\]\s*(yes|no|agree)/gi // Checkbox patterns
        };
        
        for (const [fieldType, pattern] of Object.entries(fallbackPatterns)) {
            if (pattern.test(text)) {
                fieldTypes.add(fieldType);
            }
        }
    }
    
    return Array.from(fieldTypes);
}

/**
 * Determine document complexity based on file and content analysis
 */
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

// Criteria analysis helper functions (same as before)
function countCriteria(text: string): number {
    const criteriaPatterns = [
        /criteria?\s*\d+/gi,
        /requirement\s*\d+/gi,
        /^[\d\w]+[\.\)]\s*[A-Z]/gm,
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
        /([A-Za-z\s]+)\s*[-:\(]\s*(\d{1,2})%/g,
        /(\d{1,2})%\s*[-:\)]\s*([A-Za-z\s]+)/g,
        /([A-Za-z\s]+)\s*\((\d{1,2})%\)/g
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
    
    // Return empty array if no weightings found - no fallback templates
    if (weightings.length === 0) {
        return [];
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
    
    // Return empty array if no categories found - no fallback templates
    if (categories.size === 0) {
        return [];
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
        /^[\d\w]+[\.\)]\s*([A-Z][^.!?]*[.!?]?)/gm,
        /^[•\-\*]\s*([A-Z][^.!?]*[.!?]?)/gm,
        /(?:must|shall|should|required to)\s+([^.!?]*[.!?]?)/gi,
        /applicant\s+(?:must|shall|should)\s+([^.!?]*[.!?]?)/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const criterion = match[1].trim();
            if (criterion.length > 10 && criterion.length < 200) {
                criteria.add(criterion);
            }
        }
    });
    
    return Array.from(criteria);
}