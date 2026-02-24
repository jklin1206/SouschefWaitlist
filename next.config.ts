import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const basePath = isGitHubPages && repoName ? `/${repoName}` : "";

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: "export",
      images: { unoptimized: true },
      trailingSlash: true,
      basePath,
      assetPrefix: basePath ? `${basePath}/` : undefined,
    }
  : {
      async rewrites() {
        return [
          {
            source: "/api/:path*",
            destination: "http://localhost:8080/api/:path*",
          },
          {
            source: "/oauth2/:path*",
            destination: "http://localhost:8080/oauth2/:path*",
          },
        ];
      },
    };

export default nextConfig;
