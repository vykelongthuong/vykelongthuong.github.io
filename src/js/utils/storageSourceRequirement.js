import { normalizeSourceUrl } from "./sourceUrl.js";

export function isRequiredSourceUrlProvided(rawValue) {
  return Boolean(normalizeSourceUrl(rawValue));
}
