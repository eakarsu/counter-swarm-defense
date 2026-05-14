const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', verifyToken, async (req, res) => {
  const result = await pool.query('SELECT id,email,name,role FROM users WHERE id=$1', [req.user.id]);
  res.json(result.rows[0]);
});

module.exports = router;
