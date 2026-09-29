function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.flash = { type: 'error', text: 'Inicie sessão para continuar.' };
  const next_ = encodeURIComponent(req.originalUrl.split('#')[0]);
  res.redirect('/login?next=' + next_);
}

function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).render('error', {
    title: 'Acesso restrito',
    code: 403,
    message: 'Esta área é apenas para a equipa da CosmicLounge.'
  });
}

module.exports = { requireLogin, requireAdmin };
