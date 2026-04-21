const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get cash balance
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT balance FROM cash_accounts WHERE user_id = $1',
            [req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cash account not found' });
        }

        res.json({ balance: parseFloat(result.rows[0].balance) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Deposit cash
router.post('/deposit', authenticateToken, async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Upsert balance to gracefully handle users created without initial cash accounts
        await client.query(
            'INSERT INTO cash_accounts (user_id, balance) VALUES ($2, $1) ON CONFLICT (user_id) DO UPDATE SET balance = cash_accounts.balance + EXCLUDED.balance, last_updated = NOW()',
            [amount, req.user.user_id]
        );

        // Record transaction
        await client.query(
            'INSERT INTO cash_transactions (user_id, transaction_type, amount, description) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, 'deposit', amount, 'Manual deposit']
        );

        await client.query('COMMIT');

        const result = await client.query('SELECT balance FROM cash_accounts WHERE user_id = $1', [req.user.user_id]);
        res.json({ message: 'Deposit successful', newBalance: parseFloat(result.rows[0].balance) });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
});

// Withdraw cash
router.post('/withdraw', authenticateToken, async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check balance
        const balanceRes = await client.query('SELECT balance FROM cash_accounts WHERE user_id = $1', [req.user.user_id]);
        if (balanceRes.rows.length === 0) {
            throw new Error('Insufficient funds (No cash account found)');
        }
        const currentBalance = parseFloat(balanceRes.rows[0].balance);

        if (currentBalance < amount) {
            throw new Error('Insufficient funds');
        }

        // Update balance
        await client.query(
            'UPDATE cash_accounts SET balance = balance - $1, last_updated = NOW() WHERE user_id = $2',
            [amount, req.user.user_id]
        );

        // Record transaction
        await client.query(
            'INSERT INTO cash_transactions (user_id, transaction_type, amount, description) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, 'withdraw', amount, 'Manual withdrawal']
        );

        await client.query('COMMIT');

        const result = await client.query('SELECT balance FROM cash_accounts WHERE user_id = $1', [req.user.user_id]);
        res.json({ message: 'Withdrawal successful', newBalance: parseFloat(result.rows[0].balance) });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally {
        client.release();
    }
});



// Get cash transactions history
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM cash_transactions WHERE user_id = $1 ORDER BY transaction_timestamp DESC',
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
