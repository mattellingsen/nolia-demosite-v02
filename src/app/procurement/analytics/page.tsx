"use client";

import { useState } from "react";
import { ArrowLeft, BarChart03, Stars01, TrendUp02, PieChart01 } from "@untitledui/icons";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { 
    CheckDone01,
    Edit05,
    Send01,
} from "@untitledui/icons";

import { AIRecommendations } from "./ai-recommendations";

type AnalyticsView = 'overview' | 'ai-recommendations';

const AnalyticsPage = () => {
    const [currentView, setCurrentView] = useState<AnalyticsView>('overview');
    const [selectedTender, setSelectedTender] = useState<any>(null);

    const renderCurrentView = () => {
        switch (currentView) {
            case 'ai-recommendations':
                return (
                    <AIRecommendations
                        formData={selectedTender}
                        onClose={() => setCurrentView('overview')}
                    />
                );
            
            default:
                return (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-primary mb-4">Tender Analytics Dashboard</h2>
                            <p className="text-lg text-secondary max-w-2xl mx-auto">
                                Analyze tender performance, review AI recommendations, and optimize your assessment processes.
                            </p>
                        </div>

                        {/* Analytics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div 
                                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => setCurrentView('ai-recommendations')}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Stars01 className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">AI Recommendations</h3>
                                        <p className="text-sm text-secondary">Review AI suggestions for tender optimization</p>
                                    </div>
                                </div>
                                <Button size="sm" color="secondary" className="w-full">
                                    View Recommendations
                                </Button>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer opacity-50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <BarChart03 className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Performance Analytics</h3>
                                        <p className="text-sm text-secondary">Tender performance metrics and trends</p>
                                    </div>
                                </div>
                                <Button size="sm" color="secondary" className="w-full" isDisabled>
                                    Coming Soon
                                </Button>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer opacity-50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <TrendUp02 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Submission Insights</h3>
                                        <p className="text-sm text-secondary">Submission quality and assessment insights</p>
                                    </div>
                                </div>
                                <Button size="sm" color="secondary" className="w-full" isDisabled>
                                    Coming Soon
                                </Button>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer opacity-50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <PieChart01 className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Assessment Reports</h3>
                                        <p className="text-sm text-secondary">Detailed assessment and scoring reports</p>
                                    </div>
                                </div>
                                <Button size="sm" color="secondary" className="w-full" isDisabled>
                                    Coming Soon
                                </Button>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Analytics Features</h3>
                            <p className="text-sm text-blue-800">
                                Our analytics platform helps you optimize your procurement tenders through data-driven insights.
                                Currently featuring AI recommendations, with performance analytics, submission insights, and
                                detailed reporting coming soon.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/procurement/analytics"
                items={[
                    {
                        label: "Setup",
                        href: "/procurement/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Apply",
                        href: "/procurement/apply",
                        icon: Send01,
                    },
                    {
                        label: "Assess",
                        href: "/procurement/assess",
                        icon: CheckDone01,
                    },
                    {
                        label: "Analytics",
                        href: "/procurement/analytics",
                        icon: TrendUp02,
                    },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                {/* Header */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <Button
                            size="sm"
                            color="tertiary"
                            iconLeading={ArrowLeft}
                            href="/procurement"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">Tender Management</p>
                            <p className="text-display-md font-semibold text-primary">Analytics</p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-4 lg:px-8">
                    {renderCurrentView()}
                </div>
            </main>
        </div>
    );
};

export default AnalyticsPage;