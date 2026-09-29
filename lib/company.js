// Dados da empresa (fictícios por agora — trocar quando houver os reais)
module.exports = {
  name: 'CosmicLounge',
  tagline: 'Compra e venda de imóveis',
  phone: '+351 210 000 000',
  phoneHref: '+351210000000',
  email: process.env.COMPANY_EMAIL || 'geral@cosmiclounge.pt',
  address: 'Avenida da Liberdade 100, 1250-146 Lisboa',
  hours: 'Segunda a sexta, das 9h às 18h',
  social: {
    instagram: '#',
    facebook: '#',
    linkedin: '#'
  }
};
