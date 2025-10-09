import { redirect } from 'next/navigation';

export default function WorldBankAdminPage() {
    // Redirect to world bank admin setup dashboard
    redirect('/worldbank-admin/setup');
}
