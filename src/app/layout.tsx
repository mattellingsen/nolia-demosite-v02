import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import { QueryProvider } from "@/providers/query-provider";
import { cx } from "@/utils/cx";
import "@/styles/globals.css";
// Initialize background services automatically
import "@/lib/startup";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const dmSerifDisplay = DM_Serif_Display({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-dm-serif-display",
    weight: "400",
});

export const metadata: Metadata = {
    title: "Nolia | The future of procurement and funding applications",
    description: "AI-powered procurement and funding application system that reduces processing time by 70% while ensuring fair, consistent assessments.",
    icons: {
        icon: [
            { url: '/images/logos/nolia-logo-icon.png', sizes: '32x32', type: 'image/png' },
            { url: '/images/logos/nolia-logo-icon.png', sizes: '16x16', type: 'image/png' },
        ],
        shortcut: '/images/logos/nolia-logo-icon.png',
        apple: '/images/logos/nolia-logo-icon.png',
    },
};

export const viewport: Viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cx(inter.variable, dmSerifDisplay.variable, "bg-primary antialiased")}>
                <RouteProvider>
                    <QueryProvider>
                        <Theme>{children}</Theme>
                    </QueryProvider>
                </RouteProvider>
            </body>
        </html>
    );
}
