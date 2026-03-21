'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express      = require('express');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const passport     = require('passport');
const path         = require('path');
const config       = require('../../config');
const logger       = require('../../utils/logger');

// ── Passport Discord strategy ─────────────────────────────────────────────────
const { Strategy: DiscordStrategy } = require('passport-discord');

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new DiscordStrategy({
  clientID:     config.clientId,
  clientSecret: config.clientSecret,
  callbackURL:  `${config.baseUrl}/auth/callback`,
  scope:        ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;
  return done(null, profile);
}));

// ── Create Express app ────────────────────────────────────────────────────────
const app = express();

// Trust Railway's reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret:            config.sessionSecret,
  resave:            false,
  saveUninitialized: false,
  store:             MongoStore.create({
    mongoUrl:   config.mongoUri,
    ttl:        7 * 24 * 60 * 60, // 7 days
    autoRemove: 'native',
  }),
  cookie: {
    secure:   config.baseUrl.startsWith('https'),
    httpOnly: true,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Inject globals into all views ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user    = req.user || null;
  res.locals.botName = config.botName;
  res.locals.baseUrl = config.baseUrl;
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/',            require('../routes/index'));
app.use('/auth',        require('../routes/auth'));
app.use('/guilds',      require('../routes/guilds'));
app.use('/guild',       require('../routes/overview'));
app.use('/guild',       require('../routes/moderation'));
app.use('/guild',       require('../routes/tickets'));
app.use('/guild',       require('../routes/logging'));
app.use('/guild',       require('../routes/social'));
app.use('/guild',       require('../routes/giveaways'));
app.use('/guild',       require('../routes/automod'));
app.use('/guild',       require('../routes/welcome'));
app.use('/guild',       require('../routes/roles'));
app.use('/guild',       require('../routes/levels'));
app.use('/guild',       require('../routes/economy'));
app.use('/guild',       require('../routes/suggestions'));
app.use('/guild',       require('../routes/starboard'));
app.use('/guild',       require('../routes/counting'));
app.use('/guild',       require('../routes/antinuke'));
app.use('/guild',       require('../routes/backup'));
app.use('/guild',       require('../routes/settings'));
app.use('/owner',       require('../routes/owner'));
app.use('/api',         require('../routes/api'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: '404 Not Found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`[Dashboard] ${err.message}`);
  res.status(500).render('error', { title: 'Error', message: err.message });
});

// ── Start function ────────────────────────────────────────────────────────────
function start(client) {
  app.locals.client = client;

  app.listen(config.port, () => {
    logger.info(`[Dashboard] Listening on ${config.baseUrl}`);
  });
}

module.exports = { start, app };
