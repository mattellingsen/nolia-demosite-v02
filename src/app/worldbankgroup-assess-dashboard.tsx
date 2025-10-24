"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import {
    ArrowRight,
    CheckDone01,
    Edit05,
    FilterLines,
    Flash,
    Plus,
    Send01,
    Trash01,
    TrendUp02,
    UploadCloud01,
    Eye,
    MessageSmileSquare,
    BarChart01,
} from "@untitledui/icons";
import { FileGenericIcon, getFileIcon } from "@/components/icons/FileIcons";
import type { SortDescriptor } from "react-aria-components";
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis } from "recharts";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { PaginationPageDefault } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

// Helper functions for formatting
const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const lineData = [
    {
        date: "2025-01-01",
        A: 120,
        B: 80,
    },
    {
        date: "2025-02-01",
        A: 70,
        B: 60,
    },
    {
        date: "2025-03-01",
        A: 10,
        B: 35,
    },
    {
        date: "2025-04-01",
        A: 40,
        B: 45,
    },
    {
        date: "2025-05-01",
        A: 70,
        B: 0,
    },
    {
        date: "2025-06-01",
        A: 50,
        B: 0,
    },
    {
        date: "2025-07-01",
        A: 60,
        B: 70,
    },
    {
        date: "2025-08-01",
        A: 75,
        B: 50,
    },
    {
        date: "2025-09-01",
        A: 30,
        B: 30,
    },
    {
        date: "2025-10-01",
        A: 110,
        B: 50,
    },
    {
        date: "2025-11-01",
        A: 110,
        B: 60,
    },
    {
        date: "2025-12-01",
        A: 85,
        B: 50,
    },
];

// Hardcoded demo assessments for WorldBankGroup
const demoAssessments = [
    {
        id: "wbg-assessment-processing",
        vendor: {
            name: "Processing...",
            website: "Assessment in progress",
            fileType: "pdf",
            mimeType: "application/pdf",
        },
        rating: 0,
        change: "N/A",
        changeTrend: "neutral" as const,
        lastAssessed: new Date().getTime(),
        categories: ["Processing"],
        projectName: "Processing Assessment",
        isProcessing: true,
    },
    {
        id: "wbg-assessment-01",
        vendor: {
            name: "Cathlab Equipment",
            website: "ID-PMU SIHREN-395529-GO-RFB",
            fileType: "pdf",
            mimeType: "application/pdf",
        },
        rating: 100,
        change: "N/A",
        changeTrend: "neutral" as const,
        lastAssessed: new Date(2025, 9, 27).getTime(), // October 27, 2025 (month is 0-indexed)
        categories: ["Goods"],
        projectName: "Cathlab Equipment",
        isProcessing: false,
    },
    {
        id: "wbg-assessment-02",
        vendor: {
            name: "MRI 1.5T",
            website: "ID-PMU SIHREN-395566-GO-RFB",
            fileType: "pdf",
            mimeType: "application/pdf",
        },
        rating: 100,
        change: "N/A",
        changeTrend: "neutral" as const,
        lastAssessed: new Date(2025, 9, 27).getTime(), // October 27, 2025 (month is 0-indexed)
        categories: ["Goods"],
        projectName: "MRI 1.5T",
        isProcessing: false,
    },
];

export const WorldBankGroupAssessDashboard = () => {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
    const [mounted, setMounted] = useState(false);
    const [realAssessments, setRealAssessments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Fetch assessments from database
    const fetchAssessments = async () => {
        try {
            const response = await fetch('/api/worldbankgroup-assessments/list');
            const data = await response.json();

            if (data.success) {
                console.log('✅ Loaded assessments:', data.assessments);
                setRealAssessments(data.assessments);
            }
        } catch (error) {
            console.error('❌ Failed to load assessments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchAssessments();
    }, []);

    // Delete assessment handler
    const handleDeleteAssessment = async (assessmentId: string) => {
        if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/worldbankgroup-assessments/${assessmentId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Assessment deleted successfully');
                // Refresh the assessments list
                await fetchAssessments();
            } else {
                alert(`Failed to delete assessment: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Failed to delete assessment:', error);
            alert('Failed to delete assessment. Please try again.');
        }
    };

    const sortedItems = useMemo(() => {
        // Combine real assessments with demo assessments (filter out demo processing item)
        const demoWithoutProcessing = demoAssessments.filter(a => !(a as any).isProcessing);

        // Transform real assessments to match the expected format
        const transformedRealAssessments = realAssessments.map(assessment => ({
            id: assessment.id,
            vendor: {
                name: assessment.projectName || assessment.organizationName, // Always show project name
                website: assessment.isProcessing ? 'Assessment in progress' : (assessment.filename || 'Project assessment'),
                fileType: "pdf",
                mimeType: "application/pdf",
            },
            rating: assessment.overallScore || 0,
            change: "N/A",
            changeTrend: "neutral" as const,
            lastAssessed: new Date(assessment.createdAt).getTime(),
            categories: [assessment.isProcessing ? "Goods" : "Assessment"], // Changed "Processing" to "Goods"
            projectName: assessment.projectName || assessment.organizationName,
            isProcessing: assessment.isProcessing,
        }));

        // Combine: real assessments first, then demo assessments
        const items = [...transformedRealAssessments, ...demoWithoutProcessing];

        if (!sortDescriptor) return items;

        return items.toSorted((a, b) => {
            let first = a[sortDescriptor.column as keyof typeof a];
            let second = b[sortDescriptor.column as keyof typeof b];

            // Extract name from objects if needed
            if (typeof first === "object" && first && "name" in first) {
                first = first.name;
            }
            if (typeof second === "object" && second && "name" in second) {
                second = second.name;
            }

            // Handle numbers
            if (typeof first === "number" && typeof second === "number") {
                return sortDescriptor.direction === "ascending" ? first - second : second - first;
            }

            // Handle strings
            if (typeof first === "string" && typeof second === "string") {
                const result = first.localeCompare(second);
                return sortDescriptor.direction === "ascending" ? result : -result;
            }

            return 0;
        });
    }, [sortDescriptor, realAssessments]);

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
                <div className="flex flex-col flex-wrap items-start justify-between gap-x-4 gap-y-5 px-4 lg:flex-row lg:px-8">
                    <div className="flex flex-col gap-1">
                        <p className="text-md font-semibold text-tertiary">World Bank Group</p>
                        <div className="flex items-center gap-3">
                            <p className="text-display-md font-semibold text-primary">Project Assessment</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 lg:px-8">
                    <div className="flex h-54 flex-col gap-2">
                        <ResponsiveContainer className="h-full">
                            <AreaChart
                                data={lineData}
                                className="text-tertiary [&_.recharts-text]:text-xs"
                                margin={{
                                    left: 5,
                                    right: 5,
                                }}
                            >
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="currentColor" className="text-utility-brand-700" stopOpacity="0.7" />
                                        <stop offset="95%" stopColor="currentColor" className="text-utility-brand-700" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />

                                <XAxis
                                    fill="currentColor"
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={10}
                                    interval="preserveStartEnd"
                                    dataKey="date"
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        return months[date.getMonth()];
                                    }}
                                />

                                <RechartsTooltip
                                    content={<ChartTooltipContent />}
                                    labelFormatter={(value) => {
                                        const date = new Date(value);
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        return `${months[date.getMonth()]} ${date.getFullYear()}`;
                                    }}
                                    cursor={{
                                        className: "stroke-utility-brand-600 stroke-2",
                                    }}
                                />

                                <Area
                                    isAnimationActive={false}
                                    className="text-utility-brand-600 [&_.recharts-area-area]:translate-y-[6px] [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]"
                                    dataKey="A"
                                    name="Infrastructure"
                                    type="monotone"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    fill="url(#gradient)"
                                    fillOpacity={0.1}
                                    activeDot={{
                                        className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
                                    }}
                                />

                                <Area
                                    isAnimationActive={false}
                                    className="text-utility-success-400 [&_.recharts-area-area]:translate-y-[6px] [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]"
                                    dataKey="B"
                                    name="Education"
                                    type="monotone"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    fill="none"
                                    activeDot={{
                                        className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex flex-col gap-6 px-4 lg:px-8">
                    <div className="flex flex-col flex-wrap justify-between gap-x-4 gap-y-6 lg:flex-row lg:items-center">
                        <p className="text-lg font-semibold text-primary">Projects assessed</p>
                        <div className="flex gap-3">
                            {mounted && <DateRangePicker />}
                            <Button size="md" color="secondary" iconLeading={FilterLines}>
                                Apply filter
                            </Button>
                        </div>
                    </div>

                    <TableCard.Root className="flex flex-col">
                        {isLoading ? (
                            <div className="p-8 text-center text-tertiary">Loading assessments...</div>
                        ) : mounted && sortedItems && sortedItems.length > 0 ? (
                            <Table
                                key={`worldbankgroup-assessments-table-${sortedItems.length}`}
                                aria-label="WorldBankGroup project assessments"
                                selectionMode="multiple"
                                sortDescriptor={sortDescriptor}
                                onSortChange={setSortDescriptor}
                            >
                                <Table.Header className="bg-primary">
                                    <Table.Head id="vendor" isRowHeader allowsSorting label="Project" className="w-full" />
                                    <Table.Head id="rating" label="Rating" className="min-w-30 lg:min-w-40 lg:pl-3" />
                                    <Table.Head id="lastAssessed" label="Assessed on" />
                                    <Table.Head id="categories" label="Category" />
                                    <Table.Head id="actions" />
                                </Table.Header>
                                <Table.Body items={sortedItems}>
                                {(assessment) => (
                                    <Table.Row id={assessment.id} highlightSelectedRow={false}>
                                        <Table.Cell className="lg:px-0">
                                            <div className="group flex items-center gap-3">
                                                {(() => {
                                                    if (assessment.vendor.mimeType) {
                                                        const IconComponent = getFileIcon(assessment.vendor.mimeType);
                                                        return <IconComponent width={40} height={40} />;
                                                    }
                                                    return <FileGenericIcon width={40} height={40} />;
                                                })()}
                                                <div>
                                                    <p className="text-sm font-medium text-primary">{assessment.vendor.name}</p>
                                                    <p className="text-sm text-tertiary">{assessment.vendor.website}</p>
                                                </div>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="lg:pl-3">
                                            <div className="flex items-center gap-3">
                                                {(assessment as any).isProcessing ? (
                                                    <span className="text-sm text-tertiary">Processing...</span>
                                                ) : (
                                                    <>
                                                        <ProgressBar min={0} max={100} value={assessment.rating} />
                                                        <span className="hidden text-sm font-medium text-secondary lg:inline">{assessment.rating}</span>
                                                    </>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="text-nowrap">{formatDate(assessment.lastAssessed)}</Table.Cell>
                                        <Table.Cell>
                                            <div className="flex gap-1">
                                                <BadgeWithDot
                                                    size="sm"
                                                    type="pill-color"
                                                    color={(assessment as any).isProcessing ? "warning" : "success"}
                                                    className="capitalize"
                                                >
                                                    {assessment.categories[0]}
                                                </BadgeWithDot>
                                            </div>
                                        </Table.Cell>

                                        <Table.Cell className="px-4">
                                            <div className="flex justify-end gap-0.5">
                                                {mounted && (
                                                    <>
                                                        {(assessment as any).isProcessing ? (
                                                            <ButtonUtility
                                                                size="xs"
                                                                color="tertiary"
                                                                tooltip="View Processing Status"
                                                                icon={Eye}
                                                                onClick={() => router.push(`/worldbankgroup/applications-upload?assessmentId=${assessment.id}`)}
                                                            />
                                                        ) : (
                                                            <ButtonUtility
                                                                size="xs"
                                                                color="tertiary"
                                                                tooltip="View Details"
                                                                icon={Eye}
                                                                onClick={() => router.push(`/worldbankgroup/assess?assessmentId=${assessment.id}`)}
                                                            />
                                                        )}
                                                        <ButtonUtility
                                                            size="xs"
                                                            color="tertiary"
                                                            tooltip="Delete"
                                                            icon={Trash01}
                                                            onClick={() => handleDeleteAssessment(assessment.id)}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                            </Table>
                        ) : (
                            <div className="p-8 text-center text-tertiary">
                                <p className="mb-4">No assessments found</p>
                                <p className="text-sm">Upload and assess projects to see them here</p>
                            </div>
                        )}
                    </TableCard.Root>
                </div>
            </main>
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 border-t border-secondary px-6 pt-6">
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-semibold text-primary">Actions</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <a href="/worldbankgroup/applications-upload" className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={UploadCloud01} className="bg-utility-blue-100 text-utility-blue-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-blue-700">Upload New Assessment</p>
                                <ArrowRight className="text-utility-blue-700 w-4 h-4" />
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
