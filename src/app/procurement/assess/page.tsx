import { ProcurementAssessDashboard } from "../../procurement-assess-dashboard";
import { ErrorBoundary, QueryErrorFallback } from "@/components/ErrorBoundary";

// Force dynamic rendering to prevent static caching in production
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AssessPage() {
    return (
        <ErrorBoundary fallback={QueryErrorFallback}>
            <ProcurementAssessDashboard />
        </ErrorBoundary>
    );
}