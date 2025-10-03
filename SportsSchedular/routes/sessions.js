const express = require('express');
const Sport = require('../models/Sport');
const Session = require('../models/Session');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/signin');
  next();
}

function canManageSession(user, session) {
  return user.role === 'admin' || session.createdBy.toString() === user.id;
}

router.get('/', requireAuth, async (req, res) => {
  const now = new Date();
  const upcoming = await Session.find({ startTime: { $gte: now }, status: 'scheduled', createdBy: { $ne: req.session.user.id } })
    .populate('sport', 'name')
    .populate('createdBy', 'name')
    .sort({ startTime: 1 })
    .lean();

  const myCreated = await Session.find({ createdBy: req.session.user.id })
    .populate('sport', 'name')
    .sort({ startTime: -1 })
    .lean();

  const myJoined = await Session.find({ 'participants.user': req.session.user.id })
    .populate('sport', 'name')
    .sort({ startTime: -1 })
    .lean();

  res.render('sessions/index', { upcoming, myCreated, myJoined });
});

router.get('/new', requireAuth, async (req, res) => {
  const sports = await Sport.find().sort({ name: 1 }).lean();
  res.render('sessions/new', { sports });
});

router.post('/', requireAuth, async (req, res) => {
  const { sport_id, team_a, team_b, looking_for, start_time, venue } = req.body;
  if (!sport_id || !start_time || !venue) {
    req.flash('error', 'Sport, time and venue are required');
    return res.redirect('/sessions/new');
  }
  await Session.create({
    sport: sport_id,
    createdBy: req.session.user.id,
    teamA: team_a || '',
    teamB: team_b || '',
    lookingFor: parseInt(looking_for || 0, 10),
    startTime: new Date(start_time),
    venue,
  });
  req.flash('success', 'Session created');
  res.redirect('/sessions');
});

router.get('/:id', requireAuth, async (req, res) => {
  const sess = await Session.findById(req.params.id)
    .populate('sport', 'name')
    .populate('createdBy', 'name')
    .populate('participants.user', 'name email')
    .lean();
  if (!sess) {
    req.flash('error', 'Session not found');
    return res.redirect('/sessions');
  }
  const participants = (sess.participants || []).map(p => ({ id: p.user._id.toString(), name: p.user.name, email: p.user.email }));
  const joined = participants.some(p => p.id === req.session.user.id);
  res.render('sessions/show', { sess: {
    id: sess._id.toString(),
    sport_name: sess.sport.name,
    creator_name: sess.createdBy.name,
    team_a: sess.teamA,
    team_b: sess.teamB,
    looking_for: sess.lookingFor,
    start_time: sess.startTime,
    venue: sess.venue,
    status: sess.status,
    cancel_reason: sess.cancelReason,
  }, participants, joined, canManage: canManageSession(req.session.user, sess) });
});

router.post('/:id/join', requireAuth, async (req, res) => {
  const sess = await Session.findById(req.params.id);
  if (!sess) {
    req.flash('error', 'Session not found');
    return res.redirect('/sessions');
  }
  if (sess.startTime < new Date()) {
    req.flash('error', 'Cannot join a past session');
    return res.redirect(`/sessions/${sess.id}`);
  }
  const already = sess.participants?.some(p => p.user.toString() === req.session.user.id);
  if (already) {
    req.flash('error', 'Already joined');
    return res.redirect(`/sessions/${sess.id}`);
  }
  sess.participants = sess.participants || [];
  sess.participants.push({ user: req.session.user.id });
  await sess.save();
  req.flash('success', 'Joined session');
  res.redirect(`/sessions/${sess.id}`);
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { reason } = req.body;
  const sess = await Session.findById(req.params.id);
  if (!sess) {
    req.flash('error', 'Session not found');
    return res.redirect('/sessions');
  }
  if (!canManageSession(req.session.user, sess)) {
    req.flash('error', 'Not authorized to cancel this session');
    return res.redirect(`/sessions/${sess.id}`);
  }
  sess.status = 'cancelled';
  sess.cancelReason = reason || null;
  await sess.save();
  req.flash('success', 'Session cancelled');
  res.redirect(`/sessions/${sess.id}`);
});

module.exports = router;
