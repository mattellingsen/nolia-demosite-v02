"use client";

import { ArrowRight } from "@untitledui/icons";
import { BadgeGroup } from "@/components/base/badges/badge-groups";
import { Button } from "@/components/base/buttons/button";
import { Header } from "@/components/marketing/header-navigation/header";

export const HeroGeometricShapes03 = () => {
    return (
        <div className="relative overflow-hidden bg-primary">
            {/* Background pattern */}
            <img
                alt="Background grid pattern"
                aria-hidden="true"
                loading="lazy"
                src="/images/patterns/background-grid-pattern.png"
                className="pointer-events-none absolute top-0 left-1/2 z-0 max-w-none -translate-x-1/2 dark:brightness-[0.2]"
            />

            <Header />

            <section className="relative py-16 lg:flex lg:min-h-180 lg:items-center lg:py-24">
                <div className="mx-auto flex w-full max-w-container items-center px-4 md:px-8">
                    <div className="flex flex-col items-start md:max-w-3xl lg:w-1/2 lg:pr-8">
                        <a href="#" className="rounded-[10px] outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                            <BadgeGroup className="hidden md:flex" size="lg" addonText="New feature" iconTrailing={ArrowRight} theme="modern" color="brand">
                                MCP Server Integration & Automation Agents
                            </BadgeGroup>
                            <BadgeGroup className="md:hidden" size="md" addonText="New feature" iconTrailing={ArrowRight} theme="modern" color="brand">
                                MCP Server Integration & Automation Agents
                            </BadgeGroup>
                        </a>

                        <h1 className="mt-4 text-display-md font-medium text-primary md:text-display-lg lg:text-display-xl">
                            The future of procurement and funding applications.
                        </h1>
                        <p className="mt-4 max-w-lg text-lg text-balance text-tertiary md:mt-6 md:text-xl">
                            Nolia radically transforms your procurement and funding processes, making them faster, easier and unbiased.
                        </p>

                        <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-start md:mt-12">
                            <Button href="/funding" color="secondary" size="xl">
                                Funding
                            </Button>
                            <Button href="/procurement" size="xl">Procurement</Button>
                            <Button href="/procurement-admin" color="secondary" size="xl">
                                Procurement Admin
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="relative mt-16 w-full px-4 md:h-95 md:px-8 lg:absolute lg:top-20 lg:right-0 lg:mt-0 lg:h-[calc(100%-5rem)] lg:w-1/2 lg:px-0">
                    <img
                        alt="Nolia Magnolia Blue"
                        src="/images/hero/nolia-magnolia-blue.png"
                        className="size-full object-cover object-top"
                        style={{ mixBlendMode: 'darken' }}
                    />
                </div>
            </section>
        </div>
    );
};
