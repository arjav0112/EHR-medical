'use client';

import React from 'react';

/**
 * Lightweight clinical markdown renderer.
 * Handles: **bold**, headers (##), bullet lists (* / - / numbered),
 * line breaks, and (transcript:...) citations.
 */
export function MarkdownContent({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listBuffer.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1.5 my-3 text-[15px] text-gray-800 leading-relaxed">
            {listBuffer}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1.5 my-3 text-[15px] text-gray-800 leading-relaxed">
            {listBuffer}
          </ul>
        );
      }
      listBuffer = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-3" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${i}`} className="text-[14px] font-bold text-gray-900 mt-5 mb-2">
          {inlineFormat(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-[16px] font-bold text-gray-900 mt-5 mb-2">
          {inlineFormat(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-[18px] font-bold text-gray-900 mt-5 mb-2">
          {inlineFormat(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Ordered list: "1. ", "2. ", etc.
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listBuffer.push(
        <li key={`li-${i}`}>{inlineFormat(olMatch[2])}</li>
      );
      continue;
    }

    // Unordered list: "* ", "- ", "• "
    const ulMatch = trimmed.match(/^(?:[*\-•])\s+(.*)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listBuffer.push(
        <li key={`li-${i}`}>{inlineFormat(ulMatch[1])}</li>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-[15px] text-gray-800 leading-relaxed my-1">
        {inlineFormat(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={className}>{elements}</div>;
}

/** Inline formatting: **bold**, *italic*, `code`, (transcript:...) citations */
function inlineFormat(text: string): React.ReactNode {
  // Split by inline markdown patterns
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // *italic* (but not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // `code`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // (transcript:...) citation
    const citationMatch = remaining.match(/\(transcript:[^)]+\)/);

    // Find the earliest match
    type Candidate = { type: string; index: number; fullMatch: string; inner: string };
    const candidates: Candidate[] = [];
    if (boldMatch?.index !== undefined) candidates.push({ type: 'bold', index: boldMatch.index, fullMatch: boldMatch[0], inner: boldMatch[1] });
    if (italicMatch?.index !== undefined) candidates.push({ type: 'italic', index: italicMatch.index, fullMatch: italicMatch[0], inner: italicMatch[1] });
    if (codeMatch?.index !== undefined) candidates.push({ type: 'code', index: codeMatch.index, fullMatch: codeMatch[0], inner: codeMatch[1] });
    if (citationMatch?.index !== undefined) candidates.push({ type: 'citation', index: citationMatch.index, fullMatch: citationMatch[0], inner: citationMatch[0] });

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    // Pick the one that appears first
    candidates.sort((a, b) => a.index - b.index);
    const first = candidates[0];

    // Text before the match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    // The formatted segment
    if (first.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-gray-900">{first.inner}</strong>);
    } else if (first.type === 'italic') {
      parts.push(<em key={key++} className="italic">{first.inner}</em>);
    } else if (first.type === 'code') {
      parts.push(
        <code key={key++} className="bg-gray-100 text-gray-700 text-[13px] px-1.5 py-0.5 rounded font-mono">
          {first.inner}
        </code>
      );
    } else if (first.type === 'citation') {
      parts.push(
        <span key={key++} className="text-[11px] text-gray-400 font-mono">
          {first.inner}
        </span>
      );
    }

    remaining = remaining.slice(first.index + first.fullMatch.length);
  }

  return <>{parts}</>;
}
