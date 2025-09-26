"use client";

import { Dashboard12 } from "../../dashboards-12";

// Force dynamic rendering to prevent static caching in production
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AssessPage() {
    return <Dashboard12 />;
}