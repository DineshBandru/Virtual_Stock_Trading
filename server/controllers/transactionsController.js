const Transaction = require("../models/Transaction");

const getTransactions = async (req, res, next) => {
  try {
    const { type, symbol, start, end } = req.query;
    const filter = { userId: req.user.id };
    if (type) filter.type = type;
    if (symbol) filter.symbol = symbol;
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = new Date(start);
      if (end) filter.timestamp.$lte = new Date(end);
    }

    const items = await Transaction.find(filter).sort({ timestamp: -1 }).lean();
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    const items = await Transaction.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .lean();

    const header = "type,symbol,company,quantity,price,total,timestamp";
    const rows = items.map((item) =>
      [
        item.type,
        item.symbol,
        item.companyName,
        item.quantity,
        item.price,
        item.total,
        item.timestamp.toISOString()
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions.csv"
    );
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getTransactions, exportCsv };
