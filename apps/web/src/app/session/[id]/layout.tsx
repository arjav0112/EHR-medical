import { ReactNode } from 'react';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-[#f8fafc] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}
