import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { PDFDocument } from './PDFTemplate';
import type { ReviewPackage } from 'agents';

/**
 * 🚀 PDF ROUTE REFACTOR: 2026-03-31T17:28:00Z
 * Using .ts extension for the route handler to avoid Turbopack CJS/JSX confusion.
 * The visual template is imported from PDFTemplate.tsx.
 */

export async function POST(req: NextRequest) {
  console.log('[PDF_API] POST request received (Split JS/TS Route)');
  
  let reviewPackage: ReviewPackage;
  try {
    reviewPackage = await req.json();
  } catch (err) {
    console.error('[PDF_API] JSON parse error:', err);
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!reviewPackage || !reviewPackage.soapNote) {
    console.warn('[PDF_API] Missing reviewPackage or soapNote');
    return NextResponse.json({ error: 'missing_data' }, { status: 400 });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const tsStr = now.toISOString();

  try {
    console.log('[PDF_API] Starting renderToBuffer...');
    
    // We use React.createElement here to render the imported TSX component
    // within the pure .ts route handler.
    const buffer = await renderToBuffer(
      React.createElement(PDFDocument, { reviewPackage, dateStr, tsStr }) as any
    );
    
    console.log(`[PDF_API] PDF successfully generated. Size: ${buffer.byteLength} bytes`);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="clinical-note-${reviewPackage.sessionId || 'export'}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[PDF_API] React-PDF Rendering Error:', err);
    const message = err instanceof Error ? err.message : 'PDF generation failed during rendering';
    
    return NextResponse.json({ 
      error: 'render_failed', 
      message, 
      stack: process.env.NODE_ENV === 'development' ? (err as Error).stack : undefined
    }, { status: 500 });
  }
}
