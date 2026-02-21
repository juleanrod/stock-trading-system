const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { pool } = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database Connection Check
pool.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => console.error('Database connection error:', err.stack));

// Routes
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const portfolioRoutes = require('./routes/portfolio');
const cashRoutes = require('./routes/cash');
const transactionRoutes = require('./routes/transactions');

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/transactions', transactionRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('Stock Trading System API is running');
});

const http = require('http');
const server = http.createServer(app);
const websocketService = require('./services/websocketService');
const priceGenerator = require('./services/priceGenerator');
const pricePoller = require('./services/pricePoller');

// Initialize WebSocket
const io = websocketService.init(server);

// Start Background Services
priceGenerator.start();
pricePoller.start(io);

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
