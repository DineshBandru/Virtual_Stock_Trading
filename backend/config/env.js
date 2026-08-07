const LOCAL_DEVELOPMENT_ORIGINS = ["http://localhost:3010", "http://localhost:3016"];
const VALID_COOKIE_SAME_SITE = new Set(["none", "lax", "strict"]);

const isProduction = () => process.env.NODE_ENV === "production";

const parseCsv = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeCookieSameSite = () => {
  const secure = getCookieSecure();
  const configured = process.env.COOKIE_SAME_SITE || (secure ? "none" : "lax");
  const normalized = configured.toLowerCase();
  if (!VALID_COOKIE_SAME_SITE.has(normalized)) {
    throw new Error("Invalid COOKIE_SAME_SITE. Expected one of: none, lax, strict");
  }
  return normalized;
};

const getCookieSecure = () => {
  if (process.env.COOKIE_SECURE === undefined) return isProduction();
  const normalized = String(process.env.COOKIE_SECURE).trim().toLowerCase();
  if (!["true", "false"].includes(normalized)) {
    throw new Error("Invalid COOKIE_SECURE. Expected true or false");
  }
  return normalized === "true";
};

const getAllowedOrigins = () => {
  const origins = [
    ...parseCsv(process.env.CLIENT_URL),
    ...parseCsv(process.env.ADMIN_URL)
  ];

  if (!isProduction()) {
    origins.push(...LOCAL_DEVELOPMENT_ORIGINS);
  }

  return [...new Set(origins)];
};

const getCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();
  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  };
};

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: normalizeCookieSameSite(),
  secure: getCookieSecure(),
  maxAge
});

const getMongoDatabaseName = (mongoUri = "") => {
  const withoutQuery = String(mongoUri).split("?")[0];
  const match = withoutQuery.match(/^mongodb(?:\+srv)?:\/\/.+\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
};

const validateProductionEnv = () => {
  if (!isProduction()) {
    normalizeCookieSameSite();
    return;
  }

  ["MONGO_URI", "JWT_SECRET", "CLIENT_URL", "ADMIN_URL", "EMAIL_API_KEY", "EMAIL_FROM"].forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required production environment variable: ${key}`);
    }
  });

  if (getMongoDatabaseName(process.env.MONGO_URI) !== "vstp") {
    throw new Error("Production MONGO_URI must point to the vstp database");
  }

  if (!getCookieSecure()) {
    throw new Error("COOKIE_SECURE must be true in production");
  }

  normalizeCookieSameSite();
};

module.exports = {
  getAllowedOrigins,
  getCookieOptions,
  getCorsOptions,
  getMongoDatabaseName,
  validateProductionEnv
};
