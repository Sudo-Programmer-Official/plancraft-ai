// Removes optional surrounding quotes and trims whitespace so env strings become valid cron specs.
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(['"])(.*)\1$/);
  return match ? match[2].trim() : trimmed;
}

export function normalizeCronSpec(rawValue, fallbackValue) {
  const normalized = stripQuotes(rawValue);
  if (normalized) return normalized;
  const fallback = stripQuotes(fallbackValue);
  return fallback || "";
}
