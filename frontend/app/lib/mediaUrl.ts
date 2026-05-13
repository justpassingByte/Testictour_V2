const getBackendOrigin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
};

export const resolveMediaUrl = (url?: string | null, fallback = "") => {
  const value = url?.trim();
  if (!value) return fallback;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/uploads/")) return `${getBackendOrigin()}${value}`;
  return value;
};
