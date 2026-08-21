/* =========================================================================
   Gera um unico ficheiro HTML com todo o painel la dentro (CSS, JS e tipos
   de letra), pronto a partilhar por e-mail, pen ou a publicar em qualquer
   sitio sem servidor.

       node ferramentas/gerar-ficheiro-unico.js [destino.html]

   Por omissao escreve em "painel-protagonismo.html" na raiz do projeto.
   ========================================================================= */
'use strict';

var fs = require('fs');
var path = require('path');

var raiz = path.join(__dirname, '..');
var destino = process.argv[2] || path.join(raiz, 'painel-protagonismo.html');

function ler(relativo) {
    return fs.readFileSync(path.join(raiz, relativo), 'utf8');
}

/* Tipos de letra: ficam embutidos como data: URI dentro do proprio CSS. */
function embutirTipos(css) {
    return css.replace(/url\('\.\.\/fonts\/([^']+)'\)/g, function (_, ficheiro) {
        var dados = fs.readFileSync(path.join(raiz, 'assets/fonts', ficheiro)).toString('base64');
        return "url('data:font/woff2;base64," + dados + "')";
    });
}

var html = ler('index.html');

var titulo = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Protagonismo';
var corpo = html.split('<body>')[1].split('</body>')[0];

/* Tira os <script src> e <link> do corpo, se algum la estiver. */
corpo = corpo.replace(/\s*<script src="[^"]*"><\/script>/g, '')
             .replace(/\s*<script>[\s\S]*?<\/script>\s*$/g, '');

var estilos = embutirTipos(ler('assets/css/app.css')) + '\n' + ler('assets/css/tailwind.css');

var scripts = [
    'assets/js/vendor/lucide.min.js',
    'assets/js/store.js',
    'assets/js/auth.js',
    'assets/js/ui.js',
    'assets/js/dados.js',
    'assets/js/views/visao.js',
    'assets/js/views/frentes.js',
    'assets/js/views/comissoes.js',
    'assets/js/views/funcoes.js',
    'assets/js/views/usuarios.js',
    'assets/js/views/membros.js',
    'assets/js/views/postagens.js',
    'assets/js/views/mensagens.js',
    'assets/js/views/calendario.js',
    'assets/js/views/relatorios.js',
    'assets/js/views/auditoria.js',
    'assets/js/views/portal.js',
    'assets/js/app.js'
].map(function (f) {
    return '<script>\n/* ' + f + ' */\n' + ler(f) + '\n</script>';
}).join('\n');

var saida =
    '<title>' + titulo + '</title>\n' +
    '<style>\n' + estilos + '\n</style>\n' +
    corpo + '\n' +
    scripts + '\n' +
    '<script>window.addEventListener("DOMContentLoaded", function () { App.arrancar(); });</script>\n';

fs.writeFileSync(destino, saida);
console.log('Escrito ' + destino + ' (' + Math.round(saida.length / 1024) + ' KB)');
