const { pool } = require('../config/database');

exports.isMarketOpen = async () => {
    const result = await pool.query(
        'SELECT market_open_time, market_close_time, is_active FROM market_configuration WHERE is_active = true'
    );

    if (result.rows.length === 0) return false;

    const config = result.rows[0];
    const now = new Date();

    // Check if weekend (0=Sunday, 6=Saturday)
    // const day = now.getDay();
    // if (day === 0 || day === 6) return false;

    // Check holidays
    // Use local date to match server time, not UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayOfMonth}`;

    const holidayCheck = await pool.query(
        'SELECT is_market_open FROM market_hours WHERE market_date = $1',
        [dateStr]
    );

    if (holidayCheck.rows.length > 0 && !holidayCheck.rows[0].is_market_open) {
        return false;
    }

    // Check time
    const currentTime = now.toTimeString().split(' ')[0];
    return currentTime >= config.market_open_time && currentTime <= config.market_close_time;
};

exports.getMarketConfig = async () => {
    const result = await pool.query('SELECT * FROM market_configuration WHERE is_active = true');
    const config = result.rows[0];
    const isOpen = await exports.isMarketOpen();
    return { ...config, isOpen };
};

const websocketService = require('./websocketService');

exports.updateMarketConfig = async (openTime, closeTime) => {
    const result = await pool.query(
        'UPDATE market_configuration SET market_open_time = $1, market_close_time = $2 WHERE is_active = true RETURNING *',
        [openTime, closeTime]
    );

    // Emit real-time update
    try {
        const io = websocketService.getIo();
        io.emit('market-config-update', result.rows[0]);
    } catch (error) {
        console.error('Failed to emit market config update:', error);
    }

    return result.rows[0];
};

exports.addHoliday = async (date) => {
    // Get active config id
    const configRes = await pool.query('SELECT config_id FROM market_configuration WHERE is_active = true');
    if (configRes.rows.length === 0) throw new Error('No active market configuration');
    const configId = configRes.rows[0].config_id;

    const result = await pool.query(
        'INSERT INTO market_hours (config_id, market_date, day_type, is_market_open) VALUES ($1, $2, $3, $4) RETURNING *',
        [configId, date, 'holiday', false]
    );
    return result.rows[0];
};

exports.getHolidays = async () => {
    const result = await pool.query(
        'SELECT * FROM market_hours WHERE day_type = $1 ORDER BY market_date ASC',
        ['holiday']
    );
    return result.rows;
};

exports.getStocks = async () => {
    const today = new Date().toISOString().split('T')[0];
    const query = `
        SELECT 
            s.*,
            COALESCE(ph_latest.close, s.initial_price) as current_price,
            COALESCE(ph_open.open, COALESCE(ph_prev.close, s.initial_price)) as open_price,
            (COALESCE(ph_latest.close, s.initial_price) - COALESCE(ph_open.open, COALESCE(ph_prev.close, s.initial_price))) as change,
            CASE 
                WHEN COALESCE(ph_open.open, COALESCE(ph_prev.close, s.initial_price)) = 0 THEN 0
                ELSE ((COALESCE(ph_latest.close, s.initial_price) - COALESCE(ph_open.open, COALESCE(ph_prev.close, s.initial_price))) / COALESCE(ph_open.open, COALESCE(ph_prev.close, s.initial_price))) * 100
            END as change_percent
        FROM stocks s
        LEFT JOIN LATERAL (
            SELECT close, recorded_at 
            FROM price_history 
            WHERE stock_id = s.stock_id 
            ORDER BY recorded_at DESC 
            LIMIT 1
        ) ph_latest ON true
        LEFT JOIN LATERAL (
            SELECT open 
            FROM price_history 
            WHERE stock_id = s.stock_id 
            AND DATE(recorded_at) = $1
            ORDER BY recorded_at ASC 
            LIMIT 1
        ) ph_open ON true
        LEFT JOIN LATERAL (
            SELECT close
            FROM price_history
            WHERE stock_id = s.stock_id
            AND DATE(recorded_at) < $1
            ORDER BY recorded_at DESC
            LIMIT 1
        ) ph_prev ON true
        WHERE s.is_active = true
    `;
    const result = await pool.query(query, [today]);

    // Ensure numeric values are parsed correctly as they might come back as strings from Postgres
    return result.rows.map(row => ({
        ...row,
        current_price: parseFloat(row.current_price),
        open_price: parseFloat(row.open_price),
        change: parseFloat(row.change),
        change_percent: parseFloat(row.change_percent)
    }));
};

exports.getStockByTicker = async (ticker) => {
    const result = await pool.query('SELECT * FROM stocks WHERE ticker_symbol = $1', [ticker]);
    return result.rows[0];
};

exports.createStock = async (stockData, adminUserId) => {
    const { company_name, ticker_symbol, total_volume, initial_price } = stockData;

    const result = await pool.query(
        'INSERT INTO stocks (company_name, ticker_symbol, total_volume, initial_price, created_by_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [company_name, ticker_symbol, total_volume, initial_price, adminUserId]
    );

    return result.rows[0];
};

exports.buyStock = async (userId, ticker, shares) => {
    if (!await exports.isMarketOpen()) {
        throw new Error('Market is closed');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get stock info
        const stockRes = await client.query('SELECT * FROM stocks WHERE ticker_symbol = $1', [ticker]);
        const stock = stockRes.rows[0];
        if (!stock) throw new Error('Stock not found');

        // Get current price
        const priceRes = await client.query(
            'SELECT close FROM price_history WHERE stock_id = $1 ORDER BY recorded_at DESC LIMIT 1',
            [stock.stock_id]
        );
        const currentPrice = priceRes.rows.length > 0 ? priceRes.rows[0].close : stock.initial_price;
        const totalCost = currentPrice * shares;

        // Check balance
        const balanceRes = await client.query('SELECT balance FROM cash_accounts WHERE user_id = $1', [userId]);
        const balance = parseFloat(balanceRes.rows[0].balance);

        if (balance < totalCost) {
            throw new Error('Insufficient funds');
        }

        // Deduct cash
        await client.query(
            'UPDATE cash_accounts SET balance = balance - $1 WHERE user_id = $2',
            [totalCost, userId]
        );

        // Update portfolio
        const portfolioRes = await client.query(
            'SELECT * FROM portfolio WHERE user_id = $1 AND stock_id = $2',
            [userId, stock.stock_id]
        );

        if (portfolioRes.rows.length === 0) {
            await client.query(
                'INSERT INTO portfolio (user_id, stock_id, shares_owned, average_purchase_price) VALUES ($1, $2, $3, $4)',
                [userId, stock.stock_id, shares, currentPrice]
            );
        } else {
            const currentShares = portfolioRes.rows[0].shares_owned;
            const currentAvg = parseFloat(portfolioRes.rows[0].average_purchase_price);
            const newShares = currentShares + shares;
            const newAvg = ((currentShares * currentAvg) + (shares * currentPrice)) / newShares;

            await client.query(
                'UPDATE portfolio SET shares_owned = $1, average_purchase_price = $2, last_updated = NOW() WHERE user_id = $3 AND stock_id = $4',
                [newShares, newAvg, userId, stock.stock_id]
            );
        }

        // Record transaction
        const transRes = await client.query(
            'INSERT INTO transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, stock.stock_id, 'buy', shares, currentPrice, totalCost]
        );

        await client.query('COMMIT');
        return transRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.sellStock = async (userId, ticker, shares) => {
    if (!await exports.isMarketOpen()) {
        throw new Error('Market is closed');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get stock info
        const stockRes = await client.query('SELECT * FROM stocks WHERE ticker_symbol = $1', [ticker]);
        const stock = stockRes.rows[0];
        if (!stock) throw new Error('Stock not found');

        // Get current price
        const priceRes = await client.query(
            'SELECT close FROM price_history WHERE stock_id = $1 ORDER BY recorded_at DESC LIMIT 1',
            [stock.stock_id]
        );
        const currentPrice = priceRes.rows.length > 0 ? priceRes.rows[0].close : stock.initial_price;
        const totalProceeds = currentPrice * shares;

        // Check portfolio
        const portfolioRes = await client.query(
            'SELECT * FROM portfolio WHERE user_id = $1 AND stock_id = $2',
            [userId, stock.stock_id]
        );

        if (portfolioRes.rows.length === 0 || portfolioRes.rows[0].shares_owned < shares) {
            throw new Error('Insufficient shares to sell');
        }

        // Deduct shares
        const currentShares = portfolioRes.rows[0].shares_owned;
        const newShares = currentShares - shares;

        if (newShares === 0) {
            await client.query(
                'DELETE FROM portfolio WHERE user_id = $1 AND stock_id = $2',
                [userId, stock.stock_id]
            );
        } else {
            await client.query(
                'UPDATE portfolio SET shares_owned = $1, last_updated = NOW() WHERE user_id = $2 AND stock_id = $3',
                [newShares, userId, stock.stock_id]
            );
        }

        // Add cash
        await client.query(
            'UPDATE cash_accounts SET balance = balance + $1 WHERE user_id = $2',
            [totalProceeds, userId]
        );

        // Record transaction
        const transRes = await client.query(
            'INSERT INTO transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, stock.stock_id, 'sell', shares, currentPrice, totalProceeds]
        );

        await client.query('COMMIT');
        return transRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.deleteHoliday = async (scheduleId) => {
    const result = await pool.query(
        'DELETE FROM market_hours WHERE schedule_id = $1 RETURNING *',
        [scheduleId]
    );
    return result.rows[0];
};
