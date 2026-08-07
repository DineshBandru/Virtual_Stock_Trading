const getWebsiteUrl = () => {
  if (import.meta.env.VITE_WEBSITE_URL) return import.meta.env.VITE_WEBSITE_URL;
  if (import.meta.env.DEV) return "http://localhost:3010";
  throw new Error("VITE_WEBSITE_URL must be configured for production admin builds");
};

export const websiteUrl = getWebsiteUrl();
