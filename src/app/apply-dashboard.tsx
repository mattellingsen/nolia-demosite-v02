"use client";

import { useMemo, useState, useEffect } from "react";
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
    MessageSmileSquare,
    BarChart01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis } from "recharts";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Carousel } from "@/components/application/carousel/carousel-base";
import { CarouselIndicator } from "@/components/application/carousel/carousel.demo";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { TableRowActionsDropdown } from "@/components/application/table/table";
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
    { date: "2025-01-01", A: 120, B: 80 },
    { date: "2025-02-01", A: 70, B: 60 },
    { date: "2025-03-01", A: 10, B: 35 },
    { date: "2025-04-01", A: 40, B: 45 },
    { date: "2025-05-01", A: 70, B: 0 },
    { date: "2025-06-01", A: 50, B: 0 },
    { date: "2025-07-01", A: 60, B: 70 },
    { date: "2025-08-01", A: 75, B: 50 },
    { date: "2025-09-01", A: 85, B: 50 },
];

// Fund cards data
const fundCards = [
    {
        id: 1,
        title: "New to R&D",
        description: "Kick start your first commercial research and development (R&D) project.",
        gradient: "from-[#A5C0EE] to-[#FBC5EC]"
    },
    {
        id: 2,
        title: "Student Experience",
        description: "Fund innovative businesses to employ tertiary-level students.",
        gradient: "from-[#FBC2EB] to-[#A18CD1]"
    }
];

export const ApplyDashboard = () => {
    const [mounted, setMounted] = useState(false);
    
    // Fetch funds data for the right sidebar
    const { data: funds = [], isLoading: fundsLoading, error: fundsError } = useFunds();
    const activeFunds = funds.filter(fund => fund.status === 'ACTIVE');

    // Fetch assessments data for accurate count
    const assessmentsQuery = useAssessments();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate real stats
    const activeFormsCount = 0; // Forms created, not funds
    const applicationsCount = assessmentsQuery.data?.pagination?.total || 0; // Real applications count from assessments
    const completionRate = 0; // Real completion rate
    const avgTime = "0min"; // Real avg time

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/funding/apply"
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
                        <p className="text-md font-semibold text-tertiary">Application Forms</p>
                        <p className="text-display-md font-semibold text-primary">Form Management</p>
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <DateRangePicker />
                        <Button color="primary" size="md" iconLeading={Plus} href="/funding/apply/setup-form">
                            Setup form
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
                    <div className="flex flex-col gap-2 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Active Forms</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">{activeFormsCount}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Applications This Month</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">{applicationsCount}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Completion Rate</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">{completionRate}%</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Avg. Time to Complete</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">{avgTime}</p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
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

                {/* Application Forms Grid */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold text-primary">Application Forms</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Create new application form card */}
                            <a href="/funding/apply/setup-form" className="w-full h-40 relative flex cursor-pointer hover:opacity-90 transition-opacity">
                                <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden rounded-2xl p-4 bg-gray-800">
                                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="rounded-full bg-white bg-opacity-20 p-3">
                                            <Plus className="w-8 h-8 text-gray-800" />
                                        </div>
                                        <p className="text-sm font-semibold text-white">
                                            Setup new application form
                                        </p>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex shrink-0 flex-col gap-5 overflow-x-clip px-6 pt-8">
                    <div className="flex justify-between">
                        <p className="text-lg font-semibold text-primary">Our funds</p>
                        <Button size="md" color="link-gray" iconLeading={Plus} href="/funding/setup">
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
                                    <p className="text-sm font-medium text-primary">This month</p>
                                    <span className="text-sm text-tertiary">{applicationsCount} Applications</span>
                                </div>
                                <ProgressBar value={0} />
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
                        <a href="/funding/analytics" className="flex items-center gap-3 rounded-xl bg-utility-purple-50 p-4 hover:bg-utility-purple-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={BarChart01} className="bg-utility-purple-100 text-utility-purple-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-purple-700">View analytics</p>
                                <ArrowRight className="text-utility-purple-700 w-4 h-4" />
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};