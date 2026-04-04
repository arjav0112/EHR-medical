import { ReactNode } from 'react';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/60 flex flex-col">
      <div className="flex-1 flex flex-col relative">
        {children}
      </div>
    </div>
  );
}
