const path = require("path");
const dotenv = require("../backend/node_modules/dotenv");
const mongoose = require("../backend/node_modules/mongoose");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const User = require("../backend/models/User");
const Alert = require("../backend/models/Alert");
const Competition = require("../backend/models/Competition");
const Order = require("../backend/models/Order");
const Portfolio = require("../backend/models/Portfolio");
const RefreshToken = require("../backend/models/RefreshToken");
const TradeReview = require("../backend/models/TradeReview");
const Transaction = require("../backend/models/Transaction");
const Watchlist = require("../backend/models/Watchlist");

const TEST_ACCOUNT_PATTERN = /(seed|test|demo|codex|dummy|fake)/i;
const shouldDelete = process.argv.includes("--delete");

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({
    $or: [{ email: TEST_ACCOUNT_PATTERN }, { name: TEST_ACCOUNT_PATTERN }]
  })
    .select("name email role createdAt")
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Matched ${users.length} testing account(s):`);
  for (const user of users) {
    console.log(`- ${user._id} | ${user.role} | ${user.name} | ${user.email} | ${user.createdAt?.toISOString?.() || user.createdAt}`);
  }

  if (!shouldDelete || users.length === 0) {
    console.log(shouldDelete ? "Nothing to delete." : "Dry run only. Re-run with --delete to permanently remove these accounts and related records.");
    await mongoose.disconnect();
    return;
  }

  const userIds = users.map((user) => user._id);
  const results = {};

  results.alerts = await Alert.deleteMany({ userId: { $in: userIds } });
  results.orders = await Order.deleteMany({ userId: { $in: userIds } });
  results.portfolios = await Portfolio.deleteMany({ userId: { $in: userIds } });
  results.refreshTokens = await RefreshToken.deleteMany({ userId: { $in: userIds } });
  results.tradeReviews = await TradeReview.deleteMany({ userId: { $in: userIds } });
  results.transactions = await Transaction.deleteMany({ userId: { $in: userIds } });
  results.watchlists = await Watchlist.deleteMany({ userId: { $in: userIds } });
  results.competitionParticipants = await Competition.updateMany(
    { "participants.userId": { $in: userIds } },
    { $pull: { participants: { userId: { $in: userIds } } } }
  );
  results.users = await User.deleteMany({ _id: { $in: userIds } });

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
