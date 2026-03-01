const { pool } = require('../config/database');

const POLL_INTERVAL_MS = 2000; // 2 seconds

let lastPollTime = new Date();

function start(io) {
    console.log('Starting price poller service...');

    setInterval(async () => {
        try {
            const client = await pool.connect();

            const today = new Date().toISOString().split('T')[0];
            const query = `
        SELECT 
            s.ticker_symbol, 
            p.close, 
            p.high, 
            p.low, 
            p.market_cap, 
            p.recorded_at,
            (SELECT open FROM price_history WHERE stock_id = s.stock_id AND DATE(recorded_at) = $2 ORDER BY recorded_at ASC LIMIT 1) as open_price
        FROM price_history p
        JOIN stocks s ON p.stock_id = s.stock_id
        WHERE p.recorded_at > $1
        ORDER BY p.recorded_at ASC
      `;

            const result = await client.query(query, [lastPollTime, today]);
            client.release();

            if (result.rows.length > 0) {
                lastPollTime = result.rows[result.rows.length - 1].recorded_at;

                // Broadcast updates
                result.rows.forEach(update => {
                    const currentPrice = parseFloat(update.close);
                    const openPrice = parseFloat(update.open_price || currentPrice); // Fallback to current if no open found (shouldn't happen)
                    const change = currentPrice - openPrice;
                    const changePercent = openPrice === 0 ? 0 : (change / openPrice) * 100;

                    io.emit('price-update', {
                        ticker: update.ticker_symbol,
                        price: currentPrice,
                        high: parseFloat(update.high),
                        low: parseFloat(update.low),
                        marketCap: parseFloat(update.market_cap),
                        change: change,
                        change_percent: changePercent,
                        timestamp: update.recorded_at
                    });
                });

                // console.log(`Broadcasted ${result.rows.length} price updates`);
            }

        } catch (error) {
            console.error('Error polling prices:', error);
        }
    }, POLL_INTERVAL_MS);
}

module.exports = { start };
