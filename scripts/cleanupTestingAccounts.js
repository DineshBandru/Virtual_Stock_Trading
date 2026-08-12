const path = require("path");
const dotenv = require("../backend/node_modules/dotenv");
const mongoose = require("../backend/node_modules/mongoose");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { cleanupTestingData, findTestingData } = require("../backend/services/testingDataCleanupService");
const shouldDelete = process.argv.includes("--delete");

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const { users, testInstruments } = await findTestingData();

  console.log(`Matched ${users.length} testing account(s):`);
  for (const user of users) {
    console.log(`- ${user._id} | ${user.role} | ${user.name} | ${user.email} | ${user.createdAt?.toISOString?.() || user.createdAt}`);
  }

  console.log(`Matched ${testInstruments.length} testing instrument(s):`);
  for (const instrument of testInstruments) {
    console.log(`- ${instrument._id} | ${instrument.symbol} | ${instrument.tradingSymbol} | ${instrument.companyName}`);
  }

  if (!shouldDelete || (users.length === 0 && testInstruments.length === 0)) {
    console.log(shouldDelete ? "Nothing to delete." : "Dry run only. Re-run with --delete to permanently remove these accounts, related records, and test instruments.");
    await mongoose.disconnect();
    return;
  }

  const { removedEmails, results } = await cleanupTestingData({ knownUsers: users, knownInstruments: testInstruments });

  console.log(`Removed testing account emails: ${removedEmails.length ? removedEmails.join(", ") : "none"}`);
  console.log("Deletion results:");
  for (const [collection, result] of Object.entries(results)) {
    const count = result.deletedCount ?? result.modifiedCount ?? 0;
    console.log(`- ${collection}: ${count}`);
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
