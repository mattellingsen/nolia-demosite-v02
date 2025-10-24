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
    CheckDone01,
    SearchSm
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Badge } from "@/components/base/badges/badges";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cathlabRulesContent, documentHierarchyContent, criticalNotesContent } from "./cathlab-rules-content";

// Disable static generation
export const dynamic = 'force-dynamic';

interface ProjectInfo {
    projectId: string;
    projectName: string;
    projectDescription?: string;
    status: 'ACTIVE';
    createdAt: string;
}

function KnowledgeBaseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch project info from API
    const fetchProjectInfo = async () => {
        if (!projectId) return;

        try {
            console.log('[WorldBankGroup] Fetching project info for:', projectId);
            const response = await fetch(`/api/worldbankgroup-projects/${projectId}/job-status`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch project info');
            }

            console.log('[WorldBankGroup] Project info data:', data);

            const info: ProjectInfo = {
                projectId: data.projectId,
                projectName: data.projectName,
                projectDescription: data.projectDescription,
                status: 'ACTIVE',
                createdAt: data.createdAt
            };

            // Add 4-second delay to give feeling of processing
            await new Promise(resolve => setTimeout(resolve, 4000));

            setProjectInfo(info);
            setIsLoading(false);
        } catch (err) {
            console.error('[WorldBankGroup] Error fetching project info:', err);
            setError(err instanceof Error ? err.message : 'Failed to load project info');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!projectId) {
            setError('No project ID provided');
            setIsLoading(false);
            return;
        }

        fetchProjectInfo();
    }, [projectId]);

    if (!projectId) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-error-600">No project ID provided</p>
                    <Button href="/worldbankgroup/setup" className="mt-4">
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
                    <p className="mt-4 text-tertiary">Loading knowledge base...</p>
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
                    <Button href="/worldbankgroup/setup" className="mt-4">
                        Back to Setup
                    </Button>
                </div>
            </div>
        );
    }

    if (!projectInfo) {
        return null;
    }

    // Filter rules based on search query
    const filteredContent = searchQuery.trim() === ""
        ? cathlabRulesContent
        : cathlabRulesContent.filter(section => {
            const query = searchQuery.toLowerCase();
            return section.title.toLowerCase().includes(query) ||
                   section.rules.some(rule =>
                       rule.title.toLowerCase().includes(query) ||
                       rule.description.toLowerCase().includes(query) ||
                       rule.source.toLowerCase().includes(query)
                   );
          });

    const totalRules = cathlabRulesContent.reduce((sum, section) => sum + section.rules.length, 0);

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbankgroup/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/worldbankgroup/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Assess",
                        href: "/worldbankgroup/assess",
                        icon: CheckDone01,
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
                            href={`/worldbankgroup/project-created?projectId=${projectInfo.projectId}`}
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back to Project
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">WorldBankGroup Project Knowledge Base</p>
                            <p className="text-display-md font-semibold text-primary">{projectInfo.projectName}</p>
                            {projectInfo.projectDescription && (
                                <p className="text-sm text-tertiary mt-2">{projectInfo.projectDescription}</p>
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
                                    This project-specific knowledge base contains {totalRules} procurement rules and requirements ready for use in bid assessments.
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
                        <div className="flex items-center gap-3 mb-6">
                            <FeaturedIcon icon={BookOpen01} color="brand" size="md" />
                            <div>
                                <h3 className="text-lg font-semibold text-primary">
                                    Cathlab Procurement Evaluation Rules
                                </h3>
                                <p className="text-sm text-tertiary">Comprehensive list with document citations</p>
                            </div>
                        </div>

                        {/* Document Reference Header */}
                        <div className="mb-6 space-y-1 text-sm text-tertiary">
                            <p><span className="font-semibold">Document Reference:</span> RFB No. ID-PMU SIHREN-395529-GO-RFB</p>
                            <p><span className="font-semibold">Project:</span> Indonesia Health Systems Strengthening Project</p>
                            <p><span className="font-semibold">Original Issue Date:</span> 11 March 2024</p>
                            <p><span className="font-semibold">Latest Amendment:</span> Amendment 5 issued 30 April 2024</p>
                        </div>

                        {filteredContent.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-tertiary">No rules found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {filteredContent.map((section, idx) => (
                                    <div key={section.id} className="space-y-4">
                                        <div className="flex items-center gap-3 pb-3 border-b border-secondary">
                                            <Badge color={section.badgeColor || "gray"}>
                                                {section.badge ? section.badge.toUpperCase() : ""}
                                            </Badge>
                                            <h4 className="text-md font-semibold text-primary">{section.title}</h4>
                                        </div>

                                        {section.isInfoSection ? (
                                            <div className="rounded-lg border border-brand-200 bg-brand-50 p-6">
                                                <div className="prose prose-sm max-w-none text-brand-900">
                                                    {((section.id === 'section-info-1' ? documentHierarchyContent : criticalNotesContent) || '').split('\n\n').map((paragraph, pIdx) => {
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
                                                        if (paragraph.startsWith('1. ') || paragraph.startsWith('2. ') || paragraph.startsWith('3. ') || paragraph.startsWith('4. ') || paragraph.startsWith('5. ') || paragraph.startsWith('6. ') || paragraph.startsWith('7. ')) {
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
                                                {section.rules.map((rule, ruleIdx) => (
                                                    <div key={ruleIdx} className="rounded-lg border border-secondary bg-secondary/30 p-4">
                                                        <div className="flex items-start gap-3">
                                                            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                                                                {rule.number}
                                                            </span>
                                                            <div className="flex-1 space-y-2">
                                                                <p className="text-sm font-semibold text-primary">{rule.title}</p>
                                                                <p className="text-sm text-tertiary">{rule.description}</p>
                                                                {rule.requirements && rule.requirements.length > 0 && (
                                                                    <ul className="ml-4 space-y-1 text-sm text-tertiary">
                                                                        {rule.requirements.map((req, reqIdx) => (
                                                                            <li key={reqIdx} className="flex gap-2">
                                                                                <span>•</span>
                                                                                <span>{req}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                                <p className="text-xs text-tertiary italic">Source: {rule.source}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                        <p className="text-sm text-success-800">
                            <span className="font-semibold">Status: Active</span> — This project-specific knowledge base has been successfully
                            processed and is ready for use in bid assessments.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Building02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Project-Specific</p>
                                <p className="text-xs text-tertiary mt-1">Cathlab procurement rules for this project</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Compliance Ready</p>
                                <p className="text-xs text-tertiary mt-1">All rules indexed for bid evaluation</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={BookOpen01} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">{totalRules} Rules</p>
                                <p className="text-xs text-tertiary mt-1">Critical, high priority, and operational requirements</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProjectKnowledgeBasePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <LoadingIndicator type="line-spinner" size="md" />
                    <p className="mt-4 text-tertiary">Loading...</p>
                </div>
            </div>
        }>
            <KnowledgeBaseContent />
        </Suspense>
    );
}
