CREATE TABLE IF NOT EXISTS metric_rollups (
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  hour TEXT NOT NULL,
  value_min REAL NOT NULL,
  value_max REAL NOT NULL,
  value_avg REAL NOT NULL,
  samples INTEGER NOT NULL,
  PRIMARY KEY (device_id, metric_type, hour)
);

CREATE INDEX IF NOT EXISTS idx_metric_rollups_device_time ON metric_rollups(device_id, hour DESC);
