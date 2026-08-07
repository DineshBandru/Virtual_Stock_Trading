const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const { syncNseEquityInstruments } = require("../services/instrumentService");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  const result = await syncNseEquityInstruments();
  console.log(JSON.stringify(result, null, 2));
};

run()
  .catch((error) => {
    console.error(`NSE instrument sync failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
