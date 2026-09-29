const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../lib/db');
const { clean, isEmail, safeNext, rateLimit } = require('../lib/util');
const mail = require('../lib/mail');

const router = express.Router();

function sessionUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/conta');
  res.render('login', { title: 'Entrar', page: 'login', next: safeNext(req.query.next) || '', form: {} });
});

router.post('/login', rateLimit('login', 12, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const email = clean(req.body.email, 150).toLowerCase();
    const password = String(req.body.password || '');
    const nextUrl = safeNext(req.body.next) || '';
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      return res.status(401).render('login', {
        title: 'Entrar',
        page: 'login',
        next: nextUrl,
        form: { email },
        flash: { type: 'error', text: 'Email ou palavra-passe incorretos.' }
      });
    }
    // Promoção automática do admin via ADMIN_EMAIL
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (adminEmail && user.email === adminEmail && user.role !== 'admin') {
      const r = await pool.query(`UPDATE users SET role='admin' WHERE id=$1 RETURNING *`, [user.id]);
      user = r.rows[0];
    }
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = sessionUser(user);
      res.redirect(nextUrl || (user.role === 'admin' ? '/admin' : '/conta'));
    });
  } catch (err) {
    next(err);
  }
});

router.get('/registo', (req, res) => {
  if (req.session.user) return res.redirect('/conta');
  res.render('register', { title: 'Criar conta', page: 'login', next: safeNext(req.query.next) || '', form: {} });
});

router.post('/registo', rateLimit('register', 8, 60 * 60 * 1000), async (req, res, next) => {
  try {
    const form = {
      name: clean(req.body.name, 100),
      email: clean(req.body.email, 150).toLowerCase(),
      phone: clean(req.body.phone, 30)
    };
    const password = String(req.body.password || '');
    const nextUrl = safeNext(req.body.next) || '';
    const fail = (text, status = 400) =>
      res.status(status).render('register', { title: 'Criar conta', page: 'login', next: nextUrl, form, flash: { type: 'error', text } });

    if (form.name.length < 2) return fail('Indique o seu nome.');
    if (!isEmail(form.email)) return fail('Indique um email válido.');
    if (password.length < 8) return fail('A palavra-passe deve ter pelo menos 8 caracteres.');
    if (password !== String(req.body.password2 || '')) return fail('As palavras-passe não coincidem.');

    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [form.email]);
    if (exists.rows.length) return fail('Já existe uma conta com este email. Tente entrar.', 409);

    const hash = await bcrypt.hash(password, 10);
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const role = adminEmail && form.email === adminEmail ? 'admin' : 'user';
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [form.name, form.email, form.phone || null, hash, role]
    );
    const user = rows[0];
    mail.welcome(user);
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = sessionUser(user);
      res.redirect(nextUrl || (role === 'admin' ? '/admin' : '/conta'));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
