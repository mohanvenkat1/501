const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

function redirectIfSignedIn(req, res, next) {
  if (req.session.user) return res.redirect('/dashboard');
  next();
}

router.get('/signup', redirectIfSignedIn, (req, res) => {
  res.render('auth/signup');
});

router.post(
  '/signup',
  redirectIfSignedIn,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin','player']).withMessage('Role is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg));
      return res.redirect('/signup');
    }
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      req.flash('error', 'Email already in use');
      return res.redirect('/signup');
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await User.create({ name, email, passwordHash, role });
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    req.flash('success', 'Signed up successfully');
    res.redirect('/dashboard');
  }
);

router.get('/signin', redirectIfSignedIn, (req, res) => {
  res.render('auth/signin');
});

router.post(
  '/signin',
  redirectIfSignedIn,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').isIn(['admin','player']).withMessage('Role is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg));
      return res.redirect('/signin');
    }
    const { email, password, role } = req.body;
    const user = await User.findOne({ email, role });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/signin');
    }
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    req.flash('success', 'Signed in');
    res.redirect('/dashboard');
  }
);

router.post('/signout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
