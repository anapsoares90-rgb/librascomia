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
            var totalPosts = posts.length || 1;

            var html = UI.cabecalho('Acompanhamento', 'Relatorios',
                'Indicadores de participacao e producao por comissao.',
                '<button class="btn" data-acao="csv">' + UI.icone('download', 15) + ' Exportar CSV</button>');

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">' +
                '<div class="lg:col-span-2">' + UI.painel('Postagens por comissao', linhas.length
                    ? linhas.map(function (l) { return UI.barra(l.comissao.nome, l.postagens, maxPosts, Dados.corFrente(l.comissao.frenteId)); }).join('')
                    : UI.vazio('Sem dados.', 'bar-chart-3')) + '</div>' +
                UI.painel('Estado das postagens', Object.keys(Dados.ESTADOS).map(function (k) {
                    var info = Dados.estado(k);
                    var total = posts.filter(function (p) { return p.status === k; }).length;
                    return '<div class="barra ' + UI.tom(info.cor) + '">' +
                        '<div class="barra__topo">' +
                            '<span class="barra__nome">' + info.rotulo + '</span>' +
                            '<span class="barra__valor">' + total + ' · ' + Math.round((total / totalPosts) * 100) + '%</span>' +
                        '</div>' +
                        '<div class="barra__trilho"><div class="barra__preenchimento" style="width:' + Math.round((total / totalPosts) * 100) + '%"></div></div>' +
                    '</div>';
                }).join('')) +
            '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">' +
                UI.painel('Membros por comissao', linhas.length
                    ? linhas.slice().sort(function (a, b) { return b.membros - a.membros; })
                        .map(function (l) { return UI.barra(l.comissao.nome, l.membros, maxMembros, 'emerald'); }).join('')
                    : UI.vazio('Sem dados.', 'users')) +
                UI.painel('Resumo por frente', '<ul class="lista">' + Auth.frentesVisiveis().map(function (f) {
                    var cs = Auth.comissoesVisiveis().filter(function (c) { return c.frenteId === f.id; });
                    var ps = Dados.postagensVisiveis().filter(function (p) { return p.frenteId === f.id; });
                    var es = Dados.eventosVisiveis().filter(function (e) { return e.frenteId === f.id; });
                    return '<li class="flex items-center gap-3 ' + UI.tom(f.cor) + '">' +
                        '<span class="selo-frente">' + UI.icone(f.icone || 'layers', 15) + '</span>' +
                        '<div class="min-w-0 flex-1"><p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(f.nome) + '</p>' +
                        '<p class="nota">' + cs.length + ' comissoes · ' + ps.length + ' postagens · ' + es.length + ' eventos</p></div>' +
                    '</li>';
                }).join('') + '</ul>') +
            '</div>';

            html += UI.painel('Quadro geral', '<div class="overflow-x-auto"><table class="tabela">' +
                '<thead><tr><th>Comissao</th><th>Frente</th><th>Membros</th><th>Postagens</th><th>Liberadas</th><th>Eventos</th><th>Coordenador</th></tr></thead>' +
                '<tbody>' + linhas.map(function (l) {
                    return '<tr>' +
                        '<td style="font-weight:500">' + UI.esc(l.comissao.nome) + '</td>' +
                        '<td class="texto-medio">' + UI.esc(Dados.nomeFrente(l.comissao.frenteId)) + '</td>' +
                        '<td class="numero">' + l.membros + '</td>' +
                        '<td class="numero">' + l.postagens + '</td>' +
                        '<td class="numero" style="color:var(--tom)"><span class="' + UI.tom('emerald') + '">' + l.liberadas + '</span></td>' +
                        '<td class="numero">' + l.eventos + '</td>' +
                        '<td class="texto-medio">' + UI.esc(l.comissao.coordenadorId ? Dados.nomeUsuario(l.comissao.coordenadorId) : '—') + '</td>' +
                    '</tr>';
                }).join('') + '</tbody></table></div>', { semPadding: true });

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
                UI.guardarFicheiro('relatorio-protagonismo.csv', '\ufeff' + csv, 'text/csv;charset=utf-8;');
            });
        }
    };
})(window);
