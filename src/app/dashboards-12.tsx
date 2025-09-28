"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useFunds } from "@/hooks/useFunds";
import { useAssessments } from "@/hooks/useAssessments";
import {
    ArrowRight,
    CheckDone01,
    Edit01,
    Edit05,
    FilterLines,
    Flash,
    Monitor04,
    Plus,
    Send01,
    Trash01,
    TrendUp02,
    UploadCloud01,
    Eye,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis } from "recharts";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Carousel } from "@/components/application/carousel/carousel-base";
import { CarouselIndicator } from "@/components/application/carousel/carousel.demo";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { PaginationPageDefault } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { AvatarProfilePhoto } from "@/components/base/avatar/avatar-profile-photo";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { MastercardIcon, VisaIcon } from "@/components/foundations/payment-icons";
import { cx } from "@/utils/cx";

// Helper functions for formatting
const formatCurrency = (amount: number): string => {
    const formatted = Math.abs(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });

    return amount >= 0 ? `+ ${formatted}` : `- ${formatted}`;
};

const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    return `${days[date.getDay()]} ${hour12}:${minutes}${ampm}`;
};

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

const movements = [
    {
        id: "vendor-01",
        vendor: {
            name: "CloudScale Analytics",
            website: "Distributed Computing for Genomics Analysis",
            logoUrl: "/images/funding/file-type-icon-pdf.png",
        },
        rating: 60,
        change: "5%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 22).getTime(),
        categories: ["New to R&D", "Customer data", "Admin", "+4"],
    },
    {
        id: "vendor-02",
        vendor: {
            name: "Digital Health Solutions",
            website: "Point-of-care device development",
            logoUrl: "/images/funding/file-type-icon-pdf.png",
        },
        rating: 72,
        change: "4%",
        changeTrend: "negative",
        lastAssessed: new Date(2025, 0, 20).getTime(),
        categories: ["New to R&D", "Business data", "Admin", "+4"],
    },
    {
        id: "vendor-03",
        vendor: {
            name: "KiwiMed Diagnostics Ltd",
            website: "Point-of-care device development",
            logoUrl: "/images/funding/file-type-icon-doc.png",
        },
        rating: 78,
        change: "6%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 24).getTime(),
        categories: ["New to R&D", "Customer data", "Financials"],
    },
    {
        id: "vendor-04",
        vendor: {
            name: "MicroProcessor Systems",
            website: "Energy-Efficient IoT Microprocessor Architecture Development",
            logoUrl: "/images/funding/file-type-icon-pdf.png",
        },
        rating: 38,
        change: "8%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 26).getTime(),
        categories: ["New to R&D", "Database access", "Admin"],
    },
    {
        id: "vendor-05",
        vendor: {
            name: "Precision Horticulture Ltd",
            website: "Precision Crop Monitoring and Yield Prediction Systems",
            logoUrl: "/images/funding/file-type-icon-doc.png",
        },
        rating: 42,
        change: "1%",
        changeTrend: "negative",
        lastAssessed: new Date(2025, 0, 18).getTime(),
        categories: ["New to R&D", "Salesforce", "Admin", "+4"],
    },
    {
        id: "vendor-06",
        vendor: {
            name: "Precision Optics NZ",
            website: "Advanced Optical Coating Development Programme",
            logoUrl: "/images/funding/file-type-icon-doc.png",
        },
        rating: 66,
        change: "6%",
        changeTrend: "negative",
        lastAssessed: new Date(2025, 0, 28).getTime(),
        categories: ["New to R&D", "Business data", "Admin", "+4"],
    },
    {
        id: "vendor-07",
        vendor: {
            name: "Wellington Robotics Ltd",
            website: "Autonomous Robotic Systems for Precision Agriculture",
            logoUrl: "/images/funding/file-type-icon-pdf.png",
        },
        rating: 91,
        change: "2%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 16).getTime(),
        categories: ["New to R&D", "Customer data", "Financials"],
    },
];


export const Dashboard12 = () => {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
    const [mounted, setMounted] = useState(false);
    const [directFetchResult, setDirectFetchResult] = useState<string>('Not tested');
    const router = useRouter();

    // Direct API test on mount
    useEffect(() => {
        fetch('/api/assessments')
            .then(response => response.json())
            .then(data => {
                setDirectFetchResult(`Success: ${data.assessments?.length || 0} assessments`);
            })
            .catch(error => {
                setDirectFetchResult(`Error: ${error.message}`);
            });
    }, []);

    // Fetch funds data for the right sidebar
    const { data: funds = [], isLoading: fundsLoading, error: fundsError } = useFunds();
    const activeFunds = funds.filter(fund => fund.status === 'ACTIVE');

    // Fetch assessments data - only after client mount
    const assessmentsQuery = useAssessments();
    const { data: assessmentsResponse, isLoading: assessmentsLoading, error: assessmentsError } = assessmentsQuery;


    const assessments = assessmentsResponse?.assessments || [];

    // Transform assessments data into the format expected by the table
    const transformedAssessments = useMemo(() => {

        if (!Array.isArray(assessments) || assessments.length === 0) {
            return [];
        }

        try {
            const transformed = assessments.map((assessment, index) => {

                // Validate assessment structure
                if (!assessment || typeof assessment !== 'object') {
                    console.error(`❌ Dashboard12: Invalid assessment at index ${index}:`, assessment);
                    throw new Error(`Invalid assessment at index ${index}`);
                }

                // Check for required fields
                const requiredFields = ['id', 'organizationName', 'assessmentType', 'createdAt', 'fund'];
                for (const field of requiredFields) {
                    if (!(field in assessment)) {
                        console.error(`❌ Dashboard12: Missing required field '${field}' in assessment:`, assessment);
                        throw new Error(`Missing required field '${field}' in assessment`);
                    }
                }

                // Determine assessment type icon based on filename or format
                const logoUrl = assessment.assessmentType === 'AI_POWERED'
                    ? "/images/funding/file-type-icon-pdf.png"
                    : "/images/funding/file-type-icon-doc.png";

                // Get organization name and project name with flexible naming
                const organizationName = assessment.organizationName;
                const projectName = assessment.projectName || organizationName;

                // Handle Decimal type from Prisma properly
                let overallScore = 0;
                if (assessment.overallScore !== null && assessment.overallScore !== undefined) {
                    // Handle both Decimal object and plain number
                    if (typeof assessment.overallScore === 'object' && 'toNumber' in assessment.overallScore) {
                        overallScore = (assessment.overallScore as any).toNumber();
                    } else {
                        overallScore = parseFloat(String(assessment.overallScore));
                    }
                }

                const result = {
                    id: assessment.id,
                    vendor: {
                        name: organizationName,
                        website: projectName,
                        logoUrl: logoUrl,
                    },
                    rating: Math.round(overallScore),
                    change: "N/A", // We don't have change tracking yet
                    changeTrend: "neutral" as const,
                    lastAssessed: new Date(assessment.createdAt).getTime(),
                    categories: [assessment.fund.name],
                    fundName: assessment.fund.name,
                    assessmentType: assessment.assessmentType,
                };

                return result;
            });

            return transformed;
        } catch (transformError) {
            console.error('❌ Dashboard12: Error during transformation:', transformError);
            // Return empty array on transformation error to prevent crashes
            return [];
        }
    }, [assessments]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const sortedItems = useMemo(() => {
        const items = transformedAssessments.length > 0 ? transformedAssessments : movements;
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
    }, [transformedAssessments, sortDescriptor]);

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/funding/assess"
                items={[
                    {
                        label: "Setup",
                        href: "/funding/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Apply",
                        href: "/funding/apply",
                        icon: Send01,
                    },
                    {
                        label: "Assess",
                        href: "/funding/assess",
                        icon: CheckDone01,
                    },
                    {
                        label: "Analytics",
                        href: "/funding/analytics",
                        icon: TrendUp02,
                    },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                <div className="flex flex-col flex-wrap items-start justify-between gap-x-4 gap-y-5 px-4 lg:flex-row lg:px-8">
                    <div className="flex flex-col gap-1">
                        <p className="text-md font-semibold text-tertiary">Kia ora Kylee</p>
                        <div className="flex items-center gap-3">
                            <p className="text-display-md font-semibold text-primary">Application Assessment</p>
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
                                    name="New to R&D"
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
                                    name="Student Exp"
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
                        <p className="text-lg font-semibold text-primary">Applications received</p>
                        <div className="flex gap-3">
                            {mounted && <DateRangePicker />}
                            <Button size="md" color="secondary" iconLeading={FilterLines}>
                                Apply filter
                            </Button>
                        </div>
                    </div>

                    <TableCard.Root className="flex flex-col">
                        {mounted && sortedItems && sortedItems.length > 0 && !assessmentsLoading ? (
                            <Table
                                key={`vendor-movements-table-${sortedItems.length}`}
                                aria-label="Vendor movements"
                                selectionMode="multiple"
                                sortDescriptor={sortDescriptor}
                                onSortChange={setSortDescriptor}
                                selectedKeys={new Set(["vendor-01", "vendor-02", "vendor-03"])}
                            >
                                <Table.Header className="bg-primary">
                                    <Table.Head id="vendor" isRowHeader allowsSorting label="Vendor" className="w-full" />
                                    <Table.Head id="rating" label="Rating" className="min-w-30 lg:min-w-52.5 lg:pl-3" />
                                    <Table.Head id="lastAssessed" label="Assessed on" />
                                    <Table.Head id="categories" label="Fund" />
                                    <Table.Head id="actions" />
                                </Table.Header>
                                <Table.Body items={sortedItems}>
                                {(movement) => (
                                    <Table.Row id={movement.id} highlightSelectedRow={false}>
                                        <Table.Cell className="lg:px-0">
                                            <div className="group flex items-center gap-3">
                                                <img src={movement.vendor.logoUrl} alt={movement.vendor.name} className="h-10 w-10" />
                                                <div>
                                                    <p className="text-sm font-medium text-primary">{movement.vendor.name}</p>
                                                    <p className="text-sm text-tertiary">{movement.vendor.website}</p>
                                                </div>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="lg:pl-3">
                                            <div className="flex items-center gap-3">
                                                <ProgressBar min={0} max={100} value={movement.rating} />
                                                <span className="hidden text-sm font-medium text-secondary lg:inline">{movement.rating}</span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="text-nowrap">{formatDate(movement.lastAssessed)}</Table.Cell>
                                        <Table.Cell>
                                            <div className="flex gap-1">
                                                <BadgeWithDot
                                                    size="sm"
                                                    type="pill-color"
                                                    color="success"
                                                    className="capitalize"
                                                >
                                                    {(movement as any).fundName || "New to R&D Grant"}
                                                </BadgeWithDot>
                                            </div>
                                        </Table.Cell>

                                        <Table.Cell className="px-4">
                                            <div className="flex justify-end gap-0.5">
                                                {mounted && (
                                                    <>
                                                        {/* Only show View Details for real assessments, not mock data */}
                                                        {transformedAssessments.length > 0 && (
                                                            <ButtonUtility
                                                                size="xs"
                                                                color="tertiary"
                                                                tooltip="View Details"
                                                                icon={Eye}
                                                                onClick={() => router.push(`/funding/assess/${movement.id}`)}
                                                            />
                                                        )}
                                                        <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} />
                                                        {transformedAssessments.length === 0 && (
                                                            <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                            </Table>
                        ) : assessmentsLoading ? (
                            <div className="p-8 text-center text-tertiary">Loading assessments...</div>
                        ) : assessmentsError ? (
                            <div className="p-8 text-center text-red-600">Error loading assessments</div>
                        ) : transformedAssessments.length === 0 ? (
                            <div className="p-8 text-center text-tertiary">
                                <p className="mb-4">No assessments found</p>
                                <p className="text-sm">Upload and assess applications to see them here</p>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-tertiary">No data available</div>
                        )}
                        {assessmentsResponse && assessmentsResponse.pagination && (
                            <PaginationPageDefault
                                page={Math.floor(assessmentsResponse.pagination.offset / assessmentsResponse.pagination.limit) + 1}
                                total={Math.ceil(assessmentsResponse.pagination.total / assessmentsResponse.pagination.limit)}
                            />
                        )}
                    </TableCard.Root>
                </div>
            </main>
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">

                <div className="flex shrink-0 flex-col gap-5 overflow-x-clip px-6 pt-8">
                    <div className="flex justify-between">
                        <p className="text-lg font-semibold text-primary">Our funds</p>
                        <Button size="md" color="link-gray" iconLeading={Plus}>
                            Add fund
                        </Button>
                    </div>
{mounted && (
                    <Carousel.Root className="flex flex-col gap-5">
                        <Carousel.Content overflowHidden={false} className="gap-5">
                            {activeFunds.map((fund, index) => {
                                const gradients = [
                                    "from-[#A5C0EE] to-[#FBC5EC]",
                                    "from-[#FBC2EB] to-[#A18CD1]",
                                    "from-[#84FAB0] to-[#8FD3F4]",
                                    "from-[#FFEAA7] to-[#FAB1A0]",
                                ];
                                const gradient = gradients[index % gradients.length];

                                return (
                                    <Carousel.Item key={fund.id} className="basis-auto">
                                        <div className="w-68 h-40 relative flex">
                                            <div className={`w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl p-4 bg-linear-to-b ${gradient} before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset`}>
                                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gray-800 rounded-b-2xl"></div>

                                                <div className="relative flex items-center justify-between px-1 pt-1">
                                                    <div className="text-md leading-[normal] font-semibold text-white">{fund.name}</div>
                                                    {mounted && <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} className="text-white hover:text-gray-200 !bg-transparent !border-0" />}
                                                </div>

                                                <div className="relative flex items-end justify-between gap-3">
                                                    <div className="flex min-w-0 flex-col gap-2">
                                                        <p className="text-xs leading-snug font-semibold text-white" style={{wordBreak: "break-word"}}>
                                                            {fund.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Carousel.Item>
                                );
                            })}
                        </Carousel.Content>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between gap-4">
                                    <p className="text-sm font-medium text-primary">Total Assessments</p>
                                    <span className="text-sm text-tertiary">
                                        {assessmentsResponse ? assessmentsResponse.pagination.total : 0} Assessments
                                    </span>
                                </div>
                                <ProgressBar
                                    value={assessmentsResponse ? Math.min(assessmentsResponse.pagination.total, 100) : 0}
                                    max={100}
                                />
                            </div>
                            {activeFunds.length > 0 && <CarouselIndicator size="lg" framed={false} />}
                        </div>
                    </Carousel.Root>
                    )}
                </div>

                <div className="flex flex-col gap-5 border-t border-secondary px-6 pt-6">
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-semibold text-primary">Actions</p>
                        <TableRowActionsDropdown />
                    </div>
                    <div className="flex flex-col gap-3">
                        <a href="/funding/applications-upload" className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={UploadCloud01} className="bg-utility-blue-100 text-utility-blue-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-blue-700">Upload applications</p>
                                <ArrowRight className="text-utility-blue-700 w-4 h-4" />
                            </div>
                        </a>
                        <div className="flex items-center gap-3 rounded-xl bg-utility-pink-50 p-4 hover:bg-utility-pink-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={Flash} className="bg-utility-pink-100 text-utility-pink-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-pink-700">Automate assessments</p>
                                <ArrowRight className="text-utility-pink-700 w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
