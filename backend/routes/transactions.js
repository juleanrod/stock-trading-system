const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, s.ticker_symbol, s.company_name
       FROM transactions t
       JOIN stocks s ON t.stock_id = s.stock_id
       WHERE t.user_id = $1
       ORDER BY t.transaction_timestamp DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
