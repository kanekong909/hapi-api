const router = require('express').Router();
const https = require('https');

let cache = { valor: 4150, fecha: null };

router.get('/', (req, res) => {
  // Usar cache si tiene menos de 1 hora
  if (cache.fecha && (Date.now() - cache.fecha) < 3600000) {
    return res.json({ trm: cache.valor, fuente: 'cache' });
  }

  const url = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC';
  https.get(url, (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.length && json[0].valor) {
          cache = { valor: parseFloat(json[0].valor), fecha: Date.now() };
        }
      } catch {}
      res.json({ trm: cache.valor });
    });
  }).on('error', () => {
    res.json({ trm: cache.valor });
  });
});

module.exports = router;