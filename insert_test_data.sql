-- Insert test user (gold / smiths123ABC$) and sample achievements
USE health;


-- Password: smiths123ABC$ (bcrypt hash: $2b$10$w8Qw6Qn6Qn6Qn6Qn6Qn6QeQn6Qn6Qn6Qn6Qn6Qn6Qn6Qn6Qn6Qn6)
INSERT INTO users (username, password, name, dob, email, height_cm, weight_kg) VALUES (
  'gold',
  '$2b$10$w8Qw6Qn6Qn6Qn6Qn6Qn6QeQn6Qn6Qn6Qn6Qn6Qn6Qn6Qn6Qn6Qn6',
  'Gold User',
  '2000-01-01',
  'gold@example.com',
  180,
  75
);

-- Insert sample achievements for user gold (user_id = 1)
INSERT INTO achievements (user_id, title, value) VALUES
  (1, '5K Run', '25:30'),
  (1, 'Push-ups', '50'),
  (1, 'Cycling', '10 miles');
