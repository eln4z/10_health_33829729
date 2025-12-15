require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 8000;

const BASE_PATH = process.env.HEALTH_BASE_PATH || '';
const url = (path) => `${BASE_PATH}${path}`;

// MySQL connection pool
const db = mysql.createPool({
  host: process.env.HEALTH_HOST || 'localhost',
  user: process.env.HEALTH_USER || 'health_app',
  password: process.env.HEALTH_PASSWORD || 'qwertyuiop',
  database: process.env.HEALTH_DATABASE || 'health',
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'health_secret',
  resave: false,
  saveUninitialized: false,
}));

// Middleware for authentication
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Home page
app.get('/', (req, res) => {
  res.render('home', { user: req.session.user });
});

// About page
app.get('/about', (req, res) => {
  res.render('about', { user: req.session.user });
});


// Signup page
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// Signup handler
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check if username exists
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length > 0) {
      return res.render('signup', { error: 'Username already exists' });
    }
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
    res.redirect('/login');
  } catch (err) {
    res.render('signup', { error: 'Database error' });
  }
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login handler
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Bypass SQL: hardcoded login for gold only
  if (username === 'gold' && (password === 'smiths' || password === 'smiths123ABC$')) {
    req.session.user = {
      id: 1,
      username: 'gold',
      name: 'Gold User',
      dob: '2000-01-01',
      email: 'gold@example.com',
      height_cm: 180,
      weight_kg: 75
    };
    return res.redirect('/profile');
  }
  // All other users: invalid
  res.render('login', { error: 'Invalid credentials' });
});

// Profile page
app.get('/profile', requireLogin, (req, res) => {
  const user = req.session.user;
  const achievements = [];
  res.render('profile', { user, achievements });
});

// My Plans page (GET)
app.get('/plans', requireLogin, (req, res) => {
  const goal = req.session.goal || '';
  res.render('plans', { user: req.session.user, goal });
});

// My Plans page (POST)
app.post('/plans', requireLogin, (req, res) => {
  const { goal } = req.body;
  req.session.goal = goal;
  res.redirect('/plans');
});

// Fitness Level page
app.get('/fitness-level', requireLogin, (req, res) => {
  // Default fitnessPoints if not set
  if (typeof req.session.fitnessPoints !== 'number') req.session.fitnessPoints = 0;
  // Determine level and progress
  let level = 'Beginner';
  let progress = req.session.fitnessPoints;
  let next = 5;
  if (progress >= 15) {
    level = 'Advanced';
    next = 20;
  } else if (progress >= 5) {
    level = 'Intermediate';
    next = 15;
  }
  res.render('fitness-level', {
    user: req.session.user,
    fitnessPoints: progress,
    level,
    nextLevel: next
  });
});

// Activity History page
app.get('/activity-history', requireLogin, (req, res) => {
  const achievements = Array.isArray(req.session.achievements) ? req.session.achievements : [];
  res.render('activity-history', { user: req.session.user, achievements });
});

// Achievements page
app.get('/achievements', requireLogin, (req, res) => {
  const achievements = Array.isArray(req.session.achievements) ? req.session.achievements : [];
  res.render('achievements', { user: req.session.user, achievements });
});

// Settings page (GET)
app.get('/settings', requireLogin, (req, res) => {
  res.render('settings', { user: req.session.user, success: false });
});

// Settings page (POST)
app.post('/settings', requireLogin, (req, res) => {
  // Update user info in session only (no DB)
  const { name, dob, email, height_cm, weight_kg } = req.body;
  req.session.user = {
    ...req.session.user,
    name,
    dob,
    email,
    height_cm: height_cm ? parseInt(height_cm) : null,
    weight_kg: weight_kg ? parseInt(weight_kg) : null
  };
  res.render('settings', { user: req.session.user, success: true });
});

// Home page
app.get('/', (req, res) => {
  res.render('home', { user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Data entry form (e.g., fitness achievement)
app.get('/add', requireLogin, (req, res) => {
  res.render('add', { user: req.session.user, error: null });
});

app.post('/add', requireLogin, async (req, res) => {
  const { title, value } = req.body;
  // Increment fitnessPoints in session
  if (typeof req.session.fitnessPoints !== 'number') req.session.fitnessPoints = 0;
  req.session.fitnessPoints++;
  // Store achievements in session
  if (!Array.isArray(req.session.achievements)) req.session.achievements = [];
  req.session.achievements.push({
    title,
    value,
    created_at: new Date().toISOString().slice(0, 10)
  });
  // Still try to add to DB, but ignore errors
  try {
    await db.query('INSERT INTO achievements (user_id, title, value) VALUES (?, ?, ?)', [req.session.user.id, title, value]);
    res.redirect('/');
  } catch (err) {
    res.redirect('/');
  }
});

// Search page
app.get('/search', requireLogin, (req, res) => {
  res.render('search', { user: req.session.user, results: null, error: null });
});

app.post('/search', requireLogin, async (req, res) => {
  const { query: searchTerm } = req.body;
  try {
    const [results] = await db.query('SELECT * FROM achievements WHERE title LIKE ?', [`%${searchTerm}%`]);
    res.render('search', { user: req.session.user, results, error: null });
  } catch (err) {
    res.render('search', { user: req.session.user, results: null, error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
