/* Configuracao usada para gerar assets/css/tailwind.css.
   O Tailwind trata so da grelha e dos espacamentos; as cores, tipos e
   componentes vivem em assets/css/app.css. */
module.exports = {
    content: ['./index.html', './assets/js/**/*.js'],
    theme: { extend: {} }
};
