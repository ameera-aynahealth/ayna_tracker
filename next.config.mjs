/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/projects/**": [
      "./db/migrations/0001_best_version_master_list.sql",
      "./db/migrations/0002_beta_phase_labels.sql",
      "./db/bootstrap/best_version_scope_cleanup.sql",
    ],
  },
};

export default nextConfig;
