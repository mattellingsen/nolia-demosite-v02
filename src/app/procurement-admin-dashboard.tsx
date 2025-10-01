"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProcurementBases, useDeleteProcurementBase } from "@/hooks/useProcurementBase";
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

// Generate gradient colors for procurement bases
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

export const ProcurementAdminSetupDashboard = () => {
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Fetch procurement bases data
    const { data: bases = [], isLoading: basesLoading, error: basesError } = useProcurementBases();
    const deleteProcurementBase = useDeleteProcurementBase();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDeleteBase = async (baseId: string, event?: React.MouseEvent) => {
        // Prevent the card click event from firing
        if (event) {
            event.stopPropagation();
        }

        if (window.confirm('Are you sure you want to delete this procurement base? This action cannot be undone.')) {
            try {
                await deleteProcurementBase.mutateAsync(baseId);
            } catch (error) {
                console.error('Failed to delete procurement base:', error);
            }
        }
    };

    const handleBaseCardClick = (baseId: string) => {
        router.push(`/procurement-admin/base-created?baseId=${baseId}`);
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/procurement-admin/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/procurement-admin/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Settings",
                        href: "/procurement-admin/settings",
                        icon: Settings01,
                    },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8">
                {/* Header */}
                <div className="sticky top-0 z-10 flex flex-col gap-6 border-b border-secondary bg-primary/95 px-4 pb-6 pt-8 backdrop-blur-sm lg:px-8">
                    <div className="flex flex-col gap-1">
                        <p className="text-md font-semibold text-tertiary">Procurement Admin</p>
                        <p className="text-display-md font-semibold text-primary">Global Knowledgebases</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            href="/procurement-admin/setup/setup-procurement-base"
                            iconLeading={Plus}
                            color="primary"
                            size="md"
                        >
                            Create knowledgebase
                        </Button>
                        <ButtonUtility
                            size="md"
                            iconLeading={Monitor04}
                            text="Documentation"
                            disabled
                        />
                        <ButtonUtility
                            size="md"
                            iconLeading={FilterLines}
                            text="Filter"
                            disabled
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-12 lg:px-8">
                    {basesLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="text-tertiary">Loading procurement bases...</div>
                        </div>
                    ) : basesError ? (
                        <div className="flex flex-col items-center gap-4 rounded-lg border border-error-300 bg-error-50 p-8 text-center">
                            <FeaturedIcon icon={Shield01} color="error" size="lg" />
                            <div>
                                <p className="font-semibold text-primary">Failed to load procurement bases</p>
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
                                href="/procurement-admin/setup/setup-procurement-base"
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
                                <div
                                    key={base.id}
                                    onClick={() => handleBaseCardClick(base.id)}
                                    className="relative cursor-pointer rounded-lg border border-secondary bg-primary p-6 transition-all hover:shadow-lg"
                                >
                                    {/* Gradient header */}
                                    <div
                                        className={cx(
                                            "absolute inset-x-0 top-0 h-24 rounded-t-lg bg-gradient-to-br opacity-20",
                                            generateGradient(index)
                                        )}
                                    />

                                    <div className="relative">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-primary">{base.name}</h3>
                                                <p className="mt-1 text-sm text-tertiary">
                                                    {base.documentsCount || 0} documents
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <ButtonUtility
                                                    size="sm"
                                                    iconLeading={Trash01}
                                                    onClick={(e) => handleDeleteBase(base.id, e)}
                                                    color="error"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cx(
                                                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                                                        base.status === 'ACTIVE'
                                                            ? "bg-success-50 text-success-700"
                                                            : base.status === 'DRAFT'
                                                            ? "bg-warning-50 text-warning-700"
                                                            : "bg-gray-50 text-gray-700"
                                                    )}
                                                >
                                                    {base.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-tertiary">
                                                {formatDate(new Date(base.createdAt).getTime())}
                                            </p>
                                        </div>

                                        {base.description && (
                                            <p className="mt-3 line-clamp-2 text-sm text-tertiary">
                                                {base.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};