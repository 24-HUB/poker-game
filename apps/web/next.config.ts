import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_LOCAL_MOCK_ACCOUNTS: process.env.NEXT_PUBLIC_LOCAL_MOCK_ACCOUNTS ?? 'false',
  },
};

export default nextConfig;
