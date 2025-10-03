const express = require('express');
const Sport = require('../models/Sport');
const Session = require('../models/Session');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/signin');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Admin access required');
    return res.redirect('/dashboard');
  }
  next();
}

router.get('/sports', requireAuth, requireAdmin, async (req, res) => {
  const sports = await Sport.find({ createdBy: req.session.user.id }).sort({ name: 1 }).lean();
  res.render('admin/sports', { sports });
});

router.get('/sports/new', requireAuth, requireAdmin, (req, res) => {
  res.render('admin/new_sport');
});

router.post('/sports', requireAuth, requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    req.flash('error', 'Sport name required');
    return res.redirect('/admin/sports/new');
  }
  await Sport.create({ name: name.trim(), createdBy: req.session.user.id });
  req.flash('success', 'Sport created');
  res.redirect('/admin/sports');
});

router.get('/reports', requireAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  const now = new Date();
  const defaultTo = now;
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : defaultTo;

  const total = await Session.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate } });
  const completed = await Session.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate }, status: 'completed' });
  const cancelled = await Session.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate }, status: 'cancelled' });

  const bySportAgg = await Session.aggregate([
    { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
    { $group: { _id: '$sport', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $lookup: { from: 'sports', localField: '_id', foreignField: '_id', as: 'sport' } },
    { $unwind: '$sport' },
    { $project: { sport: '$sport.name', count: 1 } },
  ]);

  const summary = { total, completed, cancelled };
  res.render('admin/reports', { summary, bySport: bySportAgg, fromDate: fromDate.toISOString(), toDate: toDate.toISOString() });
});

module.exports = router;
