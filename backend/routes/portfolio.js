const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user portfolio
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, s.ticker_symbol, s.company_name, 
       (SELECT close FROM price_history WHERE stock_id = s.stock_id ORDER BY recorded_at DESC LIMIT 1) as current_price
       FROM portfolio p
       JOIN stocks s ON p.stock_id = s.stock_id
       WHERE p.user_id = $1`,
            [req.user.user_id]
        );

        // Calculate values
        const portfolio = result.rows.map(item => {
            const currentPrice = parseFloat(item.current_price || 0); // Handle case where no price history exists
            const totalValue = item.shares_owned * currentPrice;
            const totalCost = item.shares_owned * parseFloat(item.average_purchase_price);
            const profitLoss = totalValue - totalCost;
            const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

            return {
                ...item,
                current_price: currentPrice,
                total_value: totalValue.toFixed(2),
                profit_loss: profitLoss.toFixed(2),
                profit_loss_percent: profitLossPercent.toFixed(2)
            };
        });

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
