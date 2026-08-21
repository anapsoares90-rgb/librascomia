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
                '<p class="text-sm text-slate-300 font-medium mb-3">' + UI.esc(post.resumo) + '</p>' +
                '<div class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">' + UI.nl2br(post.conteudo) + '</div>' +
                ((post.tags || []).length
                    ? '<div class="flex flex-wrap gap-1.5 mt-4">' + post.tags.map(function (t) { return UI.chip('#' + t, 'slate'); }).join('') + '</div>'
                    : ''),
            rodape: '<button type="button" data-fechar="1" class="btn-primario">Fechar</button>'
        });
    }

    function cartaoPostagem(p, destaque) {
        var cor = Dados.corFrente(p.frenteId);
        if (destaque) {
            return '<button class="text-left w-full bg-gradient-to-br from-slate-850 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 hover:border-indigo-500/60 transition-all" data-post="' + p.id + '">' +
                '<div class="flex flex-wrap items-center gap-1.5 mb-3">' +
                    UI.chip('Destaque', 'amber', 'star') +
                    UI.chip(Dados.siglaFrente(p.frenteId), cor, 'layers') +
                '</div>' +
                '<h3 class="text-xl font-bold text-white leading-snug">' + UI.esc(p.titulo) + '</h3>' +
                '<p class="text-sm text-slate-400 mt-2">' + UI.esc(p.resumo) + '</p>' +
                '<p class="text-[11px] text-slate-500 mt-4">' + UI.esc(Dados.nomeComissao(p.comissaoId)) + ' · ' + UI.dataLonga(p.publicadoEm || p.criadoEm) + '</p>' +
            '</button>';
        }
        return '<button class="text-left w-full bg-slate-850 border border-slate-700 rounded-2xl p-5 hover:border-indigo-500/50 transition-all h-full flex flex-col" data-post="' + p.id + '">' +
            '<div class="flex flex-wrap items-center gap-1.5 mb-2">' + UI.chip(Dados.siglaFrente(p.frenteId), cor, 'layers') + '</div>' +
            '<h3 class="font-bold text-white leading-snug">' + UI.esc(p.titulo) + '</h3>' +
            '<p class="text-sm text-slate-400 mt-1.5 line-clamp-3 flex-1">' + UI.esc(p.resumo) + '</p>' +
            '<p class="text-[11px] text-slate-500 mt-3">' + UI.esc(Dados.nomeComissao(p.comissaoId)) + ' · ' + UI.dataCurta(p.publicadoEm || p.criadoEm) + '</p>' +
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

            if (!Auth.ehPublico()) {
                html += UI.cabecalho('Portal publico', 'Pre-visualizacao do que a comunidade escolar ve — apenas postagens liberadas.', '');
            } else {
                html += '<div class="mb-8">' +
                    '<h2 class="text-3xl sm:text-4xl font-bold text-white tracking-tight">Protagonismo Estudantil</h2>' +
                    '<p class="text-slate-400 mt-2 max-w-2xl">Acompanha o que as comissoes dos nossos projetos — SIV, Cine Club e outras frentes — estao a preparar.</p>' +
                '</div>';
            }

            html += '<div class="flex flex-wrap gap-2 mb-6">' +
                '<button class="' + (filtro.frenteId === '' ? 'btn-filtro-ativo' : 'btn-filtro') + '" data-frente="">Tudo</button>' +
                frentes.map(function (f) {
                    return '<button class="' + (filtro.frenteId === f.id ? 'btn-filtro-ativo' : 'btn-filtro') + '" data-frente="' + f.id + '">' + UI.esc(f.nome) + '</button>';
                }).join('') +
            '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

            html += '<div class="lg:col-span-2 space-y-5">';
            if (!lista.length) {
                html += UI.cartao(UI.vazio('Ainda nao ha publicacoes liberadas nesta frente. Volta em breve!', 'newspaper'));
            } else {
                destaques.slice(0, 2).forEach(function (p) { html += cartaoPostagem(p, true); });
                if (normais.length) {
                    html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">' +
                        normais.map(function (p) { return cartaoPostagem(p, false); }).join('') + '</div>';
                }
            }
            html += '</div>';

            html += '<div class="space-y-5">' +
                UI.cartao('<div class="px-5 py-4 border-b border-slate-700 flex items-center gap-2">' +
                            '<i data-lucide="calendar-days" class="w-4 h-4 text-sky-400"></i><h3 class="font-bold text-sm text-white">Agenda aberta a escola</h3></div>' +
                          '<div class="p-5">' + (agenda.length
                              ? '<ul class="space-y-3">' + agenda.map(function (e) {
                                    var d = new Date(e.data + 'T00:00:00');
                                    return '<li class="flex gap-3">' +
                                        '<div class="w-12 shrink-0 text-center bg-slate-800 border border-slate-700 rounded-lg py-1">' +
                                            '<div class="text-[10px] uppercase text-slate-400 font-bold">' + UI.MESES[d.getMonth()].slice(0, 3) + '</div>' +
                                            '<div class="text-lg font-bold text-white leading-none">' + d.getDate() + '</div>' +
                                        '</div>' +
                                        '<div class="min-w-0"><p class="text-sm text-white font-semibold truncate">' + UI.esc(e.titulo) + '</p>' +
                                        '<p class="text-xs text-slate-400 truncate">' + UI.esc(e.hora || '') + (e.local ? ' · ' + UI.esc(e.local) : '') + '</p>' +
                                        '<p class="text-[11px] text-slate-500">' + UI.esc(Dados.nomeFrente(e.frenteId)) + '</p></div>' +
                                    '</li>';
                                }).join('') + '</ul>'
                              : UI.vazio('Sem eventos publicos marcados.', 'calendar-off')) + '</div>') +
                UI.cartao('<div class="px-5 py-4 border-b border-slate-700 flex items-center gap-2">' +
                            '<i data-lucide="layers" class="w-4 h-4 text-indigo-400"></i><h3 class="font-bold text-sm text-white">As nossas frentes</h3></div>' +
                          '<div class="p-5 space-y-3">' + frentes.map(function (f) {
                              var cs = Store.listar('comissoes').filter(function (c) { return c.frenteId === f.id && c.ativo; });
                              return '<div class="flex gap-3">' +
                                  '<div class="w-9 h-9 rounded-lg ' + UI.cor(f.cor).solido + ' flex items-center justify-center shrink-0">' +
                                      '<i data-lucide="' + UI.esc(f.icone || 'layers') + '" class="w-4 h-4 text-white"></i></div>' +
                                  '<div class="min-w-0"><p class="text-sm text-white font-semibold">' + UI.esc(f.nome) + '</p>' +
                                  '<p class="text-xs text-slate-400 line-clamp-2">' + UI.esc(f.descricao) + '</p>' +
                                  '<p class="text-[11px] text-slate-500 mt-0.5">' + cs.length + ' comissoes</p></div>' +
                              '</div>';
                          }).join('') + '</div>') +
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
