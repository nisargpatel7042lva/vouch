import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    dirs: ['app', 'lib', 'scripts'],
  },
}

export default nextConfig
