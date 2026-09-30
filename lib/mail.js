const company = require('./company');

const SITE_URL = () => (process.env.SITE_URL || '').replace(/\/$/, '');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Template base dos emails: azul-noite + dourado
function layout({ title, body, cta }) {
  const button = cta
    ? `<p style="margin:28px 0 0"><a href="${esc(cta.url)}" style="background:#d4af6a;color:#0a1730;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:999px;display:inline-block">${esc(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#070f1f;padding:24px;font-family:Helvetica,Arial,sans-serif;color:#e9edf6">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#0f2044;border:1px solid #2a3f6b;border-radius:14px">
    <tr><td style="padding:28px 32px 0">
      <div style="font-size:20px;letter-spacing:1px;color:#e6c887"><strong>COSMIC</strong><span style="font-weight:300">LOUNGE</span></div>
      <div style="height:1px;background:linear-gradient(90deg,#d4af6a,transparent);margin-top:14px"></div>
    </td></tr>
    <tr><td style="padding:24px 32px 32px;line-height:1.6;font-size:15px">
      <h1 style="font-size:22px;margin:0 0 14px;color:#f1dba5;font-weight:600">${esc(title)}</h1>
      ${body}
      ${button}
    </td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid #2a3f6b;font-size:12px;color:#9aa7c2">
      ${esc(company.name)} · ${esc(company.address)}<br>${esc(company.phone)} · ${esc(company.email)}
    </td></tr>
  </table></body></html>`;
}

async function sendMail({ to, subject, html, replyTo }) {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.log('[mail] Brevo não configurado — email não enviado:', subject, '->', to);
    return false;
  }
  try {
    const payload = {
      sender: { name: company.name, email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html
    };
    if (replyTo) payload.replyTo = { email: replyTo };
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      console.error('[mail] Brevo respondeu', r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[mail] erro:', err.message);
    return false;
  }
}

// Emails concretos ------------------------------------------------------

function welcome(user) {
  return sendMail({
    to: user.email,
    subject: 'Bem-vindo à CosmicLounge',
    html: layout({
      title: `Olá, ${user.name.split(' ')[0]}!`,
      body: '<p>A sua conta está criada. Já pode submeter o imóvel que quer vender e acompanhar o estado do pedido na sua área de cliente.</p>',
      cta: { label: 'Submeter um imóvel', url: SITE_URL() + '/vender' }
    })
  });
}

async function submissionReceived(user, sub) {
  await sendMail({
    to: user.email,
    subject: 'Recebemos o seu pedido de venda',
    html: layout({
      title: 'Pedido recebido',
      body: `<p>Recebemos o pedido para o imóvel em <strong>${esc(sub.city)}</strong> (${esc(sub.tipo)}). A nossa equipa vai analisá-lo e responde-lhe normalmente em 48 horas úteis.</p><p>Pode acompanhar tudo na sua área de cliente.</p>`,
      cta: { label: 'Ver o meu pedido', url: `${SITE_URL()}/conta/pedidos/${sub.id}` }
    })
  });
  await sendMail({
    to: company.email,
    replyTo: user.email,
    subject: `Novo pedido de venda #${sub.id} — ${sub.city}`,
    html: layout({
      title: `Novo pedido #${sub.id}`,
      body: `<p><strong>${esc(user.name)}</strong> (${esc(user.email)}${user.phone ? ', ' + esc(user.phone) : ''}) submeteu um ${esc(sub.tipo)} em ${esc(sub.city)}.</p>`,
      cta: { label: 'Abrir no painel', url: `${SITE_URL()}/admin/pedidos/${sub.id}` }
    })
  });
}

function submissionUpdated(user, sub, statusInfo, offerText) {
  const offer = offerText
    ? `<p style="font-size:18px;color:#f1dba5"><strong>Proposta: ${esc(offerText)}</strong></p>`
    : '';
  const note = sub.admin_note ? `<p style="border-left:3px solid #d4af6a;padding-left:12px;color:#c9d2e6">${esc(sub.admin_note)}</p>` : '';
  return sendMail({
    to: user.email,
    subject: `O seu pedido #${sub.id}: ${statusInfo.label}`,
    html: layout({
      title: statusInfo.label,
      body: `<p>${esc(statusInfo.text)}</p>${offer}${note}`,
      cta: { label: 'Ver o meu pedido', url: `${SITE_URL()}/conta/pedidos/${sub.id}` }
    })
  });
}

function proposalAnswer(user, sub, accepted) {
  return sendMail({
    to: company.email,
    replyTo: user.email,
    subject: `${accepted ? 'Proposta aceite' : 'Proposta recusada'} — pedido #${sub.id}`,
    html: layout({
      title: accepted ? 'O cliente aceitou a proposta' : 'O cliente recusou a proposta',
      body: `<p><strong>${esc(user.name)}</strong> (${esc(user.email)}) ${accepted ? 'aceitou' : 'recusou'} a proposta para o ${esc(sub.tipo)} em ${esc(sub.city)}.</p>`,
      cta: { label: 'Abrir pedido', url: `${SITE_URL()}/admin/pedidos/${sub.id}` }
    })
  });
}

async function inquiry(data, listing) {
  const about = listing ? ` sobre "${listing.title}"` : '';
  await sendMail({
    to: company.email,
    replyTo: data.email,
    subject: `Nova mensagem${about}`,
    html: layout({
      title: 'Nova mensagem do site',
      body: `<p><strong>${esc(data.name)}</strong><br>${esc(data.email)}${data.phone ? '<br>' + esc(data.phone) : ''}</p>${listing ? `<p>Imóvel: ${esc(listing.title)}</p>` : ''}<p style="white-space:pre-wrap">${esc(data.message)}</p>`,
      cta: { label: 'Abrir mensagens', url: SITE_URL() + '/admin/mensagens' }
    })
  });
  await sendMail({
    to: data.email,
    subject: 'Recebemos a sua mensagem',
    html: layout({
      title: `Obrigado, ${data.name.split(' ')[0]}`,
      body: `<p>Recebemos a sua mensagem${esc(about)} e respondemos o mais depressa possível.</p>`
    })
  });
}

module.exports = { sendMail, welcome, submissionReceived, submissionUpdated, proposalAnswer, inquiry };
