import AuthGate from '@/components/AuthGate';

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
