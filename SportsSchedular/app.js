require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const csrf = require('csurf');

const { connectDb, MONGO_URI } = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const sessionRoutes = require('./routes/sessions');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

app.use(
  session({
    secret: 'supersecret-session-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 60 * 60 * 24 }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);
app.use(flash());

// CSRF protection
const csrfProtection = csrf();
app.use(csrfProtection);

// Globals for views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.csrfToken = req.csrfToken();
  res.locals.flash = {
    error: req.flash('error'),
    success: req.flash('success'),
  };
  next();
});

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('index');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/signin');
  res.render('dashboard');
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/sessions', sessionRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Invalid CSRF token. Please try again.');
    return res.redirect('back');
  }
  res.status(500).render('500', { error: err });
});

const PORT = process.env.PORT || 3000;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
