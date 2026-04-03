import { ReactNode } from 'react';
import Nav from '@/components/layout/Nav';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col selection:bg-neon-500/30">
      <Nav />
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      <div className="flex-1 flex flex-col pt-16 relative z-10">
        {children}
      </div>
    </div>
  );
}
