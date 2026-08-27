/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      /**
       * The homepage section editors moved under /admin/pages/homepage when
       * "Pages" became a group in its own right. Kept so an open tab or a
       * bookmark lands on the editor rather than a 404.
       */
      {
        source: "/admin/sections/:section",
        destination: "/admin/pages/homepage/:section",
        permanent: false,
      },
      { source: "/admin/sections", destination: "/admin/pages/homepage", permanent: false },
    ];
  },
};

export default nextConfig;
