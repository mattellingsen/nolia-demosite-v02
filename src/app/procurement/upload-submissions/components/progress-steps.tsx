"use client";

import { CheckCircle, UploadCloud01, File02 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

interface ProgressStep {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface ProgressStepsProps {
    currentStep: number;
    steps: ProgressStep[];
}

export const ProgressSteps = ({ currentStep, steps }: ProgressStepsProps) => {
    return (
        <nav aria-label="Progress">
            <ol className="flex items-center">
                {steps.map((step, stepIdx) => {
                    const isCompleted = stepIdx < currentStep;
                    const isCurrent = stepIdx === currentStep;
                    const isUpcoming = stepIdx > currentStep;

                    return (
                        <li key={step.id} className={cx("relative", stepIdx !== steps.length - 1 && "pr-8 sm:pr-20")}>
                            {/* Connector Line */}
                            {stepIdx !== steps.length - 1 && (
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className={cx(
                                        "h-0.5 w-full",
                                        isCompleted ? "bg-brand-secondary-solid" : "bg-gray-200"
                                    )} />
                                </div>
                            )}

                            <div className="relative flex items-start">
                                <span className="flex h-9 items-center">
                                    <span className={cx(
                                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                                        isCompleted 
                                            ? "border-brand-secondary-solid bg-brand-secondary-solid" 
                                            : isCurrent 
                                                ? "border-brand-secondary-solid bg-white" 
                                                : "border-gray-300 bg-white"
                                    )}>
                                        {isCompleted ? (
                                            <CheckCircle className="h-5 w-5 text-white" />
                                        ) : (
                                            <step.icon className={cx(
                                                "h-5 w-5",
                                                isCurrent ? "text-brand-secondary-solid" : "text-gray-400"
                                            )} />
                                        )}
                                    </span>
                                </span>
                                <span className="ml-4 flex min-w-0 flex-col">
                                    <span className={cx(
                                        "text-sm font-medium",
                                        isCurrent ? "text-brand-secondary-solid" : isCompleted ? "text-gray-900" : "text-gray-500"
                                    )}>
                                        {step.title}
                                    </span>
                                    <span className={cx(
                                        "text-sm",
                                        isCurrent ? "text-brand-secondary-secondary" : "text-gray-500"
                                    )}>
                                        {step.description}
                                    </span>
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

// Default steps for the upload workflow
export const defaultUploadSteps: ProgressStep[] = [
    {
        id: 'upload',
        title: 'Upload Application',
        description: 'Upload your application documents',
        icon: UploadCloud01
    },
    {
        id: 'assess',
        title: 'AI Assessment',
        description: 'Automated assessment and scoring',
        icon: File02
    }
];