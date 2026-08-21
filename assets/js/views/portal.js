/* ===================== Portal publico do Protagonismo ================== */
(function (global) {
    'use strict';

    var filtro = { frenteId: '' };

    function abrirPostagem(post) {
        UI.modal({
            titulo: post.titulo,
            subtitulo: Dados.nomeFrente(post.frenteId) + ' · ' + Dados.nomeComissao(post.comissaoId) + ' · ' + UI.dataLonga(post.publicadoEm || post.criadoEm),
            largura: 'max-w-2xl',
            corpo:
                '<p style="font-weight:500;margin-bottom:.9rem">' + UI.esc(post.resumo) + '</p>' +
                '<div class="corpo-texto">' + UI.nl2br(post.conteudo) + '</div>' +
                ((post.tags || []).length
                    ? '<div class="flex flex-wrap gap-2 mt-5">' + post.tags.map(function (t) { return UI.pastilha('#' + t, 'slate'); }).join('') + '</div>'
                    : ''),
            rodape: '<button type="button" data-fechar="1" class="btn btn--principal">Fechar</button>'
        });
    }

    function artigo(p, destaque) {
        return '<button class="artigo ' + (destaque ? 'artigo--destaque ' : '') + UI.tom(Dados.corFrente(p.frenteId)) + '" data-post="' + p.id + '">' +
            '<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">' +
                (destaque ? UI.etiqueta('Destaque', 'amber', { forte: true }) : '') +
                UI.etiqueta(Dados.nomeFrente(p.frenteId), Dados.corFrente(p.frenteId)) +
            '</div>' +
            '<h3 class="artigo__titulo" style="margin-top:.5rem">' + UI.esc(p.titulo) + '</h3>' +
            '<p class="texto-medio' + (destaque ? '' : ' line-clamp-3') + '" style="margin-top:.4rem">' + UI.esc(p.resumo) + '</p>' +
            '<p class="nota" style="margin-top:.8rem">' + UI.esc(Dados.nomeComissao(p.comissaoId)) + ' · ' + UI.dataLonga(p.publicadoEm || p.criadoEm) + '</p>' +
        '</button>';
    }

    global.Views = global.Views || {};
    global.Views.portal = {
        titulo: 'Portal publico',
        render: function () {
            var frentes = Store.listar('frentes').filter(function (f) { return f.ativo; });
            var todas = Dados.postagensPublicas();
            var lista = todas.filter(function (p) { return !filtro.frenteId || p.frenteId === filtro.frenteId; });
            var destaques = lista.filter(function (p) { return p.destaque; });
            var normais = lista.filter(function (p) { return !p.destaque; });
            var agenda = Store.listar('eventos')
                .filter(function (e) { return e.publico && e.data >= UI.dataHoje() && (!filtro.frenteId || e.frenteId === filtro.frenteId); })
                .sort(function (a, b) { return a.data > b.data ? 1 : -1; })
                .slice(0, 6);

            var html = '';

            if (Auth.ehPublico()) {
                html += '<header class="mb-8">' +
                    '<p class="sobrancelha">Mural publico</p>' +
                    '<h2 class="manchete" style="margin-top:.5rem">Protagonismo Estudantil</h2>' +
                    '<p class="subtitulo">Acompanha o que as comissoes do SIV, do Cine Club e das outras frentes estao a preparar.</p>' +
                '</header>';
            } else {
                html += UI.cabecalho('Pre-visualizacao', 'Portal publico',
                    'E isto que a comunidade escolar ve — apenas as postagens liberadas.', '');
            }

            html += '<div class="flex flex-wrap gap-1.5 mb-6">' +
                '<button class="filtro' + (filtro.frenteId === '' ? ' filtro--ativo' : '') + '" data-frente="">Tudo</button>' +
                frentes.map(function (f) {
                    return '<button class="filtro' + (filtro.frenteId === f.id ? ' filtro--ativo' : '') + '" data-frente="' + f.id + '">' + UI.esc(f.nome) + '</button>';
                }).join('') +
            '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

            html += '<div class="lg:col-span-2 space-y-4">';
            if (!lista.length) {
                html += UI.painel('', UI.vazio('Ainda nao ha publicacoes liberadas nesta frente. Volta em breve!', 'newspaper'));
            } else {
                destaques.slice(0, 2).forEach(function (p) { html += artigo(p, true); });
                normais.forEach(function (p) { html += artigo(p, false); });
            }
            html += '</div>';

            html += '<div class="space-y-4">' +
                UI.painel('Agenda aberta a escola', agenda.length
                    ? '<ul class="lista">' + agenda.map(function (e) {
                          return '<li class="flex gap-3">' + UI.dataBloco(e.data) +
                              '<div class="min-w-0"><p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(e.titulo) + '</p>' +
                              '<p class="nota truncate">' + UI.esc(e.hora || '') + (e.local ? ' · ' + UI.esc(e.local) : '') + '</p>' +
                              '<p class="nota">' + UI.esc(Dados.nomeFrente(e.frenteId)) + '</p></div></li>';
                      }).join('') + '</ul>'
                    : UI.vazio('Sem eventos publicos marcados.', 'calendar-off')) +
                UI.painel('As nossas frentes', '<ul class="lista">' + frentes.map(function (f) {
                    var cs = Store.listar('comissoes').filter(function (c) { return c.frenteId === f.id && c.ativo; });
                    return '<li class="flex gap-3 ' + UI.tom(f.cor) + '">' +
                        '<span class="selo-frente">' + UI.icone(f.icone || 'layers', 15) + '</span>' +
                        '<div class="min-w-0"><p style="font-size:.8125rem;font-weight:500">' + UI.esc(f.nome) + '</p>' +
                        '<p class="nota line-clamp-2">' + UI.esc(f.descricao) + '</p>' +
                        '<p class="nota" style="margin-top:.15rem">' + cs.length + ' comissoes</p></div>' +
                    '</li>';
                }).join('') + '</ul>') +
            '</div>';

            html += '</div>';
            return html;
        },
        ligar: function (raiz) {
            raiz.querySelectorAll('[data-frente]').forEach(function (el) {
                el.addEventListener('click', function () { filtro.frenteId = el.getAttribute('data-frente'); App.recarregar(); });
            });
            raiz.querySelectorAll('[data-post]').forEach(function (el) {
                el.addEventListener('click', function () { abrirPostagem(Store.encontrar('postagens', el.getAttribute('data-post'))); });
            });
        }
    };
})(window);
