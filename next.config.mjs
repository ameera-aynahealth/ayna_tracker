/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/projects/**": [
      "./db/bootstrap/best_version_scope_cleanup.sql",
      "./db/bootstrap/best_version_health_intake_details.sql",
    ],
  },
};

export default nextConfig;
