const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const SALT_ROUNDS = 10;

exports.registerUser = async (userData) => {
    const { name, username, email, password } = userData;
    const role = 'customer';

    // Validate input
    if (!name || !username || !email || !password) {
        throw new Error('All fields are required');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user exists
        const userCheck = await client.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userCheck.rows.length > 0) {
            throw new Error('Username or email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const newUserResult = await client.query(
            'INSERT INTO users (name, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, username, role',
            [name, username, email, passwordHash, role]
        );

        const newUser = newUserResult.rows[0];

        // Create cash account
        await client.query(
            'INSERT INTO cash_accounts (user_id, balance) VALUES ($1, 0.00)',
            [newUser.user_id]
        );

        await client.query('COMMIT');

        // Generate token
        const token = jwt.sign(
            { user_id: newUser.user_id, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return { token, user: newUser };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.loginUser = async (credentials) => {
    const { username, password } = credentials;

    const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );

    const user = result.rows[0];

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        { user_id: user.user_id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    return {
        token,
        user: {
            user_id: user.user_id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email
        }
    };
};
