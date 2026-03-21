'use strict';

const express = require('express');
const router  = express.Router();

// GET / — redirect to guilds if logged in, else show login
router.get('/', (req, res) => {
  if (req.user) return res.redirect('/guilds');
  res.render('login', { title: 'Login' });
});

module.exports = router;
