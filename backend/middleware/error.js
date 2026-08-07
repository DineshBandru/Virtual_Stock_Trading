const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction && status >= 500
    ? "Server error"
    : err.message || "Server error";
  res.status(status).json({ message });
};

module.exports = { errorHandler };
