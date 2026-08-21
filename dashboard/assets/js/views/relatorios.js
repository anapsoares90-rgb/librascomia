/* ============================= Relatorios ============================== */
(function (global) {
    'use strict';

    function porComissao() {
        var comissoes = Auth.comissoesVisiveis();
        var posts = Dados.postagensVisiveis();
        var membros = Dados.membrosVisiveis();
        var eventos = Dados.eventosVisiveis();

        return comissoes.map(function (c) {
            return {
                comissao: c,
                postagens: posts.filter(function (p) { return p.comissaoId === c.id; }).length,
                liberadas: posts.filter(function (p) { return p.comissaoId === c.id && p.status === 'aprovado'; }).length,
                membros: membros.filter(function (m) { return m.comissaoId === c.id; }).length,
                eventos: eventos.filter(function (e) { return e.comissaoId === c.id; }).length
            };
        }).sort(function (a, b) { return b.postagens - a.postagens; });
    }

    global.Views = global.Views || {};
    global.Views.relatorios = {
        titulo: 'Relatorios',
        render: function () {
            var linhas = porComissao();
            var posts = Dados.postagensVisiveis();
            var maxPosts = Math.max.apply(null, [1].concat(linhas.map(function (l) { return l.postagens; })));
            var maxMembros = Math.max.apply(null, [1].concat(linhas.map(function (l) { return l.membros; })));

            var html = UI.cabecalho('Relatorios do Protagonismo',
                'Indicadores de participacao e producao por comissao.',
                '<button class="btn-secundario" data-acao="csv"><i data-lucide="download" class="w-4 h-4"></i> Exportar CSV</button>');

            var porEstado = Object.keys(Dados.ESTADOS).map(function (k) {
                return { chave: k, total: posts.filter(function (p) { return p.status === k; }).length };
            });
            var totalPosts = posts.length || 1;

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">' +
                UI.cartao('<div class="px-5 py-4 border-b border-slate-700"><h3 class="font-bold text-sm text-white">Postagens por comissao</h3></div>' +
                          '<div class="p-5">' + (linhas.length
                              ? linhas.map(function (l) { return UI.barra(l.comissao.nome, l.postagens, maxPosts, Dados.corFrente(l.comissao.frenteId)); }).join('')
                              : UI.vazio('Sem dados.', 'bar-chart-3')) + '</div>', 'lg:col-span-2') +
                UI.cartao('<div class="px-5 py-4 border-b border-slate-700"><h3 class="font-bold text-sm text-white">Estado das postagens</h3></div>' +
                          '<div class="p-5 space-y-3">' + porEstado.map(function (e) {
                              var info = Dados.estado(e.chave);
                              var pct = Math.round((e.total / totalPosts) * 100);
                              return '<div>' +
                                  '<div class="flex justify-between items-center text-xs mb-1.5">' +
                                      '<span class="flex items-center gap-1.5 text-slate-300"><span class="w-2 h-2 rounded-full ' + UI.cor(info.cor).ponto + '"></span>' + info.rotulo + '</span>' +
                                      '<span class="text-slate-400 font-semibold">' + e.total + ' · ' + pct + '%</span>' +
                                  '</div>' +
                                  '<div class="h-2 bg-slate-800 rounded-full overflow-hidden"><div class="h-full ' + UI.cor(info.cor).solido + '" style="width:' + pct + '%"></div></div>' +
                              '</div>';
                          }).join('') + '</div>') +
            '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">' +
                UI.cartao('<div class="px-5 py-4 border-b border-slate-700"><h3 class="font-bold text-sm text-white">Membros por comissao</h3></div>' +
                          '<div class="p-5">' + (linhas.length
                              ? linhas.slice().sort(function (a, b) { return b.membros - a.membros; })
                                  .map(function (l) { return UI.barra(l.comissao.nome, l.membros, maxMembros, 'emerald'); }).join('')
                              : UI.vazio('Sem dados.', 'users')) + '</div>') +
                UI.cartao('<div class="px-5 py-4 border-b border-slate-700"><h3 class="font-bold text-sm text-white">Resumo por frente</h3></div>' +
                          '<div class="p-5 space-y-3">' + Auth.frentesVisiveis().map(function (f) {
                              var cs = Auth.comissoesVisiveis().filter(function (c) { return c.frenteId === f.id; });
                              var ps = Dados.postagensVisiveis().filter(function (p) { return p.frenteId === f.id; });
                              var es = Dados.eventosVisiveis().filter(function (e) { return e.frenteId === f.id; });
                              return '<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center gap-3">' +
                                  '<span class="w-2.5 h-2.5 rounded-full ' + UI.cor(f.cor).ponto + ' shrink-0"></span>' +
                                  '<div class="min-w-0 flex-1"><p class="text-sm text-white font-semibold truncate">' + UI.esc(f.nome) + '</p>' +
                                  '<p class="text-[11px] text-slate-400">' + cs.length + ' comissoes · ' + ps.length + ' postagens · ' + es.length + ' eventos</p></div>' +
                              '</div>';
                          }).join('') + '</div>') +
            '</div>';

            html += UI.cartao('<div class="px-5 py-4 border-b border-slate-700"><h3 class="font-bold text-sm text-white">Quadro geral</h3></div>' +
                '<div class="overflow-x-auto"><table class="w-full text-sm">' +
                '<thead><tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/40">' +
                    '<th class="px-5 py-3 font-semibold">Comissao</th><th class="px-5 py-3 font-semibold">Frente</th>' +
                    '<th class="px-5 py-3 font-semibold">Membros</th><th class="px-5 py-3 font-semibold">Postagens</th>' +
                    '<th class="px-5 py-3 font-semibold">Liberadas</th><th class="px-5 py-3 font-semibold">Eventos</th>' +
                    '<th class="px-5 py-3 font-semibold">Coordenador</th>' +
                '</tr></thead><tbody class="divide-y divide-slate-700/60">' +
                linhas.map(function (l) {
                    var coord = l.comissao.coordenadorId ? Dados.nomeUsuario(l.comissao.coordenadorId) : '—';
                    return '<tr class="hover:bg-slate-800/40 transition-all">' +
                        '<td class="px-5 py-3 text-white font-medium">' + UI.esc(l.comissao.nome) + '</td>' +
                        '<td class="px-5 py-3 text-slate-300 text-xs">' + UI.esc(Dados.nomeFrente(l.comissao.frenteId)) + '</td>' +
                        '<td class="px-5 py-3 text-slate-300">' + l.membros + '</td>' +
                        '<td class="px-5 py-3 text-slate-300">' + l.postagens + '</td>' +
                        '<td class="px-5 py-3 text-emerald-400 font-semibold">' + l.liberadas + '</td>' +
                        '<td class="px-5 py-3 text-slate-300">' + l.eventos + '</td>' +
                        '<td class="px-5 py-3 text-slate-300 text-xs">' + UI.esc(coord) + '</td>' +
                    '</tr>';
                }).join('') +
                '</tbody></table></div>');

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="csv"]');
            if (!b) { return; }
            b.addEventListener('click', function () {
                var linhas = porComissao();
                var csv = 'Comissao;Frente;Membros;Postagens;Liberadas;Eventos;Coordenador\n' +
                    linhas.map(function (l) {
                        return [l.comissao.nome, Dados.nomeFrente(l.comissao.frenteId), l.membros, l.postagens, l.liberadas, l.eventos,
                                l.comissao.coordenadorId ? Dados.nomeUsuario(l.comissao.coordenadorId) : ''].join(';');
                    }).join('\n');
                var blob = new Blob(["﻿" + csv], { type: 'text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'relatorio-protagonismo.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                UI.toast('Relatorio exportado.', 'sucesso');
            });
        }
    };
})(window);
