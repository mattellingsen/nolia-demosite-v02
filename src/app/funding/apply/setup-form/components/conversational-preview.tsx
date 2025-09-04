"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Eye, Zap, Upload01, MessageChatCircle } from "@untitledui/icons";
import { MessageItem, Message } from "@/components/application/messaging/messaging";
import { Button } from "@/components/base/buttons/button";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
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
    mcpIntegrationsEnabled: boolean;
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
    const [isTyping, setIsTyping] = useState(false);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [conversation, setConversation] = useState<ConversationState>({
        messages: [],
        currentQuestionIndex: 0,
        webSearchEnabled: false,
        mcpIntegrationsEnabled: false,
        questions: [],
        isComplete: false
    });

    // Generate questions from form analysis
    const generateQuestionsFromAnalysis = () => {
        const analysis = formData?.aiSuggestions?.analysis;
        if (!analysis) return [];

        const questions: FormQuestion[] = [];
        
        // Add organization name question
        questions.push({
            id: "org-name",
            text: "What's the name of your organization?",
            section: "Organization Details",
            required: true,
            fieldType: "text"
        });

        // Generate questions based on detected sections
        if (analysis.sections) {
            analysis.sections.forEach((section: string, index: number) => {
                questions.push({
                    id: `section-${index}`,
                    text: `Can you tell me about your ${section.toLowerCase()}?`,
                    section: section,
                    required: true,
                    fieldType: "textarea"
                });
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
                name: "AI Assistant", 
                avatarUrl: "/ai-avatar.png",
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

        // Add first question after a short delay
        setTimeout(() => {
            if (questions.length > 0) {
                addAIMessage(questions[0].text);
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
                    name: "AI Assistant", 
                    avatarUrl: "/ai-avatar.png",
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

    const handleSubmitResponse = () => {
        if (!userInput.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            user: { 
                name: "You", 
                me: true 
            },
            text: userInput,
            sentAt: "now",
            status: "sent"
        };

        setConversation(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage]
        }));

        // Store response
        const currentQuestion = conversation.questions[conversation.currentQuestionIndex];
        if (currentQuestion) {
            setResponses(prev => ({
                ...prev,
                [currentQuestion.id]: userInput
            }));
        }

        setUserInput("");

        // Move to next question
        setTimeout(() => {
            const nextIndex = conversation.currentQuestionIndex + 1;
            
            if (nextIndex < conversation.questions.length) {
                setConversation(prev => ({
                    ...prev,
                    currentQuestionIndex: nextIndex
                }));
                addAIMessage(conversation.questions[nextIndex].text);
            } else {
                // Conversation complete
                setConversation(prev => ({
                    ...prev,
                    isComplete: true
                }));
                addAIMessage("Perfect! I've got all the information I need. Your application looks great and is ready for submission.");
                onComplete?.(responses);
            }
        }, 500);
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

    const toggleWebSearch = () => {
        setConversation(prev => ({
            ...prev,
            webSearchEnabled: !prev.webSearchEnabled
        }));
    };

    const toggleMCPIntegrations = () => {
        setConversation(prev => ({
            ...prev,
            mcpIntegrationsEnabled: !prev.mcpIntegrationsEnabled
        }));
    };

    return (
        <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-white rounded-xl border border-secondary shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-secondary-600 rounded-full flex items-center justify-center">
                        <MessageChatCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-primary">AI Funding Application</h3>
                        <p className="text-xs text-secondary">Powered by AI • Real-time feedback enabled</p>
                    </div>
                </div>
                
                {/* Integration Controls */}
                <div className="flex items-center gap-1">
                    <ButtonUtility
                        size="sm"
                        color={conversation.webSearchEnabled ? "secondary" : "tertiary"}
                        icon={Eye}
                        tooltip="Web search enabled"
                        onClick={toggleWebSearch}
                        className={cx(
                            "transition-colors",
                            conversation.webSearchEnabled && "bg-brand-secondary-100 text-brand-secondary-700 hover:bg-brand-secondary-200"
                        )}
                    />
                    <ButtonUtility
                        size="sm"
                        color={conversation.mcpIntegrationsEnabled ? "secondary" : "tertiary"}
                        icon={Zap}
                        tooltip="MCP integrations enabled"
                        onClick={toggleMCPIntegrations}
                        className={cx(
                            "transition-colors",
                            conversation.mcpIntegrationsEnabled && "bg-brand-secondary-100 text-brand-secondary-700 hover:bg-brand-secondary-200"
                        )}
                    />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-gray-50/0 via-gray-50/20 to-gray-50/0">
                <div className="max-w-none space-y-6">
                    {conversation.messages.map((message) => (
                        <MessageItem 
                            key={message.id} 
                            msg={message}
                            showUserLabel={true}
                            className="max-w-none"
                        />
                    ))}
                    
                    {/* Typing indicator */}
                    {isTyping && (
                        <MessageItem 
                            msg={{
                                id: "typing",
                                user: { 
                                    name: "AI Assistant", 
                                    avatarUrl: "/ai-avatar.png",
                                    me: false 
                                },
                                typing: true
                            }}
                            showUserLabel={false}
                            className="max-w-none"
                        />
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* File Upload Zone */}
            {!conversation.isComplete && (
                <div className="px-6 pb-3 border-t border-secondary/50">
                    <div className="pt-3">
                        <FileUpload.DropZone
                            onDropFiles={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt"
                            className="!min-h-12 !py-2 !bg-brand-secondary-25 !ring-1 !ring-brand-secondary-200 hover:!ring-brand-secondary-300"
                            hint="Drop your application files here or click to upload"
                        />
                    </div>
                </div>
            )}

            {/* Input */}
            {!conversation.isComplete && (
                <div className="px-6 pb-6 border-t border-secondary/50">
                    <div className="pt-4 flex items-end gap-3">
                        <div className="flex-1">
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Message AI Assistant..."
                                className="w-full px-4 py-3 border border-secondary rounded-xl resize-none focus:ring-2 focus:ring-brand-secondary-500 focus:border-brand-secondary-500 transition-all placeholder-tertiary bg-white shadow-sm"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmitResponse();
                                    }
                                }}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '44px';
                                    target.style.height = target.scrollHeight + 'px';
                                }}
                            />
                        </div>
                        <Button
                            size="md"
                            color="primary"
                            iconLeading={ArrowRight}
                            onClick={handleSubmitResponse}
                            isDisabled={!userInput.trim()}
                            className="shrink-0 bg-brand-secondary-600 hover:bg-brand-secondary-700 border-brand-secondary-600"
                        >
                            Send
                        </Button>
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="mt-3 flex items-center justify-between text-xs text-tertiary">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand-secondary-400"></div>
                            Question {Math.min(conversation.currentQuestionIndex + 1, conversation.questions.length)} of {conversation.questions.length}
                        </span>
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