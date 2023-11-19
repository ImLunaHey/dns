-- Blocked domains
CREATE TABLE
    IF NOT EXISTS blocked_domains (
        id VARCHAR(36) PRIMARY KEY,
        hostname VARCHAR(500) NOT NULL,
        CONSTRAINT hostname UNIQUE (hostname)
    );

-- Remote lists
CREATE TABLE
    IF NOT EXISTS remote_lists (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        last_updated INTEGER NOT NULL
    );

-- Users
CREATE TABLE
    IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        roles INTEGER NOT NULL DEFAULT 0,
        features INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT username UNIQUE (username),
        CONSTRAINT email UNIQUE (email)
    );

-- Devices
CREATE TABLE
    IF NOT EXISTS devices (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(50) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        CONSTRAINT name UNIQUE (name),
        CONSTRAINT ip_address UNIQUE (ip_address),
        CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );