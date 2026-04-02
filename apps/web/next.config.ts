import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@langchain/langgraph',
    'langchain',
    '@langchain/core',
    '@langchain/openai',
    '@react-pdf/renderer',
  ],
  transpilePackages: ['agents'],
};

export default nextConfig;
