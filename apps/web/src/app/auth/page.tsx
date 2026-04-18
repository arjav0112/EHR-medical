import { redirect } from 'next/navigation';

/** Auth is now a floating modal on the home page. Redirect any direct /auth visits. */
export default function AuthPage() {
  redirect('/');
}
