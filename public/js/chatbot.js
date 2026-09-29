/* Cosmo — assistente da CosmicLounge (local, por palavras-chave; sem APIs externas) */
(function () {
  'use strict';

  var root = document.getElementById('chatRoot');
  if (!root) return;
  var fab = document.getElementById('chatFab');
  var box = document.getElementById('chat');
  var closeBtn = document.getElementById('chatClose');
  var body = document.getElementById('chatBody');
  var quick = document.getElementById('chatQuick');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var name = root.getAttribute('data-name') || '';
  var started = false;
  var lastTopic = null;
  var fallbackCount = 0;

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var CHIPS = ['Como vender a minha casa', 'Quanto tempo demora?', 'Há comissões?', 'Ver imóveis à venda', 'Falar com a equipa'];

  // Base de conhecimento: cada tópico tem palavras-chave (com peso) e resposta
  var KB = [
    {
      id: 'saudacao', kw: { ola: 3, oi: 3, bom: 1, dia: 1, boa: 1, tarde: 1, noite: 1, hey: 2, hello: 2, ei: 2 },
      a: function () { return ['Olá' + (name ? ', ' + name : '') + '! Sou o Cosmo, o assistente da CosmicLounge. Posso explicar como vendemos e compramos casas, prazos, documentos e ajudá-lo a contactar a equipa. Em que posso ajudar?']; }
    },
    {
      id: 'como', kw: { vender: 3, venda: 2, vendo: 3, submeter: 3, comecar: 3, como: 1, funciona: 3, processo: 3, passos: 3, pedido: 1, casa: 1, imovel: 1, apartamento: 1 },
      a: ['É simples e faz-se online em quatro passos:', '1. Crie uma conta e submeta o imóvel com os dados e fotografias.\n2. Avaliamos e enviamos uma proposta de compra em 48 horas úteis.\n3. Se aceitar, tratamos da documentação e do pagamento na escritura.\n4. Remodelamos o imóvel e colocamo-lo à venda no site.', 'Quer começar? <a href="/vender">Vender a minha casa</a>.']
    },
    {
      id: 'prazo', kw: { tempo: 3, demora: 3, prazo: 3, quando: 2, rapido: 2, rapidez: 2, dias: 2, horas: 2, resposta: 2, responder: 2, responde: 2, escritura: 1 },
      a: ['Respondemos normalmente em <strong>48 horas úteis</strong> depois de recebermos o pedido com fotografias. A escritura é combinada consigo, em geral nas semanas seguintes à aceitação da proposta, e o pagamento é feito no próprio dia.']
    },
    {
      id: 'comissao', kw: { comissao: 4, comissoes: 4, taxa: 3, taxas: 3, custo: 3, custos: 3, pagar: 3, pago: 2, cobram: 3, gratis: 3, gratuito: 3, preco: 1, quanto: 1, honorarios: 3 },
      a: ['Não paga comissões de mediação: como somos nós a comprar, não há intermediários. Pedir a proposta é grátis e sem compromisso. Os custos normais de uma escritura (por exemplo, o registo) são combinados na proposta, para não ter surpresas.']
    },
    {
      id: 'avaliacao', kw: { avaliar: 3, avaliacao: 3, valor: 3, vale: 3, proposta: 3, oferta: 3, orcamento: 2, quanto: 1, preco: 2, recusar: 2, negociar: 3, negociacao: 3 },
      a: ['A proposta tem em conta a localização, a área, o estado do imóvel e o custo estimado da remodelação. Se não concordar com o valor, pode recusar sem compromisso ou pedir que reavaliemos. Para uma proposta mais precisa, junte várias fotografias e descreva as obras necessárias.']
    },
    {
      id: 'tipos', kw: { tipo: 2, tipos: 2, compram: 3, aceitam: 3, moradia: 3, apartamento: 3, terreno: 3, loja: 3, obras: 3, degradado: 3, ruina: 3, heranca: 2, arrendado: 3, hipoteca: 3, penhora: 2, tipologia: 2 },
      a: ['Compramos apartamentos, moradias, lojas e terrenos, sobretudo imóveis que precisam de obras. Também analisamos casos com hipoteca, herança ou arrendados: conte-nos os detalhes no pedido ou fale com a equipa e vemos o que é possível.']
    },
    {
      id: 'zonas', kw: { zona: 3, zonas: 3, onde: 2, localidade: 3, cidade: 3, lisboa: 3, porto: 3, cascais: 3, oeiras: 3, almada: 3, regiao: 3, norte: 2, sul: 2, algarve: 3, atuam: 3, operam: 3 },
      a: ['Trabalhamos sobretudo na Grande Lisboa e no Porto, e analisamos pedidos de outras zonas caso a caso. Indique a localidade no formulário e dizemos-lhe se conseguimos avançar.']
    },
    {
      id: 'docs', kw: { documentos: 4, documento: 4, papeis: 3, caderneta: 4, certidao: 4, licenca: 3, habitacao: 3, energetico: 3, certificado: 3, necessito: 2, preciso: 2, necessarios: 3 },
      a: ['Para a escritura costumam ser precisos: caderneta predial, certidão permanente do registo predial, licença de utilização, certificado energético e documentos de identificação. Não precisa de os ter para pedir a proposta: ajudamos a reunir tudo depois.']
    },
    {
      id: 'comprar', kw: { comprar: 3, compro: 3, comprador: 3, interessado: 3, interesse: 2, visita: 3, visitar: 3, agendar: 2, disponiveis: 2, venda: 1, imoveis: 2, casas: 2, catalogo: 2, remodelados: 3, remodelada: 3 },
      a: ['Os imóveis que vendemos são os que a CosmicLounge comprou e remodelou. Veja os disponíveis em <a href="/imoveis">Imóveis</a> e use o botão «Pedir visita» na página de cada um. Entre particulares não fazemos intermediação.']
    },
    {
      id: 'remodelacao', kw: { remodelacao: 4, remodelar: 4, remodelam: 4, obras: 2, renovar: 3, renovacao: 3, acabamentos: 3, qualidade: 2, garantia: 3 },
      a: ['Depois de comprar, a nossa equipa faz a remodelação completa: cozinha, casas de banho, pavimentos, elétrica, canalização e pintura. Só depois o imóvel é colocado à venda, com acabamentos de qualidade.']
    },
    {
      id: 'conta', kw: { conta: 3, login: 3, entrar: 3, registo: 3, registar: 3, criar: 2, senha: 3, password: 3, palavra: 2, passe: 2, acesso: 2, esqueci: 3 },
      a: ['Pode <a href="/registo">criar conta</a> em menos de um minuto ou <a href="/login">entrar</a>. Na sua conta vê o estado dos pedidos e as propostas. Se se esqueceu da palavra-passe, contacte a equipa e ajudamos a recuperar o acesso.']
    },
    {
      id: 'estado', kw: { estado: 3, acompanhar: 3, seguir: 2, andamento: 3, novidades: 2, pedido: 2, aprovado: 2, ja: 1, sabem: 1, algo: 1 },
      a: ['Pode acompanhar cada pedido na sua <a href="/conta">conta</a>: vê o estado atual, a proposta (quando existir) e as mensagens da equipa. Também lhe enviamos um email sempre que houver novidades.']
    },
    {
      id: 'contacto', kw: { contacto: 4, contactar: 4, contactos: 4, telefone: 4, telemovel: 3, ligar: 3, email: 3, morada: 3, endereco: 3, horario: 3, falar: 3, humano: 4, pessoa: 3, equipa: 3, atendimento: 3, escritorio: 3 },
      a: function () { return ['Pode falar com a equipa por aqui:', '<strong>Telefone:</strong> ' + esc(window.__co && window.__co.phone || '') + '<br><strong>Email:</strong> ' + esc(window.__co && window.__co.email || '') + '<br><strong>Horário:</strong> ' + esc(window.__co && window.__co.hours || ''), 'Ou envie mensagem em <a href="/contacto">Contacto</a>.']; }
    },
    {
      id: 'quem', kw: { quem: 3, empresa: 3, cosmiclounge: 3, cosmic: 3, sobre: 2, nos: 1, sois: 3, historia: 3, confianca: 3, serio: 3, segura: 3, seguro: 3 },
      a: ['A CosmicLounge é uma empresa de compra, remodelação e venda de imóveis. Compramos diretamente, com proposta clara e prazos curtos. Conheça a nossa história em <a href="/sobre">Sobre nós</a>.']
    },
    {
      id: 'obrigado', kw: { obrigado: 4, obrigada: 4, obg: 4, valeu: 3, agradeco: 3, perfeito: 2, otimo: 2, fixe: 2, excelente: 2 },
      a: ['Com todo o gosto! Se precisar de mais alguma coisa, estou por aqui.']
    },
    {
      id: 'adeus', kw: { adeus: 4, tchau: 4, xau: 4, ate: 1, logo: 1, bye: 3 },
      a: ['Até breve! Quando quiser vender ou comprar uma casa, a CosmicLounge está cá.']
    }
  ];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function answer(text) {
    var words = norm(text).split(' ').filter(Boolean);
    if (!words.length) return null;
    var best = null, bestScore = 0;
    KB.forEach(function (t) {
      var score = 0;
      words.forEach(function (w) { if (t.kw[w]) score += t.kw[w]; });
      // pequena preferência para o tópico da conversa anterior em perguntas curtas
      if (score > 0 && lastTopic === t.id && words.length <= 3) score += .5;
      if (score > bestScore) { bestScore = score; best = t; }
    });
    if (!best || bestScore < 2) return null;
    lastTopic = best.id;
    return typeof best.a === 'function' ? best.a() : best.a;
  }

  function add(html, who) {
    var d = document.createElement('div');
    d.className = 'bubble ' + who;
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  function botSay(parts, cb) {
    var i = 0;
    (function next() {
      if (i >= parts.length) { if (cb) cb(); return; }
      var t = document.createElement('div');
      t.className = 'bubble bot typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      body.appendChild(t); body.scrollTop = body.scrollHeight;
      var text = parts[i++];
      setTimeout(function () {
        t.remove();
        add(String(text).split('\n').map(function (l) { return '<p>' + l + '</p>'; }).join(''), 'bot');
        next();
      }, 450 + Math.min(text.length * 6, 700));
    })();
  }

  function renderChips(list) {
    quick.innerHTML = '';
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); });
      quick.appendChild(b);
    });
  }

  function ask(text) {
    text = String(text).trim();
    if (!text) return;
    add(esc(text), 'me');
    input.value = '';
    quick.innerHTML = '';
    var n = norm(text);
    var res;
    if (/(ver|mostrar|quero ver).*imoveis|imoveis.*venda/.test(n)) {
      lastTopic = 'comprar';
      res = ['Aqui estão as casas que já remodelámos: <a href="/imoveis">ver imóveis à venda</a>. Pode filtrar por localidade, tipologia e preço.'];
    } else {
      res = answer(text);
    }
    if (!res) {
      fallbackCount++;
      res = fallbackCount >= 2
        ? ['Não consegui responder a isso. Para não o deixar sem resposta, o melhor é falar com a equipa em <a href="/contacto">Contacto</a>: responde em 48 horas úteis.']
        : ['Não tenho a certeza de ter percebido. Posso ajudar com: como vender, prazos, comissões, documentos, zonas e imóveis à venda. Pode reformular ou escolher uma das opções abaixo.'];
    } else { fallbackCount = 0; }
    botSay(res, function () { renderChips(CHIPS); });
  }

  function open() {
    box.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      botSay(['Olá' + (name ? ', ' + esc(name) : '') + '! Sou o <strong>Cosmo</strong>, o assistente da CosmicLounge.', 'Pergunte-me o que quiser sobre vender a sua casa ou sobre os nossos imóveis.'], function () { renderChips(CHIPS); });
    }
    setTimeout(function () { input.focus(); }, 200);
  }
  function close() { box.classList.remove('is-open'); fab.setAttribute('aria-expanded', 'false'); }

  fab.addEventListener('click', function () { box.classList.contains('is-open') ? close() : open(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
})();
