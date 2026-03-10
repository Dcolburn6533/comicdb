CREATE TABLE IF NOT EXISTS comics (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  issue_number INT NOT NULL,
  year_published INT NOT NULL,
  comic_condition VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cbdb_url TEXT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_comics_name (name),
  INDEX idx_comics_company (company),
  INDEX idx_comics_issue (issue_number),
  INDEX idx_comics_year (year_published)
);
