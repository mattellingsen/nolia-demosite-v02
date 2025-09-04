"use client";

import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { UntitledLogoMinimal } from "@/components/foundations/logo/untitledui-logo-minimal";
import { BackgroundPattern } from "@/components/shared-assets/background-patterns";

export const LoginSplitImage = () => {
    return (
        <section className="grid min-h-screen grid-cols-1 overflow-hidden bg-primary lg:grid-cols-2">
            <div className="flex flex-col bg-primary">
                <div className="flex flex-1 justify-center px-4 py-12 md:items-center md:px-8">
                    <div className="flex w-full flex-col gap-8 sm:max-w-90">
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="relative">
                                <BackgroundPattern pattern="grid" className="absolute top-1/2 left-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 md:block" />
                                <BackgroundPattern
                                    pattern="grid"
                                    size="md"
                                    className="absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 md:hidden"
                                />
                                <UntitledLogoMinimal className="relative z-10 size-12 max-md:hidden" />
                                <UntitledLogoMinimal className="relative z-10 size-10 md:hidden" />
                            </div>
                            <div className="z-10 flex flex-col gap-2 md:gap-3">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">Welcome back</h1>
                                <p className="text-md text-tertiary">Welcome back! Please enter your details.</p>
                            </div>
                        </div>

                        <Form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const data = Object.fromEntries(new FormData(e.currentTarget));
                                console.log("Form data:", data);
                            }}
                            className="relative z-10 flex flex-col gap-6"
                        >
                            <div className="flex flex-col gap-5">
                                <Input isRequired hideRequiredIndicator label="Email" type="email" name="email" placeholder="Enter your email" size="md" />
                                <Input isRequired hideRequiredIndicator label="Password" type="password" name="password" size="md" placeholder="••••••••" />
                            </div>

                            <div className="flex items-center">
                                <Checkbox label="Remember for 30 days" name="remember" />

                                <Button color="link-color" size="md" href="#" className="ml-auto">
                                    Forgot password
                                </Button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg">
                                    Sign in
                                </Button>
                            </div>
                        </Form>

                        <div className="flex justify-center gap-1 text-center">
                            <span className="text-sm text-tertiary">Don't have an account?</span>
                            <Button href="#" color="link-color" size="md">
                                Sign up
                            </Button>
                        </div>
                    </div>
                </div>

                <footer className="hidden p-8 pt-11 lg:block">
                    <p className="text-sm text-tertiary">© Untitled UI 2077</p>
                </footer>
            </div>

            <div className="overflow-max-lg:hidden relative z-10 hidden lg:block">
                <img
                    src="/images/hero/nolia-magnolia-blue.png"
                    className="absolute inset-0 size-full object-cover"
                    alt="Nolia magnolia flower"
                />
            </div>
        </section>
    );
};
