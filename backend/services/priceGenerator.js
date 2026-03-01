const { pool } = require('../config/database');
const marketService = require('./marketService');

const GENERATION_INTERVAL_MS = 30000; // 30 seconds

async function generatePrices() {
    console.log('Starting price generation cycle...');

    if (!await marketService.isMarketOpen()) {
        console.log('Market is closed. Skipping price generation.');
        return;
    }

    const client = await pool.connect();

    try {
        const stocksRes = await client.query('SELECT * FROM stocks WHERE is_active = true');
        const stocks = stocksRes.rows;

        for (const stock of stocks) {
            // Get previous close
            const priceRes = await client.query(
                'SELECT close FROM price_history WHERE stock_id = $1 ORDER BY recorded_at DESC LIMIT 1',
                [stock.stock_id]
            );

            let previousClose = stock.initial_price;
            if (priceRes.rows.length > 0) {
                previousClose = parseFloat(priceRes.rows[0].close);
            } else {
                // Initialize first price record
                const initialCap = stock.total_volume * stock.initial_price;
                await client.query(
                    'INSERT INTO price_history (stock_id, open, close, high, low, market_cap) VALUES ($1, $2, $3, $4, $5, $6)',
                    [stock.stock_id, stock.initial_price, stock.initial_price, stock.initial_price, stock.initial_price, initialCap]
                );
                continue;
            }

            // Generate random movement
            const direction = Math.random() < 0.5 ? -1 : 1;
            const changePercent = (Math.random() * 2.9) + 0.1; // 0.1% to 3.0%

            const open = previousClose;
            const close = parseFloat((open * (1 + (direction * changePercent / 100))).toFixed(2));

            const highVariation = Math.random() * 0.5;
            const lowVariation = Math.random() * 0.5;

            const high = parseFloat((Math.max(open, close) * (1 + highVariation / 100)).toFixed(2));
            const low = parseFloat((Math.min(open, close) * (1 - lowVariation / 100)).toFixed(2));

            const marketCap = parseFloat((stock.total_volume * close).toFixed(2));

            await client.query(
                'INSERT INTO price_history (stock_id, open, close, high, low, market_cap) VALUES ($1, $2, $3, $4, $5, $6)',
                [stock.stock_id, open, close, high, low, marketCap]
            );
        }
        console.log(`Generated prices for ${stocks.length} stocks.`);

    } catch (error) {
        console.error('Error generating prices:', error);
    } finally {
        client.release();
    }
}

function start() {
    // Run initially
    generatePrices();

    // Run periodically
    setInterval(generatePrices, GENERATION_INTERVAL_MS);
}

module.exports = { start };
