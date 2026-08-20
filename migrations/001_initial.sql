CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  operating_system TEXT NOT NULL DEFAULT '',
  architecture TEXT NOT NULL DEFAULT '',
  primary_ip TEXT NOT NULL UNIQUE,
  mac_address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  uptime_seconds INTEGER NOT NULL DEFAULT 0,
  latency_ms REAL NOT NULL DEFAULT 0,
  metrics_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS network_interfaces (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mac TEXT NOT NULL,
  ipv4 TEXT NOT NULL,
  ipv6 TEXT,
  subnet TEXT NOT NULL,
  gateway TEXT,
  speed_mbps INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON metrics(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_type_time ON metrics(metric_type, timestamp DESC);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK(port BETWEEN 1 AND 65535),
  protocol TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL,
  response_time_ms REAL NOT NULL DEFAULT 0,
  uptime_percent REAL NOT NULL DEFAULT 0,
  last_checked TEXT NOT NULL,
  health_check TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS containers (
  id TEXT PRIMARY KEY,
  host_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  container_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL,
  ports_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  restart_count INTEGER NOT NULL DEFAULT 0,
  cpu REAL NOT NULL DEFAULT 0,
  memory REAL NOT NULL DEFAULT 0,
  uptime_seconds INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  first_triggered TEXT NOT NULL,
  last_triggered TEXT NOT NULL,
  acknowledged_at TEXT,
  resolved_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_active_fingerprint ON alerts(fingerprint) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_alert_status_severity ON alerts(status, severity);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

CREATE TABLE IF NOT EXISTS networks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cidr TEXT NOT NULL UNIQUE,
  vlan INTEGER,
  gateway TEXT NOT NULL,
  dns_json TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  source_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  target_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  interface_name TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  latency_ms REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  manufacturer TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  purchase_date TEXT,
  purchase_price REAL,
  warranty_expiration TEXT,
  status TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  assigned_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  linked_device_ids_json TEXT NOT NULL DEFAULT '[]',
  linked_service_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS application_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
