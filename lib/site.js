// Who runs the site. Shown on the About, Privacy and Terms pages.
export const OWNER = "Nick Hutton";
export const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@going-going-gone.uk";
export const GROUP_NAME = "Market Bosworth Classifieds";
export const GROUP_URL = "https://www.facebook.com/groups/682901678529822";
export const GROUP_MEMBERS = "7,000";
// Data protection registration number (Information Commission). Shown on the About and
// Privacy pages and in the footer. Can be overridden in Vercel with NEXT_PUBLIC_ICO_REG.
export const ICO_REG = process.env.NEXT_PUBLIC_ICO_REG || "ZC265079";
// The live web address, used in posts written for Facebook.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.going-going-gone.uk").replace(/\/$/, "");
