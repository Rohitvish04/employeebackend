-- Run this once in the Neon SQL Editor
CREATE TABLE IF NOT EXISTS employees (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    role       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
