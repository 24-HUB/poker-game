import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_LOCAL_MOCK_ACCOUNTS: process.env.NEXT_PUBLIC_LOCAL_MOCK_ACCOUNTS ?? 'false',
  },
};

export default nextConfig;
