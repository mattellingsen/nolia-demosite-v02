"use client";

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
// Import fixed icons
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  File02,
  TrendUp02,
  Building08,
  Star07,
  Edit05,
  Send01,
  CheckDone01
} from '@untitledui/icons';
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";

interface Assessment {
  id: string;
  tenderId: string;
  organizationName: string;
  projectName?: string;
  assessmentType: 'AI_POWERED' | 'PATTERN_BASED' | 'MANUAL';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
  createdAt: string;
  updatedAt: string;
  tender: {
    id: string;
    name: string;
    description?: string;
  };
}

interface AssessmentResponse {
  success: boolean;
  assessment: Assessment;
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;

  const { data: response, isLoading, error } = useQuery<AssessmentResponse>({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch assessment');
      }
      return res.json();
    },
    enabled: !!assessmentId,
  });

  const assessment = response?.assessment;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
      case 'AI_POWERED': return 'AI-Powered Assessment';
      case 'PATTERN_BASED': return 'Pattern-Based Assessment';
      case 'MANUAL': return 'Manual Assessment';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'DRAFT': return 'gray';
      case 'FAILED': return 'error';
      default: return 'gray';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col bg-primary lg:flex-row">
        <SidebarNavigationSlim
          activeUrl="/procurement/assess"
          items={[
            { label: "Setup", href: "/procurement/setup", icon: Edit05 },
            { label: "Apply", href: "/procurement/apply", icon: Send01 },
            { label: "Assess", href: "/procurement/assess", icon: CheckDone01 },
            { label: "Analytics", href: "/procurement/analytics", icon: TrendUp02 },
          ]}
        />
        <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12 px-4 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <p className="text-lg text-tertiary">Loading assessment details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="flex flex-col bg-primary lg:flex-row">
        <SidebarNavigationSlim
          activeUrl="/procurement/assess"
          items={[
            { label: "Setup", href: "/procurement/setup", icon: Edit05 },
            { label: "Apply", href: "/procurement/apply", icon: Send01 },
            { label: "Assess", href: "/procurement/assess", icon: CheckDone01 },
            { label: "Analytics", href: "/procurement/analytics", icon: TrendUp02 },
          ]}
        />
        <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12 px-4 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-lg text-red-600 mb-4">Assessment not found</p>
              <Button onClick={() => router.push('/procurement/assess')} size="md" color="primary">
                Back to Assessments
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-primary lg:flex-row">
      <SidebarNavigationSlim
        activeUrl="/funding/assess"
        items={[
          { label: "Setup", href: "/funding/setup", icon: Edit05 },
          { label: "Apply", href: "/funding/apply", icon: Send01 },
          { label: "Assess", href: "/funding/assess", icon: CheckDone01 },
          { label: "Analytics", href: "/funding/analytics", icon: TrendUp02 },
        ]}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12 px-4 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => router.push('/procurement/assess')}
            size="sm"
            color="tertiary"
            iconLeading={ArrowLeft}
            className="self-start"
          >
            Back to Assessments
          </Button>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-display-md font-semibold text-primary">
                {assessment.organizationName}
              </h1>
              <BadgeWithDot
                size="md"
                type="pill-color"
                color={getStatusColor(assessment.status) as any}
                className="capitalize"
              >
                {assessment.status.toLowerCase()}
              </BadgeWithDot>
            </div>
            {assessment.projectName && assessment.projectName !== assessment.organizationName && (
              <p className="text-lg text-secondary">{assessment.projectName}</p>
            )}
          </div>
        </div>

        {/* Assessment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-secondary rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Star07 className="text-utility-brand-600 w-5 h-5" />
              <h3 className="text-sm font-medium text-primary">Overall Score</h3>
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar
                min={0}
                max={100}
                value={Math.round(assessment.overallScore || 0)}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-primary">
                {Math.round(assessment.overallScore || 0)}
              </span>
            </div>
          </div>

          <div className="bg-secondary rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Building08 className="text-utility-brand-600 w-5 h-5" />
              <h3 className="text-sm font-medium text-primary">Tender</h3>
            </div>
            <p className="text-md font-medium text-primary">{assessment.tender.name}</p>
          </div>

          <div className="bg-secondary rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <File02 className="text-utility-brand-600 w-5 h-5" />
              <h3 className="text-sm font-medium text-primary">Assessment Type</h3>
            </div>
            <p className="text-md font-medium text-primary">
              {getAssessmentTypeLabel(assessment.assessmentType)}
            </p>
          </div>

          <div className="bg-secondary rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-utility-brand-600 w-5 h-5" />
              <h3 className="text-sm font-medium text-primary">Assessed On</h3>
            </div>
            <p className="text-md font-medium text-primary">
              {formatDate(assessment.createdAt)}
            </p>
          </div>
        </div>

        {/* Detailed Assessment Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scoring Breakdown */}
          <div className="bg-secondary rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <TrendUp02 className="w-5 h-5" />
              Scoring Breakdown
            </h2>
            <div className="space-y-4">
              {assessment.scoringResults && typeof assessment.scoringResults === 'object' && (
                Object.entries(assessment.scoringResults).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-primary capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {typeof value === 'number'
                          ? Math.round(value)
                          : typeof value === 'object' && value !== null
                            ? JSON.stringify(value)
                            : String(value)}
                      </span>
                    </div>
                    {typeof value === 'number' && (
                      <ProgressBar min={0} max={100} value={Math.round(value)} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assessment Details */}
          <div className="bg-secondary rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Assessment Details
            </h2>
            <div className="space-y-4">
              {assessment.tender.description && (
                <div>
                  <h3 className="text-sm font-medium text-primary mb-1">Tender Description</h3>
                  <p className="text-sm text-tertiary">{assessment.tender.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-primary mb-1">Assessment ID</h3>
                <p className="text-sm font-mono text-tertiary">{assessment.id}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-primary mb-1">Last Updated</h3>
                <p className="text-sm text-tertiary">{formatDate(assessment.updatedAt)}</p>
              </div>

              {assessment.assessmentData && typeof assessment.assessmentData === 'object' &&
               Object.keys(assessment.assessmentData).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-primary mb-2">Additional Data</h3>
                  <div className="bg-tertiary rounded-lg p-3">
                    <pre className="text-xs text-secondary overflow-x-auto">
                      {JSON.stringify(assessment.assessmentData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}