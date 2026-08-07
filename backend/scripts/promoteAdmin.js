const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/User");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email).split("@");
  const visibleLocal = local.length <= 2 ? `${local[0] || ""}*` : `${local.slice(0, 2)}***`;
  const [domainName = "", ...domainRest] = domain.split(".");
  const visibleDomain = domainName ? `${domainName[0]}***` : "***";
  return `${visibleLocal}@${visibleDomain}${domainRest.length ? `.${domainRest.join(".")}` : ""}`;
};

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
};

const main = async () => {
  const email = String(getArgValue("email") || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm --prefix backend run admin:promote -- --email user@example.com");
    process.exitCode = 1;
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  const user = await User.findOne({ email }).select("email role");
  if (!user) {
    console.error(`No existing user found for ${maskEmail(email)}`);
    process.exitCode = 1;
    return;
  }

  if (user.role === "admin") {
    console.log(`User ${maskEmail(user.email)} is already admin`);
    return;
  }

  console.log(`Promoting existing user ${maskEmail(user.email)} to admin`);
  user.role = "admin";
  await user.save();
  console.log(`Admin promotion complete for ${maskEmail(user.email)}`);
};

main()
  .catch((error) => {
    console.error(error.message || "Admin promotion failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
