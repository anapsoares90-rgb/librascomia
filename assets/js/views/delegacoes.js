/* ===================== Delegações e DPOs (SiV) =========================
   Que pais cada delegado representa, em que comitê, e se já entregou o
   Documento de Posição Oficial.
   ======================================================================= */
(function (global) {
    'use strict';

    var filtro = { comissaoId: '', busca: '' };

    function formulario(delegacao) {
        var edicao = !!delegacao;
        var comissoes = Dados.opcoesComissoes();
        if (!comissoes.length) { UI.toast('Não tem comitês disponíveis.', 'aviso'); return; }

        UI.formulario({
            titulo: edicao ? 'Editar delegação' : 'Nova delegação',
            subtitulo: 'Cada delegação representa um pais num comitê do SiV.',
            botao: edicao ? 'Salvar' : 'Cadastrar',
            campos: [
                { nome: 'pais', rotulo: 'País representado', tipo: 'text', valor: edicao ? delegacao.pais : '', obrigatorio: true, placeholder: 'Ex.: Brasil' },
                { nome: 'bandeira', rotulo: 'Bandeira (emoji)', tipo: 'text', largura: 'metade', valor: edicao ? delegacao.bandeira : '', placeholder: 'Ex.: 🇧🇷' },
                {
                    nome: 'comissaoId', rotulo: 'Comitê', tipo: 'select', largura: 'metade', obrigatorio: true,
                    valor: edicao ? delegacao.comissaoId : comissoes[0].valor, opcoes: comissoes
                },
                { nome: 'delegado', rotulo: 'Delegado(a)', tipo: 'text', largura: 'metade', valor: edicao ? delegacao.delegado : '' },
                { nome: 'turma', rotulo: 'Turma', tipo: 'text', largura: 'metade', valor: edicao ? delegacao.turma : '', placeholder: 'Ex.: 9.º A' },
                {
                    nome: 'presenca', rotulo: 'Presença', tipo: 'select', largura: 'metade',
                    valor: edicao ? delegacao.presenca : 'ausente',
                    opcoes: Object.keys(Dados.PRESENCAS).map(function (k) { return { valor: k, rotulo: Dados.PRESENCAS[k].rotulo }; })
                },
                {
                    nome: 'dpo', rotulo: 'Documento de Posição Oficial', tipo: 'select', largura: 'metade',
                    valor: edicao ? delegacao.dpo : 'pendente',
                    opcoes: [
                        { valor: 'pendente', rotulo: 'Por entregar' },
                        { valor: 'entregue', rotulo: 'Entregue' }
                    ]
                }
            ],
            validar: function (d) {
                if (!Auth.veComissao(d.comissaoId)) { return 'Não tem acesso a esse comitê.'; }
                return null;
            },
            aoGuardar: function (d) {
                if (edicao) {
                    Store.atualizar('delegacoes', delegacao.id, d);
                    Store.registar('Delegação atualizada', d.pais);
                    UI.toast('Delegação atualizada.', 'sucesso');
                } else {
                    Store.inserir('delegacoes', d);
                    Store.registar('Delegação cadastrada', d.pais + ' em ' + Dados.nomeComissao(d.comissaoId));
                    UI.toast('Delegação cadastrada.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function eliminar(delegacao) {
        UI.confirmar({
            titulo: 'Excluir delegação',
            mensagem: 'Excluir a delegação de ' + delegacao.pais + '? Os discursos já registrados permanecem no histórico.',
            confirmar: 'Excluir',
            aoConfirmar: function () {
                Store.remover('delegacoes', delegacao.id);
                Store.registar('Delegação excluida', delegacao.pais);
                UI.toast('Delegação excluida.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.delegacoes = {
        titulo: 'Delegações',
        formulario: formulario,

        render: function () {
            var todas = Store.listar('delegacoes').filter(function (d) { return Auth.veComissao(d.comissaoId); });
            var lista = todas.filter(function (d) {
                if (filtro.comissaoId && d.comissaoId !== filtro.comissaoId) { return false; }
                if (filtro.busca) {
                    var alvo = (d.pais + ' ' + (d.delegado || '') + ' ' + (d.turma || '')).toLowerCase();
                    if (alvo.indexOf(filtro.busca.toLowerCase()) === -1) { return false; }
                }
                return true;
            }).sort(function (a, b) { return a.pais.localeCompare(b.pais); });

            var html = UI.cabecalho('SiV', 'Delegações',
                'Os paises representados em cada comitê e a entrega dos Documentos de Posição Oficial.',
                '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Nova delegação</button>');

            html += UI.metricas([
                { rotulo: 'Delegações', valor: todas.length, tom: 'indigo' },
                { rotulo: 'Na sala', valor: todas.filter(function (d) { return d.presenca !== 'ausente'; }).length, tom: 'emerald' },
                { rotulo: 'DPOs entregues', valor: todas.filter(function (d) { return d.dpo === 'entregue'; }).length, tom: 'sky' },
                { rotulo: 'DPOs por entregar', valor: todas.filter(function (d) { return d.dpo !== 'entregue'; }).length, tom: 'amber' }
            ]);

            html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4" style="max-width:44rem">' +
                '<input id="d-busca" type="search" value="' + UI.esc(filtro.busca) + '" placeholder="Procurar por pais, delegado ou turma..." class="campo">' +
                '<select id="d-comite" class="campo"><option value="">Todos os comitês</option>' +
                    Dados.opcoesComissoes().map(function (o) {
                        return '<option value="' + o.valor + '"' + (filtro.comissaoId === o.valor ? ' selected' : '') + '>' + UI.esc(o.rotulo) + '</option>';
                    }).join('') + '</select>' +
            '</div>';

            if (!lista.length) {
                return html + UI.painel('', UI.vazio('Nenhuma delegação encontrada.', 'flag'));
            }

            html += UI.painel('', '<div class="overflow-x-auto"><table class="tabela">' +
                '<thead><tr><th>País</th><th>Delegado(a)</th><th>Comitê</th><th>Presenca</th><th>DPO</th><th>Discursos</th><th class="text-right">Ações</th></tr></thead>' +
                '<tbody>' + lista.map(function (d) {
                    var p = Dados.PRESENCAS[d.presenca] || Dados.PRESENCAS.ausente;
                    var discursos = Store.listar('discursos').filter(function (x) { return x.delegacaoId === d.id; }).length;
                    return '<tr>' +
                        '<td><span class="fila-item__bandeira">' + UI.esc(d.bandeira || '') + '</span> <b>' + UI.esc(d.pais) + '</b></td>' +
                        '<td class="texto-medio">' + UI.esc(d.delegado || '—') + '<p class="nota">' + UI.esc(d.turma || '') + '</p></td>' +
                        '<td class="texto-medio">' + UI.esc(Dados.nomeComissao(d.comissaoId)) + '</td>' +
                        '<td>' + UI.etiqueta(p.rotulo, p.cor) + '</td>' +
                        '<td>' + (d.dpo === 'entregue'
                            ? UI.etiqueta('Entregue', 'emerald')
                            : '<button class="btn btn--pequeno" data-acao="dpo" data-id="' + d.id + '">Marcar entregue</button>') + '</td>' +
                        '<td class="numero">' + discursos + '</td>' +
                        '<td><div class="registo__acoes">' +
                            '<button class="btn btn--icone" data-acao="editar" data-id="' + d.id + '">' + UI.icone('pencil', 14) + '</button>' +
                            '<button class="btn btn--icone perigo" data-acao="excluir" data-id="' + d.id + '">' + UI.icone('trash-2', 14) + '</button>' +
                        '</div></td>' +
                    '</tr>';
                }).join('') + '</tbody></table></div>', { semPadding: true });

            return html;
        },

        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }

            var busca = raiz.querySelector('#d-busca');
            if (busca) {
                var t;
                busca.addEventListener('input', function () {
                    clearTimeout(t);
                    t = setTimeout(function () {
                        filtro.busca = busca.value;
                        App.recarregar(function () {
                            var novo = document.querySelector('#d-busca');
                            if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
                        });
                    }, 350);
                });
            }
            var sel = raiz.querySelector('#d-comite');
            if (sel) { sel.addEventListener('change', function () { filtro.comissaoId = sel.value; App.recarregar(); }); }

            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('delegacoes', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="excluir"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('delegacoes', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="dpo"]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var d = Store.encontrar('delegacoes', el.getAttribute('data-id'));
                    Store.atualizar('delegacoes', d.id, { dpo: 'entregue' });
                    Store.registar('DPO entregue', d.pais);
                    UI.toast('DPO de ' + d.pais + ' marcado como entregue.', 'sucesso');
                    App.recarregar();
                });
            });
        }
    };
})(window);
