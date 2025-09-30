import { redirect } from 'next/navigation';

export default function ProcurementAdminPage() {
    // Redirect to procurement admin setup dashboard
    redirect('/procurement-admin/setup');
}