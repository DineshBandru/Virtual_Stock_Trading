const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const stockRoutes = require("./routes/stocks");
const tradeRoutes = require("./routes/trade");
const portfolioRoutes = require("./routes/portfolio");
const transactionRoutes = require("./routes/transactions");
const watchlistRoutes = require("./routes/watchlist");
const alertRoutes = require("./routes/alerts");
const leaderboardRoutes = require("./routes/leaderboard");
const competitionRoutes = require("./routes/competitions");
const newsRoutes = require("./routes/news");
const adminRoutes = require("./routes/admin");
const { errorHandler } = require("./middleware/error");
const { attachSocket } = require("./socket");

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!allowedOrigins.includes("http://localhost:3001")) {
  allowedOrigins.push("http://localhost:3001");
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

attachSocket(io);

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/competitions", competitionRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

mongoose
  .connect(mongoUri)
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection error", err);
    process.exit(1);
  });
