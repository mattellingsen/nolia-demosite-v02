"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CheckCircle,
    ArrowLeft,
    BookOpen01,
    AlertTriangle,
    Edit05,
    Shield01,
    Building02,
    Database02,
    SearchSm
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Badge } from "@/components/base/badges/badges";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { procurementRulesContent } from "./procurement-rules-content";

// Disable static generation
export const dynamic = 'force-dynamic';

// Simple styles - no animations
const styleSheet = `
  /* No animations - just simple display */
`;

interface BaseInfo {
    baseId: string;
    baseName: string;
    baseDescription?: string;
    status: 'ACTIVE';
    createdAt: string;
}

function KnowledgeBaseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const baseId = searchParams.get('baseId');

    const [baseInfo, setBaseInfo] = useState<BaseInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Typewriter effect state
    const [typingStage, setTypingStage] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [visibleSections, setVisibleSections] = useState<number[]>([]);
    const [visibleRules, setVisibleRules] = useState<{[key: number]: number[]}>({});

    // Fetch base info from API
    const fetchBaseInfo = async () => {
        if (!baseId) return;

        try {
            console.log('[WorldBankGroup] Fetching base info for:', baseId);
            const response = await fetch(`/api/worldbankgroup-base/${baseId}/job-status`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch base info');
            }

            console.log('[WorldBankGroup] Base info data:', data);

            const info: BaseInfo = {
                baseId: data.baseId,
                baseName: data.baseName,
                baseDescription: data.baseDescription,
                status: 'ACTIVE',
                createdAt: data.createdAt
            };

            // Add 4-second delay to give feeling of processing
            await new Promise(resolve => setTimeout(resolve, 4000));

            setBaseInfo(info);
            setIsLoading(false);
        } catch (err) {
            console.error('[WorldBankGroup] Error fetching base info:', err);
            setError(err instanceof Error ? err.message : 'Failed to load base info');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!baseId) {
            setError('No base ID provided');
            setIsLoading(false);
            return;
        }

        fetchBaseInfo();
    }, [baseId]);

    // Show all content immediately - no animations
    useEffect(() => {
        if (isLoading || !baseInfo || searchQuery.trim() !== "") return;

        // Set title immediately
        setDisplayedText("World Bank IPF Procurement Rules");
        setTypingStage(3);

        // Reveal all sections and rules immediately
        const allSections = procurementRulesContent.map((_, idx) => idx);
        const allRules: Record<number, number[]> = {};

        procurementRulesContent.forEach((section, sectionIdx) => {
            if (!section.isInfoSection && section.rules.length > 0) {
                allRules[sectionIdx] = section.rules.map((_, ruleIdx) => ruleIdx);
            }
        });

        setVisibleSections(allSections);
        setVisibleRules(allRules);
    }, [isLoading, baseInfo, searchQuery]);

    if (!baseId) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-error-600">No base ID provided</p>
                    <Button href="/worldbankgroup-admin/setup" className="mt-4">
                        Back to Setup
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <LoadingIndicator type="line-spinner" size="md" />
                    <p className="mt-4 text-tertiary">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="max-w-md text-center">
                    <FeaturedIcon icon={AlertTriangle} color="error" size="lg" className="mx-auto" />
                    <p className="mt-4 font-semibold text-primary">{error}</p>
                    <Button href="/worldbankgroup-admin/setup" className="mt-4">
                        Back to Setup
                    </Button>
                </div>
            </div>
        );
    }

    if (!baseInfo) {
        return null;
    }

    // Filter rules based on search query
    const filteredContent = searchQuery.trim() === ""
        ? procurementRulesContent
        : procurementRulesContent.filter(section => {
            const query = searchQuery.toLowerCase();
            return section.title.toLowerCase().includes(query) ||
                   section.rules.some(rule =>
                       rule.title.toLowerCase().includes(query) ||
                       rule.description.toLowerCase().includes(query) ||
                       rule.source.toLowerCase().includes(query)
                   );
          });

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: styleSheet }} />
            <div className="flex flex-col bg-primary lg:flex-row">
                <SidebarNavigationSlim
                activeUrl="/worldbankgroup-admin/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/worldbankgroup-admin/setup",
                        icon: Edit05,
                    },
                ]}
            />

            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                {/* Header */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <Button
                            size="sm"
                            color="tertiary"
                            iconLeading={ArrowLeft}
                            href={`/worldbankgroup-admin/base-created?baseId=${baseInfo.baseId}`}
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back to Base
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">WorldBankGroup Admin</p>
                            <p className="text-display-md font-semibold text-primary">{baseInfo.baseName}</p>
                            {baseInfo.baseDescription && (
                                <p className="text-sm text-tertiary mt-2">{baseInfo.baseDescription}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Status Card */}
                <div className="px-4 lg:px-8">
                    <div className="rounded-lg border border-success-300 bg-success-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <CheckCircle className="h-6 w-6 text-success-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-success-900">
                                        Knowledge Base Active
                                    </h3>
                                    <Badge color="success">Active</Badge>
                                </div>
                                <p className="mt-1 text-sm text-success-700">
                                    This knowledge base contains 190 procurement rules and requirements ready for use in project assessments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-4 lg:px-8">
                    <div className="flex items-center gap-3 rounded-lg border border-secondary bg-primary p-4">
                        <SearchSm className="h-5 w-5 text-tertiary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search procurement rules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-primary placeholder-tertiary outline-none"
                        />
                    </div>
                </div>

                {/* Procurement Rules Content */}
                <div className="px-4 lg:px-8">
                    <div className="rounded-lg border border-secondary bg-primary p-6">
                        {typingStage >= 1 && (
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon icon={BookOpen01} color="brand" size="md" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">
                                            {typingStage === 1 ? displayedText : "World Bank IPF Procurement Rules"}
                                            {typingStage === 1 && <span className="animate-pulse">|</span>}
                                        </h3>
                                        {typingStage >= 2 && (
                                            <p className="text-sm text-tertiary">Comprehensive list with document citations</p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    href="#"
                                    color="secondary"
                                    size="md"
                                    iconLeading={Edit05}
                                >
                                    Edit rule
                                </Button>
                            </div>
                        )}

                        {/* Source Documents */}
                        {typingStage >= 2 && (
                            <div className="mb-6 space-y-1 text-sm text-tertiary">
                                <p className="font-semibold">Source Documents:</p>
                                <p>1. <span className="font-semibold">PR2025:</span> World Bank Procurement Regulations for IPF Borrowers, 6th Edition, February 2025 (effective March 1, 2025)</p>
                                <p>2. <span className="font-semibold">EVAL2024:</span> Procurement Evaluation Report Templates, May 2024</p>
                            </div>
                        )}

                        {typingStage >= 3 && (
                            filteredContent.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-tertiary">No rules found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {filteredContent.map((section, idx) => {
                                        const isVisible = searchQuery.trim() !== "" || visibleSections.includes(idx);
                                        if (!isVisible) return null;

                                        return (
                                            <div key={idx} className="space-y-4">
                                                <div className="flex items-center gap-3 pb-3 border-b border-secondary">
                                                    <Badge color={section.priority === 'critical' ? 'error' : section.priority === 'high' ? 'warning' : section.priority === 'info' ? 'brand' : 'gray'}>
                                                        {section.priority.toUpperCase()}
                                                    </Badge>
                                                    <h4 className="text-md font-semibold text-primary">{section.title}</h4>
                                                </div>

                                                {section.isInfoSection && section.content ? (
                                                    <div className="rounded-lg border border-brand-200 bg-brand-50 p-6">
                                                        <div className="prose prose-sm max-w-none text-brand-900">
                                                            {section.content.split('\n\n').map((paragraph, pIdx) => {
                                                                // Helper function to parse inline bold markdown
                                                                const parseBold = (text: string) => {
                                                                    const parts = text.split(/(\*\*[^*]+\*\*)/g);
                                                                    return parts.map((part, idx) => {
                                                                        if (part.startsWith('**') && part.endsWith('**')) {
                                                                            return <span key={idx} className="font-semibold">{part.slice(2, -2)}</span>;
                                                                        }
                                                                        return part;
                                                                    });
                                                                };

                                                                if (paragraph === '---') {
                                                                    return <hr key={pIdx} className="my-4 border-brand-200" />;
                                                                }
                                                                if (paragraph.startsWith('**') && paragraph.endsWith('**') && !paragraph.includes(':')) {
                                                                    // Full paragraph bold (heading)
                                                                    const text = paragraph.slice(2, -2);
                                                                    return <h3 key={pIdx} className="font-semibold text-brand-900 mt-4 mb-2">{text}</h3>;
                                                                }
                                                                if (paragraph.startsWith('1. ') || paragraph.startsWith('2. ')) {
                                                                    return <p key={pIdx} className="text-sm text-brand-800 mb-2">{parseBold(paragraph)}</p>;
                                                                }
                                                                if (paragraph.startsWith('- ')) {
                                                                    return <p key={pIdx} className="text-sm text-brand-800 pl-4 mb-1">{parseBold(paragraph)}</p>;
                                                                }
                                                                return <p key={pIdx} className="text-sm text-brand-800 mb-2">{parseBold(paragraph)}</p>;
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {section.rules.map((rule, ruleIdx) => {
                                                            const isRuleVisible = searchQuery.trim() !== "" || (visibleRules[idx] || []).includes(ruleIdx);
                                                            if (!isRuleVisible) return null;

                                                            return (
                                                                <div key={ruleIdx} className="rounded-lg border border-secondary bg-secondary/30 p-4">
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                                                                            {rule.number}
                                                                        </span>
                                                                        <div className="flex-1 space-y-2">
                                                                            <p className="text-sm font-semibold text-primary">{rule.title}</p>
                                                                            <p className="text-sm text-tertiary">{rule.description}</p>
                                                                            <p className="text-xs text-tertiary italic">Source: {rule.source}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                        <p className="text-sm text-success-800">
                            <span className="font-semibold">Status: Active</span> — This knowledge base is ready for use in project assessments and compliance checking.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Building02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Organisation-Wide</p>
                                <p className="text-xs text-tertiary mt-1">Available for all project assessments</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">190 Rules Indexed</p>
                                <p className="text-xs text-tertiary mt-1">Complete procurement compliance framework</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Database02} color="brand" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Source Documents</p>
                                <p className="text-xs text-tertiary mt-1">PR2025 & EVAL2024 templates</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </>
    );
}

export default function KnowledgeBasePage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <LoadingIndicator type="line-spinner" size="md" />
            </div>
        }>
            <KnowledgeBaseContent />
        </Suspense>
    );
}
