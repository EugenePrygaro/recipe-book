import { MOBILE_QUERY } from "../config.js";

export const mobileQuery = matchMedia(MOBILE_QUERY);
export const isMobile = () => mobileQuery.matches;
