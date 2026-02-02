-- OpenClaw Mission Control Database Schema
-- SQLite Database Schema
-- Version: 1.0.0
-- Date: 2026-02-02

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =====================================================
-- Table: agents
-- Description: Agent metadata and status tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,              -- Agent display name (e.g., 'Jarvis', 'Shuri')
    session_key TEXT NOT NULL UNIQUE,       -- OpenClaw session key (e.g., 'agent:orchestrator:main')
    role TEXT NOT NULL,                     -- Agent role (orchestrator, engineer, analyst, etc.)
    emoji TEXT NOT NULL,                    -- Agent emoji (🤖, 🔬, 📊, etc.)
    status TEXT NOT NULL DEFAULT 'idle',    -- Current status (idle, working, offline, error)
    last_heartbeat INTEGER,                 -- Unix timestamp of last heartbeat
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for agents
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat ON agents(last_heartbeat);

-- =====================================================
-- Table: tasks
-- Description: Central task management system
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                    -- Task title
    description TEXT,                       -- Detailed task description
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, blocked, cancelled
    priority TEXT NOT NULL DEFAULT 'medium',-- low, medium, high, critical
    assigned_agent TEXT,                    -- Agent name (foreign key to agents)
    created_by TEXT NOT NULL,               -- Who created the task
    due_date INTEGER,                       -- Unix timestamp for due date
    completed_at INTEGER,                   -- Unix timestamp when completed
    metadata TEXT,                          -- JSON metadata for flexibility
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (assigned_agent) REFERENCES agents(name) ON DELETE SET NULL
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Full-text search on tasks
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(title, description, content='tasks', content_rowid='id');
CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
END;
CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES ('delete', old.id, old.title, old.description);
END;
CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES ('delete', old.id, old.title, old.description);
  INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
END;

-- =====================================================
-- Table: messages
-- Description: Thread-based messaging system
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,                -- Thread identifier (UUID or task ID)
    agent_name TEXT NOT NULL,               -- Agent who sent the message
    content TEXT NOT NULL,                  -- Message content
    mentions TEXT,                          -- JSON array of @mentions (e.g., ['@Jarvis', '@Shuri'])
    reply_to INTEGER,                       -- ID of message being replied to
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE,
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_agent_name ON messages(agent_name);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Full-text search on messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content='messages', content_rowid='id');
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
  INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;

-- =====================================================
-- Table: activities
-- Description: Audit log and activity feed
-- =====================================================
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,               -- Agent who performed the action
    action_type TEXT NOT NULL,              -- Action type (task_created, task_updated, message_sent, etc.)
    entity_type TEXT NOT NULL,              -- Entity type (task, message, document, etc.)
    entity_id TEXT NOT NULL,               -- ID of the entity
    description TEXT,                       -- Human-readable description
    metadata TEXT,                          -- JSON metadata for additional context
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_agent_name ON activities(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- =====================================================
-- Table: documents
-- Description: Shared document repository
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                    -- Document title
    content TEXT NOT NULL,                  -- Document content (Markdown, JSON, etc.)
    doc_type TEXT NOT NULL DEFAULT 'markdown', -- Document type (markdown, json, text, etc.)
    author TEXT NOT NULL,                   -- Agent who created the document
    tags TEXT,                              -- JSON array of tags
    metadata TEXT,                          -- JSON metadata for additional context
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (author) REFERENCES agents(name) ON DELETE CASCADE
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Full-text search on documents
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(title, content, content='documents', content_rowid='id');
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- =====================================================
-- Table: notifications
-- Description: @mentions and alert routing
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_agent TEXT NOT NULL,             -- Agent who should receive this notification
    type TEXT NOT NULL,                     -- Notification type (mention, subscription, alert, system)
    title TEXT NOT NULL,                    -- Notification title
    message TEXT,                           -- Notification message/content
    entity_type TEXT,                       -- Related entity type (task, message, document, etc.)
    entity_id TEXT,                         -- Related entity ID
    is_read INTEGER NOT NULL DEFAULT 0,     -- 0 = unread, 1 = read
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (target_agent) REFERENCES agents(name) ON DELETE CASCADE
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_target_agent ON notifications(target_agent, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- =====================================================
-- Table: subscriptions
-- Description: Thread and entity subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,               -- Agent who is subscribing
    target_type TEXT NOT NULL,              -- Subscription type (thread, task, document)
    target_id TEXT NOT NULL,                -- ID of the entity being subscribed to
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(agent_name, target_type, target_id),
    FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_agent ON subscriptions(agent_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_target ON subscriptions(target_type, target_id);

-- =====================================================
-- Table: heartbeat_logs
-- Description: Track agent heartbeat history
-- =====================================================
CREATE TABLE IF NOT EXISTS heartbeat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,               -- Agent name
    status TEXT NOT NULL,                   -- Heartbeat status (success, error, HEARTBEAT_OK)
    tasks_checked INTEGER DEFAULT 0,        -- Number of tasks checked
    notifications_processed INTEGER DEFAULT 0, -- Number of notifications processed
    error_message TEXT,                     -- Error message if failed
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (agent_name) REFERENCES agents(name) ON DELETE CASCADE
);

-- Indexes for heartbeat_logs
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent ON heartbeat_logs(agent_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_timestamp ON heartbeat_logs(timestamp DESC);

-- =====================================================
-- Table: daily_summaries
-- Description: Store daily standup summaries
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,              -- Date in YYYY-MM-DD format
    summary_text TEXT NOT NULL,             -- Markdown summary
    tasks_completed INTEGER DEFAULT 0,      -- Number of tasks completed
    tasks_created INTEGER DEFAULT 0,        -- Number of tasks created
    active_agents INTEGER DEFAULT 0,        -- Number of active agents
    metadata TEXT,                          -- JSON metadata (agent activity counts, etc.)
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for daily_summaries
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date DESC);

-- =====================================================
-- Insert Default Agents
-- Description: Register the 10 specialized agents
-- =====================================================
INSERT OR IGNORE INTO agents (name, session_key, role, emoji, status) VALUES
('Jarvis', 'agent:orchestrator:main', 'orchestrator', '🤖', 'idle'),
('Shuri', 'agent:engineer:main', 'engineer', '🔬', 'idle'),
('Fury', 'agent:director:main', 'director', '🎯', 'idle'),
('Vision', 'agent:analyst:main', 'analyst', '📊', 'idle'),
('Loki', 'agent:creative:main', 'creative', '🎭', 'idle'),
('Quill', 'agent:researcher:main', 'researcher', '🔍', 'idle'),
('Wanda', 'agent:optimizer:main', 'optimizer', '⚡', 'idle'),
('Pepper', 'agent:manager:main', 'manager', '💼', 'idle'),
('Friday', 'agent:assistant:main', 'assistant', '📅', 'idle'),
('Wong', 'agent:librarian:main', 'librarian', '📚', 'idle');

-- =====================================================
-- Create Triggers for Updated At
-- =====================================================
CREATE TRIGGER IF NOT EXISTS update_agents_timestamp
AFTER UPDATE ON agents
BEGIN
  UPDATE agents SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_documents_timestamp
AFTER UPDATE ON documents
BEGIN
  UPDATE documents SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
