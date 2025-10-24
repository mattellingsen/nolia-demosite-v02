"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorldBankGroupAssessDashboard } from "../../worldbankgroup-assess-dashboard";
import { ErrorBoundary, QueryErrorFallback } from "@/components/ErrorBoundary";
import WorldBankGroupAssessmentDetailPage from "./[assessmentId]/page";

function AssessPageContent() {
    const searchParams = useSearchParams();
    const assessmentId = searchParams?.get('assessmentId');

    // If there's an assessmentId query parameter, show the detail page
    // Otherwise show the dashboard
    if (assessmentId) {
        return <WorldBankGroupAssessmentDetailPage />;
    }

    return (
        <ErrorBoundary fallback={QueryErrorFallback}>
            <WorldBankGroupAssessDashboard />
        </ErrorBoundary>
    );
}

export default function WorldBankGroupAssessPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-tertiary">Loading...</div></div>}>
            <AssessPageContent />
        </Suspense>
    );
}
