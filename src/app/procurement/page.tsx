import { redirect } from 'next/navigation';

export default function ProcurementPage() {
    // Redirect to procurement assessment dashboard
    redirect('/procurement/assess');
}