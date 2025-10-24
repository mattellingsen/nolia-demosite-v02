"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorldBankGroupProjects, useDeleteWorldBankGroupProject } from "@/hooks/useWorldBankGroupProjects";
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
    Beaker02,
    Trash01,
    TrendUp02,
    UploadCloud01,
    MessageSmileSquare,
    BarChart01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { TableRowActionsDropdown } from "@/components/application/table/table";
import { cx } from "@/utils/cx";
import { Badge } from "@/components/base/badges/badges";

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

// Generate gradient colors for projects
const generateGradient = (index: number): string => {
    const gradients = [
        "from-[#A5C0EE] to-[#FBC5EC]",
        "from-[#FBC2EB] to-[#A18CD1]",
        "from-[#84FAB0] to-[#8FD3F4]",
        "from-[#FFEAA7] to-[#FAB1A0]",
        "from-[#A29BFE] to-[#FD79A8]",
        "from-[#00B894] to-[#00CEC9]",
    ];
    return gradients[index % gradients.length];
};

export const WorldBankGroupSetupDashboard = () => {
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Fetch projects data using WorldBankGroup hooks
    console.log('[WorldBankGroup] Dashboard: Fetching projects...');
    const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useWorldBankGroupProjects();
    const deleteProject = useDeleteWorldBankGroupProject();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (projects) {
            console.log('[WorldBankGroup] Dashboard: Projects loaded:', projects.length);
        }
        if (projectsError) {
            console.error('[WorldBankGroup] Dashboard: Error loading projects:', projectsError);
        }
    }, [projects, projectsError]);

    const handleDeleteProject = async (projectId: string, event?: React.MouseEvent) => {
        // Prevent the card click event from firing
        if (event) {
            event.stopPropagation();
        }

        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            try {
                console.log('[WorldBankGroup] Dashboard: Deleting project:', projectId);
                await deleteProject.mutateAsync(projectId);
            } catch (error) {
                console.error('[WorldBankGroup] Dashboard: Failed to delete project:', error);
            }
        }
    };

    const handleProjectCardClick = (projectId: string) => {
        console.log('[WorldBankGroup] Dashboard: Navigating to project:', projectId);
        router.push(`/worldbankgroup/project-created?projectId=${projectId}`);
    };

    if (!mounted) {
        return null;
    }

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
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12 items-center">
                <div className="flex flex-col gap-1 text-center">
                    <p className="text-md font-semibold text-tertiary">WorldBankGroup Projects</p>
                    <p className="text-display-md font-semibold text-primary">Project Admin & Setup</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl w-full">
                    <div className="flex flex-col gap-2 rounded-xl bg-primary px-6 py-5 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Total Projects</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">
                                {projectsLoading ? '...' : projects.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl bg-primary px-6 py-5 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Active Projects</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">
                                {projectsLoading ? '...' : projects.filter(t => t.status === 'ACTIVE').length}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl bg-primary px-6 py-5 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Draft Projects</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">
                                {projectsLoading ? '...' : projects.filter(t => t.status === 'DRAFT').length}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl bg-primary px-6 py-5 shadow-xs ring-1 ring-secondary ring-inset">
                        <p className="text-sm font-medium text-tertiary">Recent Activity</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-display-sm font-semibold text-primary">
                                {projectsLoading ? '...' : projects.filter(t => {
                                    const weekAgo = new Date();
                                    weekAgo.setDate(weekAgo.getDate() - 7);
                                    return new Date(t.createdAt) > weekAgo;
                                }).length}
                            </p>
                            <p className="text-xs text-tertiary">this week</p>
                        </div>
                    </div>
                </div>

                {/* Current Projects Grid */}
                <div className="w-full px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-center">
                            <p className="text-lg font-semibold text-primary">Current Projects</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Real project cards */}
                            {projectsLoading ? (
                                // Loading skeletons
                                Array.from({ length: 3 }).map((_, index) => (
                                    <div key={`skeleton-${index}`} className="w-full h-50 relative flex">
                                        <div className="w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl p-4 bg-gray-200 animate-pulse">
                                            <div className="flex items-center justify-between">
                                                <div className="h-4 bg-gray-300 rounded w-24"></div>
                                                <div className="h-6 w-6 bg-gray-300 rounded"></div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="h-3 bg-gray-300 rounded w-full"></div>
                                                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                projects.map((project, index) => (
                                    <div key={project.id} className="w-full h-50 relative flex cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleProjectCardClick(project.id)}>
                                        <div className={`w-full h-full relative overflow-hidden rounded-2xl p-4 bg-linear-to-b ${generateGradient(index)} before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset`}>
                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-5/6 bg-gray-800 rounded-b-2xl"></div>

                                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                                                <div className="flex min-w-0 flex-col">
                                                    <div className="text-md leading-[normal] font-semibold text-white mb-3">{project.name}</div>
                                                    <p className="text-xs leading-snug font-light text-white mb-5" style={{wordBreak: "break-word"}}>
                                                        {project.description || 'No description provided'}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            project.status === 'ACTIVE' ? 'bg-green-500/20 text-green-200' :
                                                            project.status === 'DRAFT' ? 'bg-yellow-500/20 text-yellow-200' :
                                                            'bg-gray-500/20 text-gray-200'
                                                        }`}>
                                                            {project.status}
                                                        </span>
                                                        <span className="text-xs text-white/70">
                                                            {formatDate(new Date(project.createdAt).getTime())}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ButtonUtility
                                                    size="xs"
                                                    color="tertiary"
                                                    tooltip="Delete"
                                                    icon={Trash01}
                                                    className="text-white hover:text-gray-200 !bg-transparent !border-0"
                                                    onClick={(event) => handleDeleteProject(project.id, event)}
                                                    isDisabled={deleteProject.isPending}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Setup new project card */}
                            <a href="/worldbankgroup/setup/setup-new-project" className="w-full h-50 relative flex cursor-pointer hover:opacity-90 transition-opacity">
                                <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden rounded-2xl p-4 bg-gray-800">
                                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="rounded-full bg-white bg-opacity-20 p-3">
                                            <Plus className="w-8 h-8 text-gray-800" />
                                        </div>
                                        <p className="text-sm font-semibold text-white">
                                            Setup new project
                                        </p>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
