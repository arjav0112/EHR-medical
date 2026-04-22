import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@langchain/langgraph',
    'langchain',
    '@langchain/core',
    '@langchain/openai',
  ],
  transpilePackages: ['agents'],
};

export default withSentryConfig(nextConfig, {
  silent:    !process.env.CI,
  org:       process.env.SENTRY_ORG,
  project:   process.env.SENTRY_PROJECT,
  telemetry: false,

  webpack: {
    // Tree-shake Sentry debug logger in prod bundles (replaces deprecated disableLogger)
    treeshake: { removeDebugLogging: true },
    // Auto-instrument server functions (replaces deprecated autoInstrumentServerFunctions)
    autoInstrumentServerFunctions: true,
  },
});

