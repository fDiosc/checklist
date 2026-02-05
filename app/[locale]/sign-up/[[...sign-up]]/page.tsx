import { redirect } from 'next/navigation';

// Sign-up is disabled - users are created by admins
export default function SignUpPage() {
    redirect('/sign-in');
}
