-- Blocked domains
CREATE TABLE blocked_domains (
    id TEXT PRIMARY KEY,
    hostname TEXT NOT NULL
);

-- Remote lists
CREATE TABLE remote_lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    last_updated INTEGER NOT NULL
);

