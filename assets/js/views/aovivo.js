/* ======================= AO VIVO (supra admin) =========================
   O que cada comitê esta a fazer neste momento: modo, tópico, cronometro,
   orador com a palavra e estatísticas de discursos.
   ======================================================================= */
(function (global) {
    'use strict';

    var tique = null;

    function cartaoComite(c) {
        var sessao = Dados.sessaoDe(c.id);
        var ch = Dados.chamada(c.id);
        var m = sessao ? Dados.modo(sessao.modo) : null;
        var orador = sessao ? Dados.delegacao(sessao.oradorAtual) : null;
        var dpos = Dados.delegacoesDe(c.id).filter(function (d) { return d.dpo === 'entregue'; }).length;

        return '<article class="comite-vivo ' + UI.tom(sessao ? m.cor : 'slate') + '">' +
            '<div class="flex items-start justify-between gap-2">' +
                '<div class="min-w-0">' +
                    '<p class="comite-vivo__nome">' + UI.esc(c.sigla || c.nome) + '</p>' +
                    '<p class="nota truncate">' + UI.esc(c.nome) + '</p>' +
                '</div>' +
                (sessao
                    ? '<span class="pingo-vivo" title="Sessão aberta"></span>'
                    : UI.etiqueta('fechada', 'slate')) +
            '</div>' +
            (sessao
                ? '<p class="comite-vivo__modo">' + UI.esc(m.rotulo) + '</p>' +
                  (sessao.topico ? '<p class="nota line-clamp-2">' + UI.esc(sessao.topico) + '</p>' : '') +
                  '<p class="comite-vivo__relogio" data-relogio="' + c.id + '">' +
                      Dados.relogio(Dados.decorrido(sessao)) + ' / ' + Dados.relogio(sessao.tempoOrador || 90) +
                  '</p>' +
                  '<p class="nota">' + (orador ? UI.esc(orador.bandeira + ' ' + orador.pais + ' com a palavra') : 'Sem orador') + '</p>'
                : '<p class="comite-vivo__modo" style="color:var(--tinta-suave)">Sessão por abrir</p>') +
            '<div class="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3" style="border-top:1px solid var(--linha)">' +
                UI.etiqueta(ch.naSala + '/' + ch.total + ' na sala', ch.temQuorum ? 'emerald' : 'rose') +
                UI.etiqueta(dpos + ' DPOs', 'slate') +
                UI.etiqueta(Dados.discursosDe(c.id).length + ' discursos', 'slate') +
            '</div>' +
        '</article>';
    }

    global.Views = global.Views || {};
    global.Views.aovivo = {
        titulo: 'Ao vivo',

        render: function () {
            var comites = Dados.comissoesComDebate();
            var delegacoes = Store.listar('delegacoes');
            var usuarios = Store.listar('usuarios');
            var membros = Store.listar('membros');
            var abertas = comites.filter(function (c) { return !!Dados.sessaoDe(c.id); });

            var html = UI.cabecalho('SiV · tempo real', 'Ao vivo',
                'Acompanhe todos os comitês ao mesmo tempo: o que debatem, quanto tempo falta e quem tem a palavra.',
                '<button class="btn" data-acao="atualizar">' + UI.icone('refresh-cw', 15) + ' Atualizar</button>');

            html += UI.metricas([
                { rotulo: 'Comitês em sessão', valor: abertas.length, tom: 'emerald', nota: 'de ' + comites.length + ' com delegações' },
                { rotulo: 'Delegações', valor: delegacoes.length, tom: 'indigo' },
                { rotulo: 'Equipe', valor: usuarios.filter(function (u) { return u.perfil === 'admin'; }).length + membros.length, tom: 'sky', nota: 'coordenação e membros' },
                { rotulo: 'Discursos hoje', valor: Store.listar('discursos').length, tom: 'violet' }
            ]);

            if (!comites.length) {
                return html + UI.painel('', UI.vazio('Nenhum comitê tem delegações cadastradas.', 'radio-tower'));
            }

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">' +
                '<div class="lg:col-span-2">' +
                    UI.painel('Comites', '<div class="grade-vivo">' + comites.map(cartaoComite).join('') + '</div>', {
                        acao: UI.etiqueta(abertas.length + ' ao vivo', abertas.length ? 'emerald' : 'slate', { forte: true, semPonto: true })
                    }) +
                '</div>' +
                UI.painel('Discursos por comitê', (function () {
                    var linhas = comites.map(function (c) {
                        return { nome: c.sigla || c.nome, total: Dados.discursosDe(c.id).length, cor: Dados.corFrente(c.frenteId) };
                    }).sort(function (a, b) { return b.total - a.total; });
                    var max = Math.max.apply(null, [1].concat(linhas.map(function (l) { return l.total; })));
                    return linhas.map(function (l) { return UI.barra(l.nome, l.total, max, 'indigo'); }).join('');
                })()) +
            '</div>';

            return html;
        },

        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="atualizar"]');
            if (b) { b.addEventListener('click', function () { App.recarregar(); }); }

            /* Mantem os cronometros dos comitês a andar sem redesenhar a página. */
            tique = setInterval(function () {
                var algum = false;
                document.querySelectorAll('[data-relogio]').forEach(function (el) {
                    var sessao = Dados.sessaoDe(el.getAttribute('data-relogio'));
                    if (!sessao) { return; }
                    algum = true;
                    el.textContent = Dados.relogio(Dados.decorrido(sessao)) + ' / ' + Dados.relogio(sessao.tempoOrador || 90);
                });
                if (!algum) { clearInterval(tique); }
            }, 1000);
        },

        desligar: function () {
            if (tique) { clearInterval(tique); tique = null; }
        }
    };
})(window);
