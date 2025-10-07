import { redirect } from 'next/navigation';

export default function WorldBankPage() {
    // Redirect to worldbank assessment dashboard
    redirect('/worldbank/assess');
}
