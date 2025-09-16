// Server-side document analyzer using Node.js libraries
// This runs in API routes where pdf-parse and mammoth are available

import { DocumentAnalysis, CriteriaAnalysis } from './browser-document-analyzer';

/**
 * Extract text content from different file types (server-side with real parsing)
 */
export async function extractTextFromFile(file: any): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === 'text/plain') {
            return await file.text();
        } else if (file.type === 'application/pdf') {
            // PDF processing is temporarily unavailable due to server compatibility issues
            console.log(`📄 PDF upload detected: ${file.name}, size: ${buffer.length} bytes`);
            
            // Provide clear feedback to user about PDF limitations
            throw new Error(`PDF processing is temporarily unavailable. Please convert "${file.name}" to a Word document (.docx) and try again. We're working to restore PDF support soon.`);
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            // Use mammoth for real Word document text extraction with dynamic import
            try {
                console.log(`📄 Processing Word document: ${file.name}, size: ${buffer.length} bytes`);
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ buffer });
                
                if (result.value && result.value.trim().length > 0) {
                    console.log(`📄 Word extraction successful: ${result.value.length} characters`);
                    console.log('📄 First 200 characters:', result.value.substring(0, 200));
                    return result.value.trim();
                } else {
                    throw new Error('Word document appears to be empty or contains no extractable text.');
                }
            } catch (wordError) {
                console.error('📄 Word document parsing error:', wordError);
                throw new Error(`Failed to extract text from Word document "${file.name}": ${wordError instanceof Error ? wordError.message : 'Unknown error'}. Please ensure the document contains text and is not corrupted.`);
            }
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
export async function analyzeApplicationForm(file: any): Promise<DocumentAnalysis> {
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
export async function analyzeSelectionCriteria(files: any[]): Promise<CriteriaAnalysis> {
    try {
        // Try Claude reasoning first with enhanced optimization and proper fallback
        try {
            const { analyzeSelectionCriteriaWithClaude } = await import('./claude-document-reasoner');
            
            // Prepare document contexts for Claude analysis with size optimization
            const documentContexts = [];
            for (const file of files) {
                const text = await extractTextFromFile(file);
                const sections = extractSections(text);
                
                // Use full content for thorough Claude analysis
                const optimizedContent = text;
                
                documentContexts.push({
                    filename: file.name,
                    content: optimizedContent,
                    extractedSections: sections.map(s => s.title || s.toString()).slice(0, 20) // Limit sections
                });
            }
            
            console.log(`🧠 Attempting optimized Claude reasoning analysis on ${documentContexts.length} documents`);
            
            // Add timeout protection like Step 4
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Claude criteria analysis timeout')), 25000);
            });
            
            const analysisPromise = async () => {
                return await analyzeSelectionCriteriaWithClaude(documentContexts);
            };
            
            const aiAnalysis = await Promise.race([analysisPromise(), timeoutPromise]);
            
            console.log('📊 AI Analysis received, structure type check:', {
                hasFormalCriteria: !!aiAnalysis.formalEvaluationCriteria,
                hasAssessmentCategories: !!aiAnalysis.assessmentCategories,
                hasOldCriteriaFound: !!aiAnalysis.criteriaFound,
                keys: Object.keys(aiAnalysis)
            });
            
            // Return the AI analysis in the expected format
            console.log('✅ Using Claude AI reasoning for criteria analysis');
            
            // Handle both old and new JSON structures for backwards compatibility
            const isNewStructure = aiAnalysis.formalEvaluationCriteria !== undefined;
            
            if (isNewStructure) {
                // New comprehensive structure
                return {
                    criteriaFound: aiAnalysis.formalEvaluationCriteria?.length || 0,
                    weightings: aiAnalysis.formalEvaluationCriteria?.map(c => ({
                        name: c.criteriaName,
                        weight: parseInt(c.weight) || 0
                    })) || [],
                    categories: aiAnalysis.assessmentCategories?.map(c => c.categoryName) || [],
                    scoringMethod: aiAnalysis.formalEvaluationCriteria?.[0]?.scoringMethod || 'Points',
                    textContent: documentContexts.map(d => d.content).join('\n\n'),
                    detectedCriteria: [
                        ...(aiAnalysis.formalEvaluationCriteria?.map(c => c.criteriaName) || []),
                        ...(aiAnalysis.eligibilityRequirements?.map(r => r.requirementName) || [])
                    ],
                    extractedSections: documentContexts.flatMap(d => d.extractedSections),
                    analysisMode: 'CLAUDE_AI_REASONING',
                    
                    // NEW: Include comprehensive assessment categories
                    assessmentCategories: aiAnalysis.assessmentCategories || [],
                    
                    // Include comprehensive AI reasoning data
                    aiReasoning: {
                        formalEvaluationCriteria: aiAnalysis.formalEvaluationCriteria || [],
                        eligibilityRequirements: aiAnalysis.eligibilityRequirements || [],
                        assessmentProcess: aiAnalysis.assessmentProcess || [],
                        complianceElements: aiAnalysis.complianceElements || [],
                        disqualifyingFactors: aiAnalysis.disqualifyingFactors || [],
                        documentRoles: aiAnalysis.documentRoles || [],
                        unifiedCriteria: aiAnalysis.unifiedCriteria || [],
                        conflictsIdentified: aiAnalysis.conflictsIdentified || []
                    }
                };
            } else {
                // Old structure (fallback compatibility)
                return {
                    criteriaFound: aiAnalysis.criteriaFound,
                    weightings: aiAnalysis.weightings,
                    categories: aiAnalysis.categories,
                    scoringMethod: aiAnalysis.synthesizedFramework.scoringMethod,
                    textContent: aiAnalysis.textContent,
                    detectedCriteria: aiAnalysis.detectedCriteria,
                    extractedSections: aiAnalysis.extractedSections,
                    analysisMode: 'CLAUDE_AI_REASONING',
                    
                    // Include AI reasoning data for enhanced analysis
                    aiReasoning: {
                        documentRoles: aiAnalysis.documentRoles,
                        unifiedCriteria: aiAnalysis.unifiedCriteria,
                        conflictsIdentified: aiAnalysis.conflictsIdentified,
                        synthesizedFramework: aiAnalysis.synthesizedFramework
                    }
                };
            }
            
        } catch (aiError) {
            console.log('🤖 Claude analysis failed, using basic pattern matching:', {
                error: aiError instanceof Error ? aiError.message : aiError,
                stack: aiError instanceof Error ? aiError.stack : undefined
            });
            // Fall through to basic analysis
        }
        
        // Basic analysis fallback
        let combinedText = '';
        
        // Process all criteria files with real text extraction
        for (const file of files) {
            const text = await extractTextFromFile(file);
            combinedText += text + '\n\n';
        }
        
        // Extract sections using the same 3-rule approach as other steps
        const extractedSections = extractSections(combinedText);
        
        // Extract criteria and weightings
        const criteriaFound = countCriteria(combinedText);
        const weightings = extractWeightings(combinedText);
        const categories = extractCriteriaCategories(combinedText);
        const scoringMethod = detectScoringMethod(combinedText);
        const detectedCriteria = extractSpecificCriteria(combinedText);
        
        console.log('📋 Using basic pattern matching (fallback mode)');
        return {
            criteriaFound,
            weightings,
            categories,
            scoringMethod,
            textContent: combinedText,
            detectedCriteria,
            extractedSections, // Add sections to match other steps
            analysisMode: 'BASIC_FALLBACK' // Clear indicator
        };
    } catch (error) {
        console.error('Error analyzing selection criteria:', error);
        throw new Error(`Failed to analyze selection criteria: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions (reused from browser-document-analyzer.ts for consistency)

function isValidSectionTitle(title: string, fullText: string): boolean {
    // Filter out invalid section titles
    
    // 1. Too short or too long
    if (title.length < 4 || title.length > 80) return false;
    
    // 2. Document titles (usually appear at the very beginning)
    const docTitlePatterns = /^(.*Grant.*Report|.*Assessment.*Report|.*Application.*Template|.*Guidelines.*Template)$/i;
    if (docTitlePatterns.test(title)) return false;
    
    // 3. Single word fragments that are too generic
    const singleWordPattern = /^\w+$/;
    if (singleWordPattern.test(title)) {
        const genericWords = ['financial', 'comments', 'assessment', 'resources', 'recommendation', 'section', 'information', 'details', 'summary'];
        if (genericWords.includes(title.toLowerCase())) return false;
    }
    
    // 4. Form field labels (end with colons, contain "enter", etc.)
    const fieldLabelPatterns = /^(enter|select|choose|provide|upload|click|tick|confirm|state).*|.*:$|^.*committed:?$/i;
    if (fieldLabelPatterns.test(title)) return false;
    
    // 5. Words that appear too frequently in the text (likely not section headers)
    const titleLower = title.toLowerCase();
    const occurrences = (fullText.toLowerCase().match(new RegExp(titleLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (occurrences > 8) return false; // If it appears more than 8 times, it's probably not a section header
    
    // 6. Filter out very common phrases that are likely instructions or labels
    const instructionPatterns = /^(yes|no|n\/a|enter text here|enter value|enter date|please|if yes|if no|confirmed|upload document|bank account|pay to|phone number|email address).*$/i;
    if (instructionPatterns.test(title)) return false;
    
    return true;
}

function isMainSectionTitle(title: string): boolean {
    // Main sections are typically:
    // - Single digit numbers (1, 2, 3) vs subsections (1.1, 1.2, 2.1)
    // - Section/Part/Chapter keywords
    // - Standalone headings without sub-numbering
    
    // Check for numbered patterns - main sections have single digit
    const numberMatch = title.match(/^(\d+)(?:\.(\d+))?/);
    if (numberMatch) {
        // If there's a second number (1.1), it's a subsection
        return !numberMatch[2];
    }
    
    // Check for Section/Part/Chapter keywords (usually main sections)
    if (/^(?:Section|Part|Chapter)\s+/i.test(title)) {
        return true;
    }
    
    // For unnumbered sections, assume they're main sections unless they contain certain subsection indicators
    const subsectionIndicators = /(?:sub|detail|breakdown|component|part\s+\d|step\s+\d)/i;
    return !subsectionIndicators.test(title);
}

function extractSections(text: string): Array<{ title: string; content: string; questionCount: number }> {
    console.log('📄 Extracting sections using simplified 3-rule approach...');
    const sections: Array<{ title: string; content: string; questionCount: number }> = [];
    const lines = text.split('\n');
    
    // Step 1: Find all numbered sections (main sections and subsections)
    const numberedSections = findNumberedSections(lines);
    console.log('📄 Found numbered sections:', numberedSections.map(s => `${s.number} - ${s.title}`));
    
    // Step 2: Determine which numbered sections to include based on rules
    const sectionsToInclude = filterNumberedSections(numberedSections);
    console.log('📄 Filtered numbered sections:', sectionsToInclude.map(s => `${s.number} - ${s.title}`));
    
    // Step 3: Find unnumbered sections at beginning/end with questions/inputs
    const unnumberedSections = findUnnumberedSections(lines, numberedSections);
    console.log('📄 Found unnumbered sections:', unnumberedSections.map(s => s.title));
    
    // Log final section list for debugging
    const finalSectionList = [...sectionsToInclude.map(s => s.title), ...unnumberedSections.map(s => s.title)];
    console.log('📋 FINAL SECTION LIST:', finalSectionList);
    
    // Combine and sort all sections by position
    const allSections = [...sectionsToInclude, ...unnumberedSections]
        .sort((a, b) => a.startIndex - b.startIndex);
    
    // Set end indices and extract content
    allSections.forEach((section, index) => {
        const endIndex = index < allSections.length - 1 
            ? allSections[index + 1].startIndex 
            : lines.length;
        
        const sectionContent = lines
            .slice(section.startIndex, endIndex)
            .join('\n')
            .trim();
            
        const questionCount = countQuestions(sectionContent);
        
        if (sectionContent.length > 20) {
            sections.push({
                title: section.title,
                content: sectionContent,
                questionCount,
                isMainSection: !section.number || !section.number.includes('.')
            });
        }
    });
    
    // Filter out document titles and false positives
    const documentTitlePatterns = [
        /student experience grant/i,
        /assessment report/i,
        /application (template|form|guidelines)/i,
        /funding (template|assessment)/i,
        /grant (template|assessment)/i,
        /\b(template|report|guidelines|form)\b.*\b(template|report|guidelines|form)\b/i,
        /^\d{4}\s*\/?\s*\d{2,4}/i, // Years like "2024 /25", "2024/25"
        /^(result|what is the)$/i, // Single words or question fragments
        /^enter (text|value|amount|date)/i // Form instructions
    ];
    
    const filteredSections = sections.filter(section => {
        const isDocumentTitle = documentTitlePatterns.some(pattern => pattern.test(section.title));
        if (isDocumentTitle) {
            console.log(`📄 Filtering out document title: "${section.title}"`);
            return false;
        }
        return true;
    });
    
    console.log(`📄 Successfully extracted ${filteredSections.length} final sections (${sections.length - filteredSections.length} titles filtered out)`);
    return filteredSections;
}

function findNumberedSections(lines: string[]): Array<{number: string, title: string, startIndex: number}> {
    const numberedSections: Array<{number: string, title: string, startIndex: number}> = [];
    
    lines.forEach((line, index) => {
        const cleanLine = line.trim();
        
        // Match numbered sections: 1.1 Title, 2.1 Title, 1.2.3 Title, etc.
        // Exclude plain years like "2024" - must have at least one decimal point
        const numberedMatch = cleanLine.match(/^(\d+\.\d+(?:\.\d+)*)\s*[\.:\-]?\s*(.+)$/);
        if (numberedMatch) {
            const number = numberedMatch[1];
            const title = numberedMatch[2].trim();
            
            // Must have a reasonable title (not just "Enter text here" etc.)
            // Also exclude years/dates that might slip through
            if (title.length > 3 && title.length < 100 && 
                !title.match(/^(enter|select|choose|provide|upload|click)/i) &&
                !title.match(/^\d{4}.*grant|experience.*grant/i)) {
                numberedSections.push({
                    number,
                    title: `${number} ${title}`,
                    startIndex: index
                });
            }
        }
    });
    
    return numberedSections;
}

function filterNumberedSections(numberedSections: Array<{number: string, title: string, startIndex: number}>): Array<{number: string, title: string, startIndex: number}> {
    const sectionsToInclude: Array<{number: string, title: string, startIndex: number}> = [];
    
    // Group sections by main number (e.g., all "2.x" sections under main section "2")
    const mainSections = new Map<string, Array<{number: string, title: string, startIndex: number}>>();
    
    numberedSections.forEach(section => {
        const mainNumber = section.number.split('.')[0];
        if (!mainSections.has(mainNumber)) {
            mainSections.set(mainNumber, []);
        }
        mainSections.get(mainNumber)!.push(section);
    });
    
    // Apply the rules
    mainSections.forEach((sections, mainNumber) => {
        const mainSection = sections.find(s => s.number === mainNumber);
        const subSections = sections.filter(s => s.number !== mainNumber);
        
        if (subSections.length > 0) {
            // Rule 1: Include all subsections (2.2, 2.2.3, etc.)
            sectionsToInclude.push(...subSections);
        } else if (mainSection) {
            // Rule 2: Include main section only if it has no subsections
            sectionsToInclude.push(mainSection);
        }
    });
    
    return sectionsToInclude;
}

function findUnnumberedSections(lines: string[], numberedSections: Array<{number: string, title: string, startIndex: number}>): Array<{title: string, startIndex: number}> {
    const unnumberedSections: Array<{title: string, startIndex: number}> = [];
    
    // Find the range of numbered sections
    const firstNumberedIndex = numberedSections.length > 0 ? Math.min(...numberedSections.map(s => s.startIndex)) : lines.length;
    const lastNumberedIndex = numberedSections.length > 0 ? Math.max(...numberedSections.map(s => s.startIndex)) : 0;
    
    // Create section boundaries - each numbered section owns content until the next numbered section OR until content actually ends
    const sectionBoundaries: Array<{start: number, end: number, title: string}> = [];
    const sortedNumberedSections = [...numberedSections].sort((a, b) => a.startIndex - b.startIndex);
    
    sortedNumberedSections.forEach((section, index) => {
        let nextSectionStart: number;
        
        if (index < sortedNumberedSections.length - 1) {
            // Normal case: ends at next numbered section
            nextSectionStart = sortedNumberedSections[index + 1].startIndex;
        } else {
            // Last numbered section: try to find where its content actually ends
            // Look for a significant gap or clear section boundary after this section
            nextSectionStart = findEndOfLastNumberedSection(lines, section.startIndex);
        }
        
        sectionBoundaries.push({
            start: section.startIndex,
            end: nextSectionStart,
            title: section.title
        });
    });
    
    lines.forEach((line, index) => {
        const cleanLine = line.trim();
        
        // Skip if this is already a numbered section
        if (numberedSections.some(s => s.startIndex === index)) return;
        
        // Skip obvious non-section content
        const isPlaceholderText = /^(enter|provide|type|fill|complete|select)\s+(text|value|amount|here|below)/i.test(cleanLine);
        const isSimpleListItem = /^(sole traders|partnerships|charitable trusts|incorporated societies|callaghan innovation|confirmed)$/i.test(cleanLine);
        const isFieldLabel = cleanLine.endsWith(':') && cleanLine.length < 40 && !/^(confirmation|declaration)/i.test(cleanLine);
        const isGenericInstruction = /^(we are not|entities that are)/i.test(cleanLine);
        
        if (isPlaceholderText || isSimpleListItem || isFieldLabel || isGenericInstruction) {
            return; // Skip these false positives
        }
        
        // Check if this line is contained within any numbered section's boundaries
        const isWithinNumberedSection = sectionBoundaries.some(boundary => 
            index > boundary.start && index < boundary.end
        );
        
        // Only consider sections that are NOT within numbered section boundaries
        if (!isWithinNumberedSection && cleanLine.length > 5) {
            // Look for real section headers - be more restrictive
            const isPotentialHeader = /^[A-Z][A-Za-z\s&]{5,60}:?$/i.test(cleanLine) && !cleanLine.includes('here');
            const isConfirmationSection = /^(confirmation|declaration|confirm.*declaration)/i.test(cleanLine);
            const isDeclarationSection = /^(declaration)$/i.test(cleanLine);
            
            if (isPotentialHeader || isConfirmationSection || isDeclarationSection) {
                // Check if this section contains questions or input indicators in the following lines
                const sectionEndIndex = Math.min(index + 30, lines.length); // Look ahead 30 lines
                const sectionContent = lines.slice(index, sectionEndIndex).join(' ').toLowerCase();
                
                const hasQuestions = /[\?]/.test(sectionContent);
                const hasInputs = /(signature|sign|declare|acknowledge|checkbox|tick)/.test(sectionContent);
                
                // Look for form fields and input patterns that indicate this is a section with content to fill out
                const hasFormFields = /(name|email|phone|address|date|amount|budget|description)[:.]/.test(sectionContent);
                const hasInputPatterns = /(enter|provide|complete|fill|type|input|select|choose)/.test(sectionContent);
                const hasFieldIndicators = /(:|\[|\]|_____|\.\.\.\.\.|\$|#)/.test(sectionContent);
                const hasMultipleFormElements = (sectionContent.match(/:/g) || []).length >= 2; // Multiple colons suggest form labels
                
                // Special handling for "Application Details" and "Assessment" type sections
                const isApplicationDetails = /application\s+(details|information)/i.test(cleanLine);
                const isAssessmentSection = /assessment.*completed/i.test(cleanLine);
                
                if (hasQuestions || hasInputs || hasFormFields || hasInputPatterns || hasFieldIndicators || hasMultipleFormElements || isApplicationDetails || isAssessmentSection) {
                    const position = index < firstNumberedIndex ? 'before numbered sections' : 
                                   index > lastNumberedIndex ? 'after numbered sections' : 'between numbered sections';
                    const reason = hasQuestions ? 'questions' : 
                                  hasInputs ? 'inputs' : 
                                  hasFormFields ? 'form fields' : 
                                  hasInputPatterns ? 'input patterns' : 
                                  hasFieldIndicators ? 'field indicators' : 
                                  hasMultipleFormElements ? 'multiple form elements' :
                                  isApplicationDetails ? 'application details section' :
                                  isAssessmentSection ? 'assessment section' : 'form content';
                    console.log(`📝 Found unnumbered section ${position}: "${cleanLine}" (contains ${reason})`);
                    unnumberedSections.push({
                        title: cleanLine,
                        startIndex: index
                    });
                }
            }
        } else if (isWithinNumberedSection) {
            // Log what we're skipping for debugging
            const withinSection = sectionBoundaries.find(boundary => 
                index > boundary.start && index < boundary.end
            );
            if (withinSection && /^[A-Z][A-Za-z\s&]{5,60}:?$/i.test(cleanLine)) {
                console.log(`🚫 Skipping "${cleanLine}" (within numbered section: ${withinSection.title})`);
            }
        }
    });
    
    // Filter out nested unnumbered sections - only keep the outermost/parent sections
    const filteredSections = unnumberedSections.filter((section, index) => {
        // Check if this section is nested within any other unnumbered section
        const isNested = unnumberedSections.some((otherSection, otherIndex) => {
            if (index === otherIndex) return false; // Don't compare with itself
            
            // Check if current section starts after another section starts but before significant content gap
            // This indicates it's nested within the other section
            const gap = Math.abs(section.startIndex - otherSection.startIndex);
            const isAfterOther = section.startIndex > otherSection.startIndex;
            const isCloseToOther = gap < 50; // Within 50 lines suggests nesting
            
            return isAfterOther && isCloseToOther;
        });
        
        if (isNested) {
            console.log(`🚫 Filtering out nested section: "${section.title}"`);
            return false;
        }
        
        return true;
    });
    
    return filteredSections;
}

// Helper function to find where the last numbered section's content actually ends
function findEndOfLastNumberedSection(lines: string[], sectionStartIndex: number): number {
    // Start looking from the section and scan forward
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for clear indicators that we've moved beyond the numbered section content:
        
        // 1. A standalone "DECLARATION" section (common pattern at document end)
        if (/^DECLARATION$/i.test(line)) {
            console.log(`📍 Found end of last numbered section at line ${i} (DECLARATION section)`);
            return i;
        }
        
        // 2. Other clear section headers that aren't part of numbered content
        if (/^(APPENDIX|ATTACHMENT|NOTES|IMPORTANT|CONTACT)/i.test(line)) {
            console.log(`📍 Found end of last numbered section at line ${i} (${line})`);
            return i;
        }
        
        // 3. Signature/acknowledgment sections (common at document end)
        if (/^(SIGNATURE|ACKNOWLEDGMENT|I HEREBY|I DECLARE)/i.test(line)) {
            console.log(`📍 Found end of last numbered section at line ${i} (signature section)`);
            return i;
        }
    }
    
    // If no clear boundary found, default to document end but warn
    console.log(`⚠️ No clear end boundary found for last numbered section, using document end`);
    return lines.length;
}

function countQuestions(text: string): number {
    console.log('📊 Analyzing form fields and input patterns...');
    
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
        /(?:upload|attach|browse|select)\s+(?:file|document|cv|resume)/gi,
        
        // Multiple choice indicators
        /\[\s*\]\s*[a-z\s]{5,60}(?:\n|\r\n?)\s*\[\s*\]\s*[a-z\s]{5,60}/gi,
        
        // Checkbox options
        /(?:☐|□|\[\s*\])\s*[a-z][^□☐\[\]]{10,80}/gi,
        
        // Required field indicators
        /[a-z\s]{3,40}\s*\*?\s*(?:\(required\)|\*|mandatory)/gi
    ];
    
    // Collect all detected field text to prevent double-counting
    const allDetectedFields = new Set<string>();
    const foundPatterns = new Set<string>();
    
    fieldPatterns.forEach((pattern, index) => {
        const matches = text.match(pattern);
        if (matches) {
            const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase().trim()))];
            uniqueMatches.forEach(match => {
                // Normalize the field text to detect duplicates
                const normalizedField = match.replace(/[:\-_\[\]\.]+/g, ' ').replace(/\s+/g, ' ').trim();
                allDetectedFields.add(normalizedField);
            });
            foundPatterns.add(`Pattern ${index + 1}: ${uniqueMatches.length} matches`);
            console.log(`📝 Found ${uniqueMatches.length} fields with pattern ${index + 1}`);
        }
    });
    
    // Additional context-aware counting (also check for duplicates)
    const enterFields = text.match(/\benter\s+(?:your?|the|a|an)?\s*[a-z\s]{2,30}(?:\s+here|\s+below|$)/gi) || [];
    const labeledFields = text.match(/^[^\n]{3,50}:\s*(?:_+|\[.*?\]|\.\.\.)$/gmi) || [];
    
    [...enterFields, ...labeledFields].forEach(field => {
        const normalizedField = field.toLowerCase().replace(/[:\-_\[\]\.]+/g, ' ').replace(/\s+/g, ' ').trim();
        allDetectedFields.add(normalizedField);
    });
    
    const totalFields = allDetectedFields.size;
    
    console.log(`📊 Total form fields detected: ${totalFields}`);
    console.log(`📋 Pattern breakdown:`, Array.from(foundPatterns));
    
    // Return actual count without artificial minimums
    return Math.max(totalFields, 0);
}

function detectFieldTypes(text: string): string[] {
    const fieldTypes = new Set<string>();
    
    // Balanced patterns - more accurate than original but not overly restrictive
    const patterns = {
        // Text fields - common text input indicators
        'Text Input': /\b(name|title|email|e-mail|phone|telephone|mobile|address|website|url)\b/gi,
        
        // Number fields - numeric input indicators  
        'Number Input': /\b(amount|quantity|number|count|age|years?|revenue|cost|price|budget|funding|money)\b|\$/gi,
        
        // Date fields - date-related terms
        'Date Picker': /\b(date|when|deadline|start|end|birth|founded|established)\b/gi,
        
        // File upload - keep original but exclude problematic matches
        'File Upload': /(upload|attach)\s+(file|document|evidence|proof|cv|resume|certificate)/gi,
        
        // Multiple choice - VERY restrictive to avoid false positives
        'Multiple Choice': /(\☐|\□|○)\s*[A-Za-z]|\b(tick\s+one|select\s+one|choose\s+one)\b(?!\s+of\s+the\s+following)|radio\s+button/gi,
        
        // Dropdown - keep restrictive 
        'Dropdown': /(dropdown|select\s+from\s+list|choose\s+from\s+dropdown)/gi,
        
        // Textarea - descriptive content fields
        'Textarea': /\b(describe|explain|details|comments|notes|summary|overview|experience)\b/gi,
        
        // Checkbox - agreement and confirmation patterns
        'Checkbox': /\b(agree|accept|confirm|yes\/no|acknowledge|consent)\b/gi
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
        while ((match = pattern.exec(text)) !== null) {
            const criterion = match[1].trim();
            if (criterion.length > 10 && criterion.length < 200) {
                criteria.add(criterion);
            }
        }
    });
    
    return Array.from(criteria);
}