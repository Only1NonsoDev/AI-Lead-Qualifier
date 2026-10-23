// Set NEXT_PUBLIC_BASE_PATH (e.g. "/lead-desk") when hosting under a sub-path such as GitHub Pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
