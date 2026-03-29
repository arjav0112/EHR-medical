'use client';

import { useState } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`bg-[#E5E7EB] animate-pulse rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="20px" />
        <Skeleton width="80px" height="18px" className="rounded-full" />
      </div>
      {/* Confidence bar */}
      <Skeleton width="100%" height="6px" className="rounded-full" />
      {/* Content card */}
      <div className="border border-[#E0DDD6] rounded-xl p-5 space-y-3">
        <Skeleton width="100%" height="14px" />
        <Skeleton width="95%" height="14px" />
        <Skeleton width="90%" height="14px" />
        <Skeleton width="78%" height="14px" />
        <Skeleton width="85%" height="14px" />
        <Skeleton width="60%" height="14px" />
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Skeleton width="100px" height="36px" className="rounded-full" />
        <Skeleton width="140px" height="36px" className="rounded-full" />
        <Skeleton width="90px" height="36px" className="rounded-full" />
      </div>
    </div>
  );
}

export function ReviewDashboardSkeleton() {
  return (
    <div className="flex h-screen bg-[#F8F8F6] pt-16">
      {/* Sidebar */}
      <div className="w-[240px] bg-white border-r border-[#E0DDD6] p-5 space-y-2 flex-shrink-0">
        <Skeleton width="80px" height="12px" className="mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton width="32px" height="32px" className="rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="80%" height="12px" />
              <Skeleton width="50%" height="10px" />
            </div>
          </div>
        ))}
      </div>
      {/* Main content */}
      <div className="flex-1 px-10 py-8">
        <SectionSkeleton />
      </div>
    </div>
  );
}

export function StreamingSkeleton() {
  return (
    <div className="bg-[#FAFAFA] border border-[#E0DDD6] rounded-xl p-4 space-y-2 animate-pulse">
      <Skeleton width="100%" height="14px" />
      <Skeleton width="92%" height="14px" />
      <Skeleton width="97%" height="14px" />
      <Skeleton width="65%" height="14px" />
    </div>
  );
}
