"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckDone01, Edit05, CheckCircle, Shield01, FileCheck02 } from "@untitledui/icons";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

// Typewriter hook - character by character with initial delay
const useTypewriter = (text: string, speed: number = 3, delay: number = 2000) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!text) {
            setIsComplete(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);

        // Add initial delay before starting typewriter
        const delayTimeout = setTimeout(() => {
            let currentIndex = 0;

            const timer = setInterval(() => {
                if (currentIndex < text.length) {
                    setDisplayedText(text.substring(0, currentIndex + 1));
                    currentIndex++;
                } else {
                    setIsComplete(true);
                    clearInterval(timer);
                }
            }, speed);

            return () => clearInterval(timer);
        }, delay);

        return () => clearTimeout(delayTimeout);
    }, [text, speed, delay]);

    return { displayedText, isComplete };
};

// TypewriterTemplate component with markdown-like parsing
const TypewriterTemplate: React.FC<{ content: string }> = ({ content }) => {
    const { displayedText, isComplete } = useTypewriter(content, 8);

    return (
        <div className="space-y-2">
            {displayedText.split('\n').map((line, idx) => {
                // Single # = Display medium bold
                if (line.startsWith('# ')) {
                    return <h1 key={idx} className="font-display text-display-md font-bold text-gray-900 mt-4 mb-2">{line.substring(2)}</h1>;
                }
                // Double ## = Text XL Bold
                if (line.startsWith('## ')) {
                    return <h2 key={idx} className="font-sans text-xl font-bold text-gray-900 mt-3 mb-1">{line.substring(3)}</h2>;
                }
                // Double ** = Text small bold
                if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                        <p key={idx} className="font-sans text-sm text-gray-700">
                            {parts.map((part, i) =>
                                i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
                            )}
                        </p>
                    );
                }
                // Regular text
                if (line.trim()) {
                    return <p key={idx} className="font-sans text-sm text-gray-700">{line}</p>;
                }
                // Empty line
                return <div key={idx} className="h-2" />;
            })}
            {!isComplete && <span className="inline-block w-1 h-4 bg-brand-600 animate-pulse ml-1" />}
        </div>
    );
};

// Import cathlab content
import { cathlabEvaluationContent } from './cathlab-content';

// Hardcoded assessment content for each demo assessment
const assessmentContent: Record<string, string> = {
    "wbg-assessment-01": cathlabEvaluationContent,

    "wbg-assessment-02": `# Kenya Education Advancement - Project Assessment

## Executive Summary
The Kenya Education Advancement Program demonstrates exceptional alignment with World Bank Group education sector priorities. This initiative shows outstanding potential for transformative impact in secondary education quality improvement.

## Overall Assessment Score: 92/100

## Key Strengths

**Pedagogical Framework**
The program employs evidence-based teaching methodologies aligned with international best practices. The curriculum design shows strong integration of 21st-century skills development with core academic competencies.

**Teacher Development**
Comprehensive teacher training and continuous professional development programs are well-articulated. The cascading training model ensures sustainability and scalability across target regions.

**Technology Integration**
Innovative use of digital learning platforms and adaptive learning technologies demonstrates forward-thinking approach to education delivery in resource-constrained environments.

**Gender Equity**
Strong focus on girls' education with targeted interventions to address barriers to female participation in STEM subjects.

## Areas for Improvement

**Infrastructure Readiness**
Some target schools lack adequate physical infrastructure and reliable electricity to fully leverage digital learning components.

**Budget Allocation**
Administrative overhead appears slightly elevated compared to direct beneficiary spending in certain program components.

## Recommendations

- Accelerate infrastructure upgrade timeline for priority schools
- Explore solar power solutions for off-grid educational facilities
- Optimize administrative cost structure without compromising program quality
- Strengthen partnerships with private sector for technology provision

## Conclusion
This is an exemplary education sector project with clear potential for significant positive impact. The strong pedagogical foundation combined with innovative delivery mechanisms positions this program for success.`,

    "wbg-assessment-03": `# Bangladesh Health Services - Project Assessment

## Executive Summary
The Bangladesh Primary Healthcare Strengthening Initiative presents a comprehensive approach to improving healthcare access and quality at the community level. The project demonstrates solid planning with particular strengths in community health worker programs.

## Overall Assessment Score: 78/100

## Key Strengths

**Community Health Worker Model**
Well-designed community health worker training and deployment strategy that leverages Bangladesh's successful experience with community-based healthcare delivery.

**Primary Care Focus**
Appropriate emphasis on preventive care and primary health services, which are cost-effective and have demonstrated impact in similar contexts.

**Supply Chain Management**
Robust pharmaceutical and medical supply chain systems with clear accountability mechanisms and quality assurance protocols.

## Areas for Improvement

**Infrastructure Gaps**
Several target facilities require significant renovation and equipment upgrades that are not fully costed in current budget allocations.

**Referral System**
The linkages between primary care facilities and secondary/tertiary hospitals need strengthening to ensure continuity of care for complex cases.

**Data Systems**
Health information systems are fragmented across different program components. Integration is needed for effective monitoring and decision-making.

**Financial Sustainability**
Long-term financing mechanisms for recurrent costs are not clearly articulated, raising concerns about program sustainability post-project period.

## Recommendations

- Conduct comprehensive facility assessment and update budget accordingly
- Develop integrated health information system architecture
- Establish formal referral protocols and strengthen facility partnerships
- Create sustainability roadmap with government cost-sharing commitments
- Explore health insurance schemes for long-term financing

## Conclusion
While this project has several strong components, particularly around community health workers, there are notable gaps in infrastructure planning and long-term sustainability that require attention before proceeding to implementation.`
};

function WorldBankGroupAssessmentDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const assessmentId = searchParams?.get('assessmentId') || '';

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get the content for this assessment
    const content = assessmentContent[assessmentId] || "Assessment not found";

    // Extract project name from first line
    const projectName = content.split('\n')[0].replace('# ', '').split(' - ')[0];

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbankgroup/assess"
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
                        <Button size="sm" color="tertiary" iconLeading={ArrowLeft} href="/worldbankgroup/assess" className="self-start [&_svg]:!text-brand-600">
                            Back to Assessments
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">World Bank Group Assessment</p>
                            <p className="text-display-md font-semibold text-primary">{projectName}</p>
                        </div>
                    </div>
                </div>

                {/* Assessment Complete Status Card */}
                <div className="px-4 lg:px-8">
                    <div className="rounded-lg border border-success-300 bg-success-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <CheckCircle className="h-6 w-6 text-success-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-success-900">
                                        Assessment Complete
                                    </h3>
                                    {mounted && <Badge color="success">Complete</Badge>}
                                </div>
                                <p className="mt-1 text-sm text-success-700">
                                    AI-powered evaluation of procurement documentation against World Bank standards has been completed.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assessment Report Content */}
                <div className="px-4 lg:px-8">
                    <div className="max-w-none">
                        {/* Output Template - White Background */}
                        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200 ring-inset">
                            <TypewriterTemplate content={content} />
                        </div>
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                        <p className="text-sm text-success-800">
                            <span className="font-semibold">Status: Complete</span> — This assessment has been successfully
                            completed and is ready for review.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={FileCheck02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">AI-Powered Assessment</p>
                                <p className="text-xs text-tertiary mt-1">Evaluated against World Bank standards</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Compliance Verified</p>
                                <p className="text-xs text-tertiary mt-1">All documents reviewed for compliance requirements</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap in Suspense to handle useSearchParams
export default function WorldBankGroupAssessmentDetailPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-tertiary">Loading...</div></div>}>
            <WorldBankGroupAssessmentDetailPage />
        </Suspense>
    );
}
