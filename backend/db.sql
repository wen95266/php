CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  points INT DEFAULT 1000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'waiting',
  started_at DATETIME,
  ended_at DATETIME
);

CREATE TABLE IF NOT EXISTS room_users (
  room_id INT,
  user_id INT,
  cards TEXT,
  position INT,
  is_trustee TINYINT DEFAULT 0,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS points_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user INT,
  to_user INT,
  points INT,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
