/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/projects/**": ["./db/bootstrap/best_version_scope_cleanup.sql"],
  },
};

export default nextConfig;
