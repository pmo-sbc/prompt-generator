-- Migration: Create pending_users and settings tables for user approval system
-- Run this in PostgreSQL: psql -h localhost -U postgres -d prompt_generator -f create-pending-users-table.sql

-- Create pending_users table
CREATE TABLE IF NOT EXISTS pending_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER,
  review_notes TEXT,
  FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
);

-- Create settings table for system configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO settings (key, value, description) 
VALUES ('user_approval_enabled', 'false', 'Enable/disable user approval mode for new signups')
ON CONFLICT (key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
CREATE INDEX IF NOT EXISTS idx_pending_users_created_at ON pending_users(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

