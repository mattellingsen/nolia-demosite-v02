"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorldBankBases, useDeleteWorldBankBase } from "@/hooks/useWorldBankBase";
import {
    ArrowRight,
    CheckDone01,
    Edit01,
    Edit05,
    FilterLines,
    Flash,
    Monitor04,
    Plus,
    Settings01,
    Trash01,
    UploadCloud01,
    FileCheck02,
    Shield01,
    Building02,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { TableRowActionsDropdown } from "@/components/application/table/table";
import { cx } from "@/utils/cx";

// Helper functions for formatting
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

// Generate gradient colors for World Bank bases
const generateGradient = (index: number): string => {
    const gradients = [
        "from-[#E6B3F1] to-[#B8A3FF]", // Purple gradient for admin
        "from-[#A8D5E8] to-[#94C9FF]", // Blue gradient
        "from-[#FFD1A9] to-[#FFB088]", // Orange gradient
        "from-[#B9E5B3] to-[#9AD89F]", // Green gradient
        "from-[#FFB3C7] to-[#FF94B5]", // Pink gradient
        "from-[#D4B3FF] to-[#BFA3FF]", // Violet gradient
    ];
    return gradients[index % gradients.length];
};

export const WorldBankAdminSetupDashboard = () => {
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Fetch World Bank bases data
    const { data: bases = [], isLoading: basesLoading, error: basesError } = useWorldBankBases();
    const deleteWorldBankBase = useDeleteWorldBankBase();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDeleteBase = async (baseId: string, event?: React.MouseEvent) => {
        // Prevent the card click event from firing
        if (event) {
            event.stopPropagation();
        }

        if (window.confirm('Are you sure you want to delete this World Bank base? This action cannot be undone.')) {
            try {
                await deleteWorldBankBase.mutateAsync(baseId);
            } catch (error) {
                console.error('Failed to delete World Bank base:', error);
            }
        }
    };

    const handleBaseCardClick = (baseId: string) => {
        router.push(`/worldbank-admin/base-created?baseId=${baseId}`);
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbank-admin/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/worldbank-admin/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Settings",
                        href: "/worldbank-admin/settings",
                        icon: Settings01,
                    },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8">
                {/* Header */}
                <div className="sticky top-0 z-10 flex flex-col gap-6 border-b border-secondary bg-primary/95 px-4 pb-6 pt-8 backdrop-blur-sm lg:px-8">
                    <div className="flex flex-col gap-1">
                        <p className="text-md font-semibold text-tertiary">World Bank Admin</p>
                        <p className="text-display-md font-semibold text-primary">Global Knowledgebases</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            href="/worldbank-admin/setup/setup-worldbank-base"
                            iconLeading={Plus}
                            color="primary"
                            size="md"
                        >
                            Create knowledgebase
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-12 lg:px-8">
                    {basesLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="text-tertiary">Loading World Bank bases...</div>
                        </div>
                    ) : basesError ? (
                        <div className="flex flex-col items-center gap-4 rounded-lg border border-error-300 bg-error-50 p-8 text-center">
                            <FeaturedIcon icon={Shield01} color="error" size="lg" />
                            <div>
                                <p className="font-semibold text-primary">Failed to load World Bank bases</p>
                                <p className="mt-1 text-sm text-tertiary">Please try refreshing the page</p>
                            </div>
                        </div>
                    ) : bases.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-secondary bg-secondary p-12 text-center">
                            <FeaturedIcon icon={Building02} color="gray" size="lg" />
                            <div>
                                <p className="font-semibold text-primary">No knowledgebases yet</p>
                                <p className="mt-1 text-sm text-tertiary">Create your first knowledgebase to establish company-wide standards</p>
                            </div>
                            <Button
                                href="/worldbank-admin/setup/setup-worldbank-base"
                                iconLeading={Plus}
                                color="primary"
                                size="md"
                                className="mt-2"
                            >
                                Create knowledgebase
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {bases.map((base: any, index: number) => (
                                <div key={base.id} className="w-full h-50 relative flex cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleBaseCardClick(base.id)}>
                                    <div className={`w-full h-full relative overflow-hidden rounded-2xl p-4 bg-linear-to-b ${generateGradient(index)} before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset`}>
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-5/6 bg-gray-800 rounded-b-2xl"></div>

                                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                                            <div className="flex min-w-0 flex-col">
                                                <div className="text-md leading-[normal] font-semibold text-white mb-1">{base.name}</div>
                                                <p className="text-xs text-white/70 mb-3">
                                                    {base.documentsCount || 0} documents
                                                </p>
                                                {base.description && (
                                                    <p className="text-xs leading-snug font-light text-white mb-5 line-clamp-2" style={{wordBreak: "break-word"}}>
                                                        {base.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        base.status === 'ACTIVE' ? 'bg-green-500/20 text-green-200' :
                                                        base.status === 'DRAFT' ? 'bg-yellow-500/20 text-yellow-200' :
                                                        'bg-gray-500/20 text-gray-200'
                                                    }`}>
                                                        {base.status}
                                                    </span>
                                                    <span className="text-xs text-white/70">
                                                        {formatDate(new Date(base.createdAt).getTime())}
                                                    </span>
                                                </div>
                                            </div>
                                            <ButtonUtility
                                                size="xs"
                                                color="tertiary"
                                                tooltip="Delete"
                                                icon={Trash01}
                                                className="text-white hover:text-gray-200 !bg-transparent !border-0"
                                                onClick={(e) => handleDeleteBase(base.id, e)}
                                                isDisabled={deleteWorldBankBase.isPending}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Setup new global knowledgebase card */}
                            <a href="/worldbank-admin/setup/setup-worldbank-base" className="w-full h-50 relative flex cursor-pointer hover:opacity-90 transition-opacity">
                                <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden rounded-2xl p-4 bg-gray-800">
                                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="rounded-full bg-white bg-opacity-20 p-3">
                                            <Plus className="w-8 h-8 text-gray-800" />
                                        </div>
                                        <p className="text-sm font-semibold text-white">
                                            Setup new Global Knowledgebase
                                        </p>
                                    </div>
                                </div>
                            </a>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
