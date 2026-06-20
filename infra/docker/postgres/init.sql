-- Softmaking Archetype Database Initialization
-- This file runs automatically when PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default timezone
SET timezone = 'UTC';

-- Create application schema
CREATE SCHEMA IF NOT EXISTS app;
SET search_path TO app, public;