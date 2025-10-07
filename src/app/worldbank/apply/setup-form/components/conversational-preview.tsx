"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp, Eye, SearchSm } from "@untitledui/icons";
import { MessageItem, Message } from "@/components/application/messaging/messaging";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

interface FormQuestion {
    id: string;
    text: string;
    section: string;
    required: boolean;
    fieldType: string;
}

interface ConversationState {
    messages: Message[];
    currentQuestionIndex: number;
    webSearchEnabled: boolean;
    questions: FormQuestion[];
    isComplete: boolean;
}

interface ConversationalPreviewProps {
    formData: any;
    onComplete?: (responses: Record<string, string>) => void;
}

export const ConversationalPreview: React.FC<ConversationalPreviewProps> = ({ 
    formData, 
    onComplete 
}) => {
    const [userInput, setUserInput] = useState("");
    const [currentQuestionText, setCurrentQuestionText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [isDragOver, setIsDragOver] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [conversation, setConversation] = useState<ConversationState>({
        messages: [],
        currentQuestionIndex: 0,
        webSearchEnabled: false,
        questions: [],
        isComplete: false
    });

    // Generate questions from form analysis
    const generateQuestionsFromAnalysis = () => {
        const analysis = formData?.aiSuggestions?.analysis;
        const questions: FormQuestion[] = [];
        
        // Add organization name question
        questions.push({
            id: "org-name",
            text: "What's the name of your organization?",
            section: "Organization Details",
            required: true,
            fieldType: "text"
        });

        // Generate questions based on detected sections (if analysis exists)
        if (analysis?.sections) {
            analysis.sections.forEach((section: string, index: number) => {
                questions.push({
                    id: `section-${index}`,
                    text: `Can you tell me about your ${section.toLowerCase()}?`,
                    section: section,
                    required: true,
                    fieldType: "textarea"
                });
            });
        } else {
            // Fallback questions when no analysis is available
            questions.push({
                id: "project-description",
                text: "Can you describe your project or initiative?",
                section: "Project Details",
                required: true,
                fieldType: "textarea"
            });
        }

        // Add funding amount question
        questions.push({
            id: "funding-amount",
            text: "How much funding are you requesting?",
            section: "Financial Information", 
            required: true,
            fieldType: "currency"
        });

        return questions;
    };

    // Initialize conversation
    useEffect(() => {
        const questions = generateQuestionsFromAnalysis();
        
        const welcomeMessage: Message = {
            id: "welcome",
            user: { 
                name: "Bot", 
                avatarUrl: "/images/logos/nolia-logo-icon.png",
                me: false 
            },
            text: (
                <div className="space-y-3">
                    <p>Welcome! I'm here to help you complete your funding application.</p>
                    <p>I'll guide you through some questions, but if you already have a complete or partial application form, or even just some starting thoughts, you can upload them below to get us moving faster.</p>
                </div>
            ),
            sentAt: "now"
        };

        setConversation(prev => ({
            ...prev,
            messages: [welcomeMessage],
            questions
        }));

        // Set first question in input field after a short delay
        setTimeout(() => {
            if (questions.length > 0) {
                const questionWithColon = questions[0].text + ": ";
                setCurrentQuestionText(questionWithColon);
                setUserInput(questionWithColon);
                
                // Focus and position cursor at the end
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(questionWithColon.length, questionWithColon.length);
                    }
                }, 100);
            }
        }, 1500);
    }, [formData]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation.messages]);

    const addAIMessage = (text: string) => {
        setIsTyping(true);
        
        setTimeout(() => {
            const aiMessage: Message = {
                id: `ai-${Date.now()}`,
                user: { 
                    name: "Bot", 
                    avatarUrl: "/images/logos/nolia-logo-icon.png",
                    me: false 
                },
                text,
                sentAt: "now"
            };

            setConversation(prev => ({
                ...prev,
                messages: [...prev.messages, aiMessage]
            }));
            setIsTyping(false);
        }, 1000);
    };

    const needsAIAssistance = (question: FormQuestion, userAnswer: string) => {
        // Determine if a response needs AI enhancement based on question type and answer characteristics
        
        // Questions that don't need assistance (factual/simple data)
        const factualQuestionTypes = ['org-name', 'funding-amount', 'contact-info', 'dates'];
        if (factualQuestionTypes.includes(question.id)) {
            return false;
        }
        
        // Check if it's a yes/no question
        const isYesNoQuestion = question.text.toLowerCase().includes('yes') && question.text.toLowerCase().includes('no') ||
                               question.text.toLowerCase().includes('do you') ||
                               question.text.toLowerCase().includes('are you') ||
                               question.text.toLowerCase().includes('have you') ||
                               question.text.toLowerCase().includes('will you');
        
        if (isYesNoQuestion) {
            const simpleAnswers = ['yes', 'no', 'y', 'n'];
            if (simpleAnswers.includes(userAnswer.toLowerCase().trim())) {
                return false;
            }
        }
        
        // Short factual answers (like names, numbers, single words) probably don't need enhancement
        if (userAnswer.trim().split(' ').length <= 3 && !question.text.toLowerCase().includes('describe') && !question.text.toLowerCase().includes('explain')) {
            return false;
        }
        
        // Questions that definitely need assistance (descriptive/narrative)
        const needsAssistanceKeywords = ['describe', 'explain', 'tell me about', 'how will', 'what is your plan', 'why', 'impact', 'goals', 'objectives', 'approach', 'strategy', 'method'];
        const questionNeedsHelp = needsAssistanceKeywords.some(keyword => 
            question.text.toLowerCase().includes(keyword)
        );
        
        return questionNeedsHelp || question.fieldType === 'textarea';
    };

    const analyzeAndImproveResponse = (userAnswer: string, question: FormQuestion) => {
        // Only improve responses that actually need enhancement
        if (!needsAIAssistance(question, userAnswer)) {
            return userAnswer; // Return original answer unchanged
        }
        
        // This simulates AI analysis based on funding criteria
        const fundCriteria = formData?.selectedFund?.criteria || "Strong applications demonstrate clear impact, feasibility, and alignment with program goals.";
        
        // Generate improved response based on question type and criteria
        let improvedResponse = "";
        
        switch (question.id) {
            case "project-description":
                improvedResponse = `${userAnswer}\n\nThis initiative directly addresses critical community needs while demonstrating measurable outcomes and sustainable implementation. Our approach combines proven methodologies with innovative solutions, ensuring maximum impact per dollar invested. We have assembled a qualified team with relevant expertise and established partnerships that strengthen our capacity to deliver results.`;
                break;
            default:
                // For other descriptive questions, enhance with impact language
                if (userAnswer.length < 100) {
                    improvedResponse = `${userAnswer}\n\nThis approach demonstrates strong alignment with the program's objectives and showcases our organization's capacity to deliver meaningful results. Our methodology is evidence-based and designed to create lasting positive change in the communities we serve.`;
                } else {
                    improvedResponse = `${userAnswer}\n\nOur approach ensures measurable outcomes and sustainable impact, leveraging proven strategies and community partnerships to maximize effectiveness.`;
                }
        }
        
        return improvedResponse;
    };

    const handleSubmitResponse = () => {
        // Extract only the user's answer (remove the question prefix)
        const userAnswer = userInput.replace(currentQuestionText, "").trim();
        if (!userAnswer) return;

        const currentQuestion = conversation.questions[conversation.currentQuestionIndex];
        if (!currentQuestion) return;

        // Add bot question message (showing the question that was asked)
        const botQuestionMessage: Message = {
            id: `bot-question-${Date.now()}`,
            user: { 
                name: "Bot", 
                avatarUrl: "/images/logos/nolia-logo-icon.png",
                me: false 
            },
            text: currentQuestion.text,
            sentAt: "now"
        };

        // Add user message with only the answer
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            user: { 
                name: "You", 
                me: true 
            },
            text: userAnswer,
            sentAt: "now",
            status: "sent"
        };

        setConversation(prev => ({
            ...prev,
            messages: [...prev.messages, botQuestionMessage, userMessage]
        }));

        // Store original response
        setResponses(prev => ({
            ...prev,
            [currentQuestion.id]: userAnswer
        }));

        setUserInput("");
        setCurrentQuestionText("");

        // Check if this response needs AI assistance
        const needsHelp = needsAIAssistance(currentQuestion, userAnswer);
        
        if (needsHelp) {
            // Show typing indicator and then provide AI-improved response
            setIsTyping(true);
            
            setTimeout(() => {
                const improvedResponse = analyzeAndImproveResponse(userAnswer, currentQuestion);
                
                const aiImprovementMessage: Message = {
                    id: `ai-improvement-${Date.now()}`,
                    user: { 
                        name: "Bot", 
                        avatarUrl: "/images/logos/nolia-logo-icon.png",
                        me: false 
                    },
                    text: (
                        <div className="space-y-3">
                            <p className="font-medium text-brand-600">Here's an enhanced version of your response:</p>
                            <div className="bg-success-25 border border-success-200 rounded-lg p-4">
                                <p className="text-success-800 whitespace-pre-line">{improvedResponse}</p>
                            </div>
                            <p className="text-sm text-gray-600">This version strengthens your application by highlighting impact, demonstrating expertise, and aligning with funding criteria.</p>
                        </div>
                    ),
                    sentAt: "now"
                };

                setConversation(prev => ({
                    ...prev,
                    messages: [...prev.messages, aiImprovementMessage]
                }));
                setIsTyping(false);
                
                // Store the improved response
                setResponses(prev => ({
                    ...prev,
                    [`${currentQuestion.id}_improved`]: improvedResponse
                }));

                // Move to next question after showing improvement
                setTimeout(() => moveToNextQuestion(), 2000);
            }, 1500); // Simulate AI processing time
        } else {
            // For factual questions, just move on directly without any bot response
            setTimeout(() => moveToNextQuestion(), 500);
        }
        
        // Helper function to move to next question
        function moveToNextQuestion() {
            const nextIndex = conversation.currentQuestionIndex + 1;
            
            // Complete after 3 exchanges (questions)
            if (nextIndex >= 3) {
                setConversation(prev => ({
                    ...prev,
                    isComplete: true
                }));
                addAIMessage("Excellent! Your application is complete and ready for submission.");
                onComplete?.(responses);
            } else if (nextIndex < conversation.questions.length) {
                setConversation(prev => ({
                    ...prev,
                    currentQuestionIndex: nextIndex
                }));
                // Set next question in input field
                const nextQuestionText = conversation.questions[nextIndex].text + ": ";
                setCurrentQuestionText(nextQuestionText);
                setUserInput(nextQuestionText);
                
                // Focus and position cursor at the end
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(nextQuestionText.length, nextQuestionText.length);
                    }
                }, 100);
            } else {
                // Fallback: complete if we run out of questions
                setConversation(prev => ({
                    ...prev,
                    isComplete: true
                }));
                addAIMessage("Excellent! Your application is complete and ready for submission.");
                onComplete?.(responses);
            }
        }
    };

    const handleFileUpload = (files: FileList) => {
        const file = files[0];
        if (!file) return;

        const uploadMessage: Message = {
            id: `upload-${Date.now()}`,
            user: { 
                name: "You", 
                me: true 
            },
            attachment: {
                name: file.name,
                size: `${Math.round(file.size / 1024)} KB`,
                type: file.name.endsWith('.pdf') ? 'pdf' : 'txt'
            },
            sentAt: "now",
            status: "sent"
        };

        setConversation(prev => ({
            ...prev,
            messages: [...prev.messages, uploadMessage]
        }));

        // AI response to file upload
        setTimeout(() => {
            addAIMessage("Thanks for uploading that! I can see some useful information in your document. Let me ask you a few follow-up questions to complete your application.");
        }, 1000);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
    };

    const toggleWebSearch = () => {
        setConversation(prev => ({
            ...prev,
            webSearchEnabled: !prev.webSearchEnabled
        }));
    };

    return (
        <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-white rounded-xl shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary bg-brand-secondary-25 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        {/* Empty grey circle placeholder for business logo */}
                    </div>
                    <div>
                        <h3 className="font-semibold text-primary">
                            {formData.selectedFund?.name || 'Application Form'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-gray-50/0 via-gray-50/20 to-gray-50/0">
                <div className="max-w-none space-y-6">
                    {conversation.messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                            {/* BOT messages have avatar, USER messages don't */}
                            {!message.user?.me && (
                                <div className="flex-shrink-0">
                                    <img 
                                        src="/images/logos/nolia-logo-icon.png" 
                                        alt="Bot"
                                        className="w-8 h-8 object-contain"
                                    />
                                </div>
                            )}
                            
                            <div className={cx(
                                "flex-1 max-w-[70%]", // Limit width to 70%
                                message.user?.me 
                                    ? "bg-brand-secondary-25 rounded-xl p-4 ml-12" // USER: boxed with background, indented
                                    : "" // BOT: no background, no box
                            )}>
                                <div className="text-sm text-gray-900">
                                    {typeof message.text === 'string' ? message.text : message.text}
                                </div>
                                
                                {/* Show attachment if exists */}
                                {message.attachment && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                                        <div className="bg-gray-100 rounded px-2 py-1">
                                            📎 {message.attachment.name} ({message.attachment.size})
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <img 
                                    src="/images/logos/nolia-logo-icon.png" 
                                    alt="Bot"
                                    className="w-8 h-8 object-contain"
                                />
                            </div>
                            <div className="flex-1 max-w-[70%]">
                                <div className="flex items-center gap-1 text-gray-500">
                                    <div className="flex space-x-1">
                                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                    <span className="text-xs ml-2">Typing...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>


            {/* Input */}
            {!conversation.isComplete && (
                <div className="px-6 pb-6 border-t border-secondary/50">
                    <div className="pt-4">
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={userInput}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    // Prevent deleting the question prefix
                                    if (currentQuestionText && !newValue.startsWith(currentQuestionText)) {
                                        return;
                                    }
                                    setUserInput(newValue);
                                }}
                                placeholder={currentQuestionText ? "" : "Message Bot... (or drag and drop files)"}
                                className={cx(
                                    "w-full px-4 py-3 pr-14 resize-none transition-all placeholder-tertiary",
                                    isDragOver 
                                        ? "border-brand-secondary-500 ring-2 ring-brand-secondary-200 bg-brand-secondary-25" 
                                        : "bg-white border border-brand-secondary-600 focus:border-brand-secondary-600"
                                )}
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmitResponse();
                                    }
                                }}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                style={{ 
                                    minHeight: '44px', 
                                    maxHeight: '120px',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 0 0 8px #F2FAFC'
                                }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '44px';
                                    target.style.height = target.scrollHeight + 'px';
                                }}
                            />
                            
                            {/* Send Button - positioned inside the input */}
                            <div className="absolute right-3 bottom-3">
                                <Button
                                    size="sm"
                                    color="primary"
                                    iconLeading={ArrowUp}
                                    onClick={handleSubmitResponse}
                                    isDisabled={!userInput.replace(currentQuestionText, "").trim()}
                                    className="!p-2 !min-h-8 !h-8 !w-8"
                                />
                            </div>

                            {isDragOver && (
                                <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary-25/80 rounded-xl backdrop-blur-sm">
                                    <div className="text-center">
                                        <div className="text-brand-secondary-600 font-medium text-sm">
                                            Drop files here
                                        </div>
                                        <div className="text-brand-secondary-500 text-xs mt-1">
                                            PDF, DOC, DOCX, TXT files supported
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="mt-3 flex items-center justify-between text-xs text-tertiary">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-secondary-400"></div>
                                Question {Math.min(conversation.currentQuestionIndex + 1, 3)} of 3
                            </span>
                            <div 
                                onClick={toggleWebSearch}
                                className="cursor-pointer"
                            >
                                <Badge
                                    size="sm"
                                    color={conversation.webSearchEnabled ? "success" : "gray"}
                                    className="flex items-center gap-1"
                                >
                                    <SearchSm className="w-3 h-3" />
                                    Web search
                                </Badge>
                            </div>
                        </div>
                        <span className="text-quaternary">⏎ Send • ⇧⏎ New line</span>
                    </div>
                </div>
            )}

            {/* Completion State */}
            {conversation.isComplete && (
                <div className="px-6 pb-6 border-t border-success-200 bg-success-25 rounded-b-xl">
                    <div className="pt-4 text-center">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-success-500"></div>
                            <p className="text-sm font-medium text-success-800">
                                Preview Complete
                            </p>
                        </div>
                        <p className="text-sm text-success-700">
                            This demonstrates how users will interact with your conversational AI form.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};