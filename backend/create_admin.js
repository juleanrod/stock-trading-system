const { pool } = require('./config/database');
const bcrypt = require('bcrypt');

const createAdmin = async () => {
    const client = await pool.connect();
    try {
        const passwordHash = await bcrypt.hash('admin123', 10);

        // Check if admin exists
        const check = await client.query("SELECT * FROM users WHERE username = 'admin'");
        if (check.rows.length > 0) {
            console.log('Admin user already exists');
            // Update password just in case
            await client.query("UPDATE users SET password_hash = $1 WHERE username = 'admin'", [passwordHash]);
            console.log('Admin password updated');
            return;
        }

        await client.query('BEGIN');

        const res = await client.query(
            "INSERT INTO users (name, username, email, password_hash, role) VALUES ('System Admin', 'admin', 'admin@stockapp.local', $1, 'admin') RETURNING user_id",
            [passwordHash]
        );

        const userId = res.rows[0].user_id;

        await client.query(
            "INSERT INTO cash_accounts (user_id, balance) VALUES ($1, 1000000.00)",
            [userId]
        );

        await client.query('COMMIT');
        console.log('Admin user created successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating admin:', err);
    } finally {
        client.release();
        pool.end();
    }
};

createAdmin();
