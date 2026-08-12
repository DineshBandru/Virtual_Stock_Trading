const User = require("../models/User");
const Alert = require("../models/Alert");
const Competition = require("../models/Competition");
const Instrument = require("../models/Instrument");
const Order = require("../models/Order");
const Portfolio = require("../models/Portfolio");
const RefreshToken = require("../models/RefreshToken");
const TradeReview = require("../models/TradeReview");
const Transaction = require("../models/Transaction");
const Watchlist = require("../models/Watchlist");
const {
  TEST_ACCOUNT_PATTERN,
  TEST_INSTRUMENT_PATTERN,
  testingAccountMatch
} = require("../utils/testData");

const findTestingData = async () => {
  const [users, testInstruments] = await Promise.all([
    User.find(testingAccountMatch)
      .select("name email role createdAt")
      .sort({ createdAt: 1 })
      .lean(),
    Instrument.find({
      $or: [
        { symbol: TEST_INSTRUMENT_PATTERN },
        { tradingSymbol: TEST_INSTRUMENT_PATTERN },
        { companyName: TEST_INSTRUMENT_PATTERN },
        { searchText: TEST_INSTRUMENT_PATTERN }
      ]
    })
      .select("symbol tradingSymbol companyName")
      .lean()
  ]);

  return { users, testInstruments };
};

const cleanupTestingData = async ({ knownUsers, knownInstruments } = {}) => {
  const { users, testInstruments } =
    knownUsers && knownInstruments
      ? { users: knownUsers, testInstruments: knownInstruments }
      : await findTestingData();

  const userIds = users.map((user) => user._id);
  const removedEmails = users.map((user) => user.email).filter(Boolean);
  const testSymbols = testInstruments
    .flatMap((instrument) => [instrument.symbol, instrument.tradingSymbol])
    .filter(Boolean);
  const instrumentIds = testInstruments.map((instrument) => instrument._id);
  const results = {};

  results.alerts = await Alert.deleteMany({
    $or: [{ userId: { $in: userIds } }, { symbol: { $in: testSymbols } }]
  });
  results.orders = await Order.deleteMany({
    $or: [
      { userId: { $in: userIds } },
      { symbol: { $in: testSymbols } },
      { companyName: TEST_INSTRUMENT_PATTERN }
    ]
  });
  results.portfolios = await Portfolio.deleteMany({
    $or: [
      { userId: { $in: userIds } },
      { symbol: { $in: testSymbols } },
      { companyName: TEST_INSTRUMENT_PATTERN }
    ]
  });
  results.refreshTokens = await RefreshToken.deleteMany({ userId: { $in: userIds } });
  results.tradeReviews = await TradeReview.deleteMany({
    $or: [{ userId: { $in: userIds } }, { symbol: { $in: testSymbols } }]
  });
  results.transactions = await Transaction.deleteMany({
    $or: [
      { userId: { $in: userIds } },
      { symbol: { $in: testSymbols } },
      { companyName: TEST_INSTRUMENT_PATTERN }
    ]
  });
  results.watchlists = await Watchlist.deleteMany({ userId: { $in: userIds } });
  results.competitionParticipants = await Competition.updateMany(
    { "participants.userId": { $in: userIds } },
    { $pull: { participants: { userId: { $in: userIds } } } }
  );
  results.competitions = await Competition.deleteMany({
    $or: [
      { name: TEST_ACCOUNT_PATTERN },
      { description: TEST_ACCOUNT_PATTERN },
      { "participants.userId": { $in: userIds } }
    ]
  });
  results.testInstruments = await Instrument.deleteMany({ _id: { $in: instrumentIds } });
  results.users = await User.deleteMany({ _id: { $in: userIds } });

  return {
    matchedAccounts: users.length,
    matchedInstruments: testInstruments.length,
    removedEmails,
    results: Object.fromEntries(
      Object.entries(results).map(([key, result]) => [
        key,
        result.deletedCount ?? result.modifiedCount ?? 0
      ])
    )
  };
};

module.exports = {
  cleanupTestingData,
  findTestingData
};
