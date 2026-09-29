const euro = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const STATUS = {
  recebido: { label: 'Recebido', tone: 'blue', text: 'Recebemos o seu pedido e vamos analisá-lo.' },
  em_analise: { label: 'Em análise', tone: 'gold', text: 'A nossa equipa está a avaliar o imóvel.' },
  proposta_enviada: { label: 'Proposta enviada', tone: 'gold', text: 'Enviámos-lhe uma proposta de compra. Responda-nos para avançarmos.' },
  proposta_aceite: { label: 'Proposta aceite', tone: 'green', text: 'Proposta aceite. Vamos tratar da documentação e da escritura.' },
  comprado: { label: 'Comprado', tone: 'green', text: 'Escritura concluída. Obrigado pela confiança!' },
  em_remodelacao: { label: 'Em remodelação', tone: 'blue', text: 'O imóvel está a ser remodelado pela nossa equipa.' },
  a_venda: { label: 'À venda', tone: 'green', text: 'O imóvel já está à venda no nosso site.' },
  recusado: { label: 'Não avançámos', tone: 'red', text: 'Neste momento não conseguimos avançar com este imóvel.' }
};

const STATUS_ORDER = ['recebido', 'em_analise', 'proposta_enviada', 'proposta_aceite', 'comprado', 'em_remodelacao', 'a_venda'];

const TIPOS = ['Apartamento', 'Moradia', 'Loja', 'Terreno'];
const CONDICOES = ['Para remodelar', 'Usado, bom estado', 'Usado, precisa de obras', 'Em construção'];

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function clean(v, max = 500) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function toInt(v, fallback = null) {
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeNext(v) {
  return typeof v === 'string' && /^\/(?!\/)[\w\-/?=&.%]*$/.test(v) ? v : null;
}

// Limitador simples em memória (por IP + chave)
const hits = new Map();
function rateLimit(key, max, windowMs) {
  return (req, res, next) => {
    const id = key + ':' + req.ip;
    const now = Date.now();
    const arr = (hits.get(id) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      return res.status(429).render('error', {
        title: 'Demasiados pedidos',
        code: 429,
        message: 'Fez demasiados pedidos seguidos. Aguarde uns minutos e tente novamente.'
      });
    }
    arr.push(now);
    hits.set(id, arr);
    next();
  };
}

module.exports = { euro, STATUS, STATUS_ORDER, TIPOS, CONDICOES, isEmail, clean, toInt, safeNext, rateLimit };
