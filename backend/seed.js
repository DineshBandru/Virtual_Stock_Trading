const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Competition = require('./models/Competition');
const Portfolio = require('./models/Portfolio');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const usersData = [
  { name: 'Seed User 1', email: 'seed1@example.com', password: 'Password123!', amount: 100000, hasSeenTour: true },
  { name: 'Seed User 2', email: 'seed2@example.com', password: 'Password123!', amount: 150000, hasSeenTour: true },
  { name: 'Seed User 3', email: 'seed3@example.com', password: 'Password123!', amount: 80000, hasSeenTour: true },
  { name: 'Seed User 4', email: 'seed4@example.com', password: 'Password123!', amount: 120000, hasSeenTour: true },
  { name: 'Seed User 5', email: 'seed5@example.com', password: 'Password123!', amount: 95000, hasSeenTour: true },
];

const STOCKS = [
  { symbol: 'RELIANCE.NS', companyName: 'Reliance Industries' },
  { symbol: 'TCS.NS', companyName: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', companyName: 'HDFC Bank' },
  { symbol: 'INFY.NS', companyName: 'Infosys' },
  { symbol: 'ICICIBANK.NS', companyName: 'ICICI Bank' }
];

const generateTransactions = (userId) => {
  const transactions = [];
  let balance = 100000;
  
  for (let i = 0; i < 10; i++) {
    const isBuy = Math.random() > 0.4 || transactions.length === 0;
    const type = isBuy ? 'BUY' : 'SELL';
    const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const quantity = Math.floor(Math.random() * 50) + 1;
    const price = Math.floor(Math.random() * 2000) + 500;
    const total = quantity * price;
    
    if (type === 'BUY' && balance >= total) {
      balance -= total;
      transactions.push({
        userId,
        symbol: stock.symbol,
        companyName: stock.companyName,
        type,
        quantity,
        price,
        total
      });
    } else if (type === 'SELL') {
      balance += total;
      transactions.push({
        userId,
        symbol: stock.symbol,
        companyName: stock.companyName,
        type,
        quantity,
        price,
        total
      });
    }
  }
  return transactions;
};

const competitionsData = [
  {
    name: 'Weekly Alpha Challenge',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    startingBalance: 100000,
    participants: [],
    status: 'active'
  },
  {
    name: 'Monthly Bulls Run',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    startingBalance: 1000000,
    participants: [],
    status: 'ended'
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Competition.deleteMany({});
    await Portfolio.deleteMany({});

    console.log('Existing DB cleared.');

    // Create Users
    const createdUsers = [];
    for (const u of usersData) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);
      const newUser = await User.create({
        name: u.name,
        email: u.email,
        password: hashedPassword,
        balance: u.amount,
        hasSeenTour: u.hasSeenTour
      });
      createdUsers.push(newUser);
      
      // Seed small portfolio positions for user
      const seedHoldings = STOCKS.slice(0, 2).map((stock, index) => {
        const quantity = 5 + index * 3;
        const avgBuyPrice = 1200 + index * 150;
        return {
          userId: newUser._id,
          symbol: stock.symbol,
          companyName: stock.companyName,
          quantity,
          avgBuyPrice,
          totalInvested: quantity * avgBuyPrice
        };
      });
      await Portfolio.insertMany(seedHoldings);
    }
    console.log('5 Fake Users created.');

    // Create Transactions for each user
    for (const user of createdUsers) {
      const userTransactions = generateTransactions(user._id);
      await Transaction.insertMany(userTransactions);
    }
    console.log('10 Transactions generated per user.');

    // Create Competitions
    const comps = await Competition.insertMany(competitionsData);
    
    // Add logic to join a user into a competition for demo
    comps[0].participants.push({
      userId: createdUsers[0]._id,
      balance: 100000
    });
    await comps[0].save();
    
    console.log('Competitions seeded.');
    
    console.log('Seed completed successfully!');
    process.exit();
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
};

seedDatabase();
