const express = require('express');
const router = express.Router();
const marketService = require('../services/marketService');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

router.get('/status', async (req, res) => {
    try {
        const isOpen = await marketService.isMarketOpen();
        res.json({ isOpen });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/config', authenticateToken, authorizeAdmin, async (req, res) => {
    const { market_open_time, market_close_time } = req.body;
    try {
        const config = await marketService.updateMarketConfig(market_open_time, market_close_time);
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/holidays', authenticateToken, authorizeAdmin, async (req, res) => {
    const { date } = req.body;
    try {
        const holiday = await marketService.addHoliday(date);
        res.status(201).json(holiday);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/holidays', authenticateToken, async (req, res) => {
    try {
        const holidays = await marketService.getHolidays();
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = await marketService.getMarketConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/stocks', authenticateToken, async (req, res) => {
    try {
        const stocks = await marketService.getStocks();
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/stocks', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const stock = await marketService.createStock(req.body, req.user.user_id);
        res.status(201).json(stock);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/buy', authenticateToken, async (req, res) => {
    const { ticker, shares } = req.body;
    try {
        const transaction = await marketService.buyStock(req.user.user_id, ticker, parseInt(shares));
        res.json(transaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/sell', authenticateToken, async (req, res) => {
    const { ticker, shares } = req.body;
    try {
        const transaction = await marketService.sellStock(req.user.user_id, ticker, parseInt(shares));
        res.json(transaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/holidays/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const result = await marketService.deleteHoliday(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Holiday not found' });
        }
        res.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
