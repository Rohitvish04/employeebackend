require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors()); // allow frontend to talk to API
app.use(express.json()); // read JSON body

// Connect to Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create the table automatically if it does not exist
pool.query(`
  CREATE TABLE IF NOT EXISTS employees (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    role       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`);

// Simple validation
function isValid({ name, email, role }) {
  return name?.trim() && email?.trim() && role?.trim();
}

// GET /employees?search=john  -> list (with optional name search)
app.get('/employees', async (req, res) => {
  const search = `%${req.query.search || ''}%`;
  const { rows } = await pool.query(
    'SELECT * FROM employees WHERE name ILIKE $1 ORDER BY id DESC',
    [search]
  );
  res.json(rows);
});

// POST /employees -> add
app.post('/employees', async (req, res) => {
  if (!isValid(req.body)) return res.status(400).json({ error: 'All fields are required' });
  try {
    const { name, email, role } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO employees (name, email, role) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email.trim(), role.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    handleError(err, res);
  }
});

// PUT /employees/:id -> update
app.put('/employees/:id', async (req, res) => {
  if (!isValid(req.body)) return res.status(400).json({ error: 'All fields are required' });
  try {
    const { name, email, role } = req.body;
    const { rows } = await pool.query(
      'UPDATE employees SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
      [name.trim(), email.trim(), role.trim(), req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /employees/:id -> delete
app.delete('/employees/:id', async (req, res) => {
  await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

function handleError(err, res) {
  if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
  console.error(err);
  res.status(500).json({ error: 'Database error' });
}

// Start the server locally; on Vercel the exported app is used instead
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;