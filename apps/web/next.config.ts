import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@langchain/langgraph',
    'langchain',
    '@langchain/core',
    '@langchain/openai',
  ],
  transpilePackages: ['agents'],
};

export default nextConfig;
