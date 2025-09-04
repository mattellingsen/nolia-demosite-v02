"use client";

import { useMemo, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    BarChartSquare02,
    DownloadCloud02,
    Edit01,
    FilterLines,
    Folder,
    HomeLine,
    LayoutAlt01,
    MessageChatCircle,
    PieChart03,
    Rows01,
    SearchLg,
    Settings01,
    Settings03,
    Trash01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { Area, AreaChart, CartesianGrid, Label, Legend, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import { ChartLegendContent, ChartTooltipContent } from "@/components/application/charts/charts-base";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithButton, BadgeWithDot, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";

// Helper functions for formatting
const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

const pieChartData = [
    {
        name: "81-100",
        value: 200,
        className: "text-utility-brand-600",
    },
    {
        name: "61-80",
        value: 350,
        className: "text-utility-brand-500",
    },
    {
        name: "41-60",
        value: 100,
        className: "text-utility-brand-400",
    },
    {
        name: "21-40",
        value: 120,
        className: "text-utility-brand-300",
    },
    {
        name: "0-20",
        value: 230,
        className: "text-utility-gray-200",
    },
];

const movements = [
    {
        id: "vendor-01",
        vendor: {
            name: "Ephemeral",
            website: "ephemeral.io",
            logoUrl: "https://www.untitledui.com/logos/images/Ephemeral.jpg",
        },
        rating: 60,
        change: "5%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 22).getTime(),
        categories: ["Active", "Customer data", "Admin", "+4"],
    },
    {
        id: "vendor-02",
        vendor: {
            name: "Stack3d Lab",
            website: "stack3dlab.com",
            logoUrl: "https://www.untitledui.com/logos/images/Stack3d Lab.jpg",
        },
        rating: 72,
        change: "4%",
        changeTrend: "negative",
        lastAssessed: new Date(2025, 0, 20).getTime(),
        categories: ["Active", "Business data", "Admin", "+4"],
    },
    {
        id: "vendor-03",
        vendor: {
            name: "Warpspeed",
            website: "getwarpspeed.com",
            logoUrl: "https://www.untitledui.com/logos/images/Warpspeed.jpg",
        },
        rating: 78,
        change: "6%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 24).getTime(),
        categories: ["Active", "Customer data", "Financials"],
    },
    {
        id: "vendor-04",
        vendor: {
            name: "CloudWatch",
            website: "cloudwatch.app",
            logoUrl: "https://www.untitledui.com/logos/images/CloudWatch.jpg",
        },
        rating: 38,
        change: "8%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 26).getTime(),
        categories: ["Active", "Database access", "Admin"],
    },
    {
        id: "vendor-05",
        vendor: {
            name: "ContrastAI",
            website: "contrastai.com",
            logoUrl: "https://www.untitledui.com/logos/images/ContrastAI.jpg",
        },
        rating: 42,
        change: "1%",
        changeTrend: "negative",
        lastAssessed: new Date(2025, 0, 18).getTime(),
        categories: ["Active", "Salesforce", "Admin", "+4"],
    },
    {
        id: "vendor-06",
        vendor: {
            name: "Convergence",
            website: "convergence.io",
            logoUrl: "https://www.untitledui.com/logos/images/Convergence.jpg",
        },
        rating: 66,
        change: "6%",
        changeTrend: "negative",
        lastAssessed: new Date(2025, 0, 28).getTime(),
        categories: ["Active", "Business data", "Admin", "+4"],
    },
    {
        id: "vendor-07",
        vendor: {
            name: "Sisyphus",
            website: "sisyphus.com",
            logoUrl: "https://www.untitledui.com/logos/images/Sisyphus.jpg",
        },
        rating: 91,
        change: "2%",
        changeTrend: "positive",
        lastAssessed: new Date(2025, 0, 16).getTime(),
        categories: ["Inactive", "Customer data", "Financials"],
    },
];

const lineData = [
    {
        date: "2025-01-01",
        A: 60,
        B: 34,
    },
    {
        date: "2025-02-01",
        A: 61,
        B: 35,
    },
    {
        date: "2025-03-01",
        A: 63,
        B: 39,
    },
    {
        date: "2025-04-01",
        A: 64,
        B: 43,
    },
    {
        date: "2025-05-01",
        A: 65,
        B: 44,
    },
    {
        date: "2025-06-01",
        A: 67,
        B: 46,
    },
    {
        date: "2025-07-01",
        A: 69,
        B: 48,
    },
    {
        date: "2025-08-01",
        A: 70,
        B: 50,
    },
    {
        date: "2025-09-01",
        A: 72,
        B: 53,
    },
    {
        date: "2025-10-01",
        A: 75,
        B: 55,
    },
    {
        date: "2025-11-01",
        A: 77,
        B: 57,
    },
    {
        date: "2025-12-01",
        A: 80,
        B: 60,
    },
];

const styles = {
    innerRadius: 50,
    outerRadius: 100,
};

const colors: Record<string, string> = {
    A: "text-utility-brand-600",
    B: "text-utility-brand-400",
};

export const Dashboard08 = () => {
    const isDesktop = useBreakpoint("lg");

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();

    const sortedItems = useMemo(() => {
        if (!sortDescriptor) return movements;

        return movements.toSorted((a, b) => {
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
    }, [sortDescriptor]);

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSectionDividers
                activeUrl="/dashboard"
                items={[
                    {
                        label: "Home",
                        href: "#",
                        icon: HomeLine,
                    },
                    {
                        label: "Dashboard",
                        href: "/dashboard",
                        icon: BarChartSquare02,
                    },
                    {
                        label: "Projects",
                        href: "#",
                        icon: Rows01,
                    },
                    { divider: true },
                    {
                        label: "Folders",
                        icon: Folder,
                        items: [
                            { label: "View all", badge: 18, href: "#" },
                            { label: "Recent", badge: 8, href: "#" },
                            { label: "Favorites", badge: 6, href: "#" },
                            { label: "Shared", badge: 4, href: "#" },
                        ],
                    },
                    { divider: true },
                    {
                        label: "Reporting",
                        href: "#",
                        icon: PieChart03,
                    },
                    {
                        label: "Settings",
                        href: "#",
                        icon: Settings01,
                    },
                    {
                        label: "Support",
                        href: "#",
                        icon: MessageChatCircle,
                        badge: (
                            <BadgeWithDot color="success" type="modern" size="sm">
                                Online
                            </BadgeWithDot>
                        ),
                    },
                    {
                        label: "Open in browser",
                        href: "https://www.untitledui.com/",
                        icon: LayoutAlt01,
                    },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                <div className="flex flex-col justify-between gap-4 px-4 lg:flex-row lg:px-8">
                    <p className="text-xl font-semibold text-primary lg:text-display-xs">Organization overview</p>
                    <div className="flex gap-3">
                        <Button size="md" color="tertiary" iconLeading={SearchLg} className="hidden lg:inline-flex" />
                        <Button size="md" color="secondary" iconLeading={FilterLines} className="hidden lg:inline-flex">
                            Filters
                        </Button>
                        <Button size="md" color="secondary" iconLeading={Settings03}>
                            Customize
                        </Button>
                        <Button size="md" color="secondary" iconLeading={DownloadCloud02}>
                            Export
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-6 px-4 lg:px-8 xl:flex-row">
                    <div className="flex flex-col rounded-xl shadow-xs ring-1 ring-secondary ring-inset lg:w-90">
                        <div className="flex flex-col gap-1 px-4 py-5 lg:p-6">
                            <div className="flex items-start justify-between pb-5">
                                <p className="text-md font-semibold text-primary">Vendor breakdown</p>
                                <TableRowActionsDropdown />
                            </div>
                            <div className="h-50 w-70">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Legend
                                            itemSorter="dataKey"
                                            verticalAlign="top"
                                            align="right"
                                            layout="vertical"
                                            content={<ChartLegendContent className="-translate-y-2" />}
                                            wrapperStyle={{
                                                right: 0,
                                                top: 0,
                                            }}
                                        />
                                        <RechartsTooltip content={<ChartTooltipContent isPieChart />} />

                                        <Pie
                                            isAnimationActive={false}
                                            startAngle={-270}
                                            endAngle={-630}
                                            stroke="none"
                                            data={pieChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            fill="currentColor"
                                            innerRadius={styles.innerRadius}
                                            outerRadius={styles.outerRadius}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-secondary px-4 py-3 lg:px-6 lg:py-4">
                            <Button size="md" color="secondary">
                                View full report
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-1 rounded-xl px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6">
                        <div className="flex items-start justify-between pb-5">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-md font-semibold text-primary">Average vendor rating</p>
                                <p className="text-sm text-tertiary">Track how your rating compares to your industry average.</p>
                            </div>
                            <TableRowActionsDropdown />
                        </div>
                        <div className="flex h-60 flex-col gap-2 lg:h-[251px]">
                            <ResponsiveContainer className="h-full max-h-full">
                                <AreaChart
                                    data={lineData}
                                    className="text-tertiary [&_.recharts-text]:text-xs"
                                    margin={{
                                        left: 4,
                                        right: 5,
                                        bottom: isDesktop ? 18 : 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="currentColor" className="text-utility-gray-500" stopOpacity="0.8" />
                                            <stop offset="80%" stopColor="currentColor" className="text-utility-gray-500" stopOpacity="0" />
                                        </linearGradient>

                                        <pattern id="verticalLines" width="8" height="100%" fill="url(#gradient)" patternUnits="userSpaceOnUse">
                                            <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" className="text-utility-gray-200" strokeWidth="1.5" />
                                            <rect width="100%" height="100%" fill="url(#gradient)" fillOpacity={0.15} />
                                        </pattern>
                                    </defs>

                                    <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />

                                    <Legend
                                        itemSorter="dataKey"
                                        verticalAlign="top"
                                        align="right"
                                        layout="horizontal"
                                        content={<ChartLegendContent className="-translate-y-2" />}
                                    />

                                    <XAxis
                                        fill="currentColor"
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                        tickMargin={8}
                                        padding={{ left: 12, right: 12 }}
                                        dataKey="date"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short" })}
                                    >
                                        {isDesktop && (
                                            <Label fill="currentColor" className="!text-xs font-medium max-lg:hidden" position="bottom">
                                                Month
                                            </Label>
                                        )}
                                    </XAxis>

                                    <YAxis domain={[0, 100]} fill="currentColor" hide={!isDesktop} axisLine={false} tickLine={false}>
                                        <Label
                                            fill="currentColor"
                                            className="!text-xs font-medium"
                                            style={{ textAnchor: "middle" }}
                                            angle={-90}
                                            position="insideLeft"
                                        >
                                            Security rating
                                        </Label>
                                    </YAxis>

                                    <RechartsTooltip
                                        content={<ChartTooltipContent />}
                                        labelFormatter={(value) => new Date(value).toLocaleString(undefined, { month: "short", year: "numeric" })}
                                        cursor={{
                                            className: "stroke-utility-brand-600 stroke-2",
                                        }}
                                    />

                                    <Area
                                        isAnimationActive={false}
                                        className={cx(
                                            colors["A"],
                                            "[&_.recharts-area-area]:translate-y-[6px] [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]",
                                        )}
                                        dataKey="A"
                                        name="Your rating"
                                        type="linear"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        fill="url(#verticalLines)"
                                        fillOpacity={1}
                                        activeDot={{
                                            className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
                                        }}
                                    />

                                    <Area
                                        isAnimationActive={false}
                                        className={cx(
                                            colors["B"],
                                            "[&_.recharts-area-area]:translate-y-[6px] [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]",
                                        )}
                                        dataKey="B"
                                        name="Industry average"
                                        type="linear"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        fill="url(#gradient)"
                                        fillOpacity={0}
                                        activeDot={{
                                            className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-4 px-4 lg:gap-6 lg:px-8">
                    <div className="flex justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-lg font-semibold text-primary">Vendor movements</p>
                            <p className="text-sm text-tertiary">Keep track of vendors and their security ratings.</p>
                        </div>
                        <Input icon={SearchLg} shortcut aria-label="Search" placeholder="Search" size="sm" className="hidden w-80 lg:inline-flex" />
                    </div>
                    <div className="flex flex-col gap-3 lg:hidden">
                        <Input icon={SearchLg} shortcut aria-label="Search" placeholder="Search" size="sm" />
                        <Button iconLeading={FilterLines} size="md" color="secondary">
                            Edit filters
                        </Button>
                        <div className="flex gap-3">
                            <BadgeWithButton color="brand" size="md" type="pill-color" buttonLabel="Clear" onButtonClick={() => {}}>
                                All time
                            </BadgeWithButton>
                            <BadgeWithButton color="brand" size="md" type="pill-color" buttonLabel="Clear" onButtonClick={() => {}}>
                                US, AU, +4
                            </BadgeWithButton>
                        </div>
                    </div>

                    <TableCard.Root className="-mx-4 mt-2 rounded-none lg:mx-0 lg:mt-0 lg:rounded-xl">
                        <Table
                            aria-label="Trades"
                            selectionMode="multiple"
                            defaultSelectedKeys={["vendor-01", "vendor-02", "vendor-03", "vendor-06", "vendor-07"]}
                            sortDescriptor={sortDescriptor}
                            onSortChange={setSortDescriptor}
                        >
                            <Table.Header className="bg-primary">
                                <Table.Head id="vendor" isRowHeader allowsSorting label="Vendor" className="w-full" />
                                <Table.Head id="rating" label="Rating" className="min-w-30 lg:min-w-52.5 lg:pl-3" />
                                <Table.Head id="change" />
                                <Table.Head id="lastAssessed" label="Last assessed" />
                                <Table.Head id="categories" label="Categories" />
                                <Table.Head id="actions" />
                            </Table.Header>
                            <Table.Body items={sortedItems}>
                                {(movement) => (
                                    <Table.Row id={movement.id} highlightSelectedRow={false}>
                                        <Table.Cell className="lg:px-0">
                                            <div className="group flex items-center gap-3">
                                                <Avatar src={movement.vendor.logoUrl} alt={movement.vendor.name} size="md" />
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
                                        <Table.Cell>
                                            <BadgeWithIcon
                                                iconLeading={movement.changeTrend === "positive" ? ArrowUp : ArrowDown}
                                                size="sm"
                                                type="pill-color"
                                                color={movement.changeTrend === "positive" ? "success" : "error"}
                                            >
                                                {movement.change}
                                            </BadgeWithIcon>
                                        </Table.Cell>
                                        <Table.Cell className="text-nowrap">{formatDate(movement.lastAssessed)}</Table.Cell>
                                        <Table.Cell>
                                            <div className="flex gap-1">
                                                {movement.categories.map((category) =>
                                                    category === "Active" || category === "Inactive" ? (
                                                        <BadgeWithDot
                                                            key={category}
                                                            size="sm"
                                                            type="pill-color"
                                                            color={category === "Active" ? "success" : "gray"}
                                                            className="capitalize"
                                                        >
                                                            {category}
                                                        </BadgeWithDot>
                                                    ) : (
                                                        <Badge
                                                            key={category}
                                                            size="sm"
                                                            type="pill-color"
                                                            color={
                                                                category === "Customer data"
                                                                    ? "blue"
                                                                    : category === "Admin"
                                                                      ? "indigo"
                                                                      : category === "Business data"
                                                                        ? "brand"
                                                                        : category === "Financials"
                                                                          ? "pink"
                                                                          : "gray"
                                                            }
                                                        >
                                                            {category}
                                                        </Badge>
                                                    ),
                                                )}
                                            </div>
                                        </Table.Cell>

                                        <Table.Cell className="px-4">
                                            <div className="flex justify-end gap-0.5">
                                                <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} />
                                                <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} />
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                        <PaginationCardMinimal page={1} total={10} align="center" />
                    </TableCard.Root>
                </div>
            </main>
        </div>
    );
};
