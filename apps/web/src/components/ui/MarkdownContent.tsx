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
  let listBuffer: Array<{ node: React.ReactNode; meta: { key: string; val: string }[] }> = [];
  let listType: 'ul' | 'ol' | null = null;
  let tableRows: string[][] = [];
  let tableHasHeader = false;

  /** Pull [Key: value] bracket annotations out of a list-item string */
  function extractBracketMeta(text: string): { body: string; meta: { key: string; val: string }[] } {
    const meta: { key: string; val: string }[] = [];
    const body = text
      .replace(/\[([A-Za-z][A-Za-z\s]{1,20}):\s*([^\]]+)\]/g, (_, k, v) => {
        meta.push({ key: k.trim(), val: v.trim() });
        return '';
      })
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { body, meta };
  }

  const flushList = () => {
    if (listBuffer.length > 0) {
      const items = listBuffer.map((item, idx) => (
        <li key={idx} className="mb-1.5">
          <div>{item.node}</div>
          {item.meta.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.meta.map((m, mi) => (
                <span
                  key={mi}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full"
                >
                  <span className="font-semibold text-gray-600">{m.key}:</span> {m.val}
                </span>
              ))}
            </div>
          )}
        </li>
      ));
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1 my-3 text-[15px] text-gray-800 leading-relaxed">
            {items}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-3 text-[15px] text-gray-800 leading-relaxed">
            {items}
          </ul>
        );
      }
      listBuffer = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [headerRow, ...bodyRows] = tableRows;
    elements.push(
      <div key={`table-${elements.length}`} className="my-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-[13px] border-collapse">
          {tableHasHeader && headerRow && (
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {headerRow.map((cell, ci) => (
                  <th key={ci} className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    {inlineFormat(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-gray-700 align-top">
                    {inlineFormat(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    tableHasHeader = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      flushTable();
      elements.push(<div key={`br-${i}`} className="h-3" />);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      flushTable();
      elements.push(<hr key={`hr-${i}`} className="my-4 border-gray-200" />);
      continue;
    }

    // Table row: |...|...
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      // Separator row: |---|---|
      if (/^\|[-|: ]+\|$/.test(trimmed)) {
        tableHasHeader = tableRows.length > 0;
      } else {
        const cells = trimmed.slice(1, -1).split('|');
        tableRows.push(cells);
      }
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      flushTable();
      elements.push(
        <h4 key={`h4-${i}`} className="text-[14px] font-bold text-gray-900 mt-5 mb-2">
          {inlineFormat(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      flushTable();
      elements.push(
        <h3 key={`h3-${i}`} className="text-[16px] font-bold text-gray-900 mt-5 mb-2">
          {inlineFormat(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      flushTable();
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
      const { body, meta } = extractBracketMeta(olMatch[2]);
      listBuffer.push({ node: inlineFormat(body), meta });
      continue;
    }

    // Unordered list: "* ", "- ", "• "
    const ulMatch = trimmed.match(/^(?:[*\-•])\s+(.*)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      const { body, meta } = extractBracketMeta(ulMatch[1]);
      listBuffer.push({ node: inlineFormat(body), meta });
      continue;
    }

    // Regular paragraph
    flushList();
    flushTable();
    elements.push(
      <p key={`p-${i}`} className="text-[15px] text-gray-800 leading-relaxed my-1">
        {inlineFormat(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

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
