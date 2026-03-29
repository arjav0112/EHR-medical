import { ReactNode } from 'react';
import Nav from '@/components/layout/Nav';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <div className="flex-1 flex flex-col pt-16">
        {children}
      </div>
    </div>
  );
}
