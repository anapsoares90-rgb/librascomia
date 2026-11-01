/* ========================= Pagamentos do SiV ===========================
   Taxas de inscrição: o que já entrou, o que falta e quem esta isento.
   ======================================================================= */
(function (global) {
    'use strict';

    var filtro = { estado: '' };

    var ESTADOS = {
        pago:      { rotulo: 'Pago',      cor: 'emerald' },
        pendente:  { rotulo: 'Pendente',  cor: 'amber' },
        isento:    { rotulo: 'Isento',    cor: 'sky' },
        devolvido: { rotulo: 'Devolvido', cor: 'rose' }
    };

    function moeda(valor) {
        return (Number(valor) || 0).toFixed(2).replace('.', ',') + ' €';
    }

    function formulario(pagamento) {
        var edicao = !!pagamento;
        var inscricoes = Dados.inscricoesVisiveis();
        UI.formulario({
            titulo: edicao ? 'Editar cobranca' : 'Nova cobranca',
            botao: edicao ? 'Salvar' : 'Registar',
            campos: [
                {
                    nome: 'inscricaoId', rotulo: 'Participante', tipo: 'select', obrigatorio: true,
                    valor: edicao ? pagamento.inscricaoId : (inscricoes[0] ? inscricoes[0].id : ''),
                    opcoes: inscricoes.map(function (i) { return { valor: i.id, rotulo: i.nome + ' · ' + (i.turma || '') }; })
                },
                { nome: 'descricao', rotulo: 'Descricao', tipo: 'text', valor: edicao ? pagamento.descricao : 'Inscrição de delegado', obrigatorio: true },
                { nome: 'valor', rotulo: 'Valor (€)', tipo: 'number', largura: 'metade', valor: edicao ? pagamento.valor : 5 },
                {
                    nome: 'estado', rotulo: 'Estado', tipo: 'select', largura: 'metade',
                    valor: edicao ? pagamento.estado : 'pendente',
                    opcoes: Object.keys(ESTADOS).map(function (k) { return { valor: k, rotulo: ESTADOS[k].rotulo }; })
                },
                { nome: 'metodo', rotulo: 'Forma de pagamento', tipo: 'text', largura: 'metade', valor: edicao ? pagamento.metodo : '', placeholder: 'Secretaria, MB Way, transferencia...' }
            ],
            aoGuardar: function (d) {
                var inscricao = Store.encontrar('inscricoes', d.inscricaoId);
                var dados = {
                    inscricaoId: d.inscricaoId,
                    nome: inscricao ? inscricao.nome : '',
                    descricao: d.descricao,
                    valor: Number(d.valor) || 0,
                    estado: d.estado,
                    metodo: d.metodo,
                    data: d.estado === 'pago' ? Store.agora() : null
                };
                if (edicao) {
                    Store.atualizar('pagamentos', pagamento.id, dados);
                    UI.toast('Cobranca atualizada.', 'sucesso');
                } else {
                    Store.inserir('pagamentos', dados);
                    UI.toast('Cobranca registrada.', 'sucesso');
                }
                Store.registar('Pagamento registrado', dados.nome + ' · ' + moeda(dados.valor) + ' · ' + d.estado);
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.financeiro = {
        titulo: 'Pagamentos',

        render: function () {
            var todos = Dados.pagamentosVisiveis();
            var t = Dados.totaisFinanceiros();
            var lista = todos.filter(function (p) { return !filtro.estado || p.estado === filtro.estado; });

            var html = UI.cabecalho('SiV · antes do evento', 'Pagamentos',
                'Taxas de inscrição do SiV: o que já entrou, o que falta receber e quem esta isento.',
                '<button class="btn" data-acao="csv">' + UI.icone('download', 15) + ' Exportar CSV</button>' +
                '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Nova cobranca</button>');

            html += UI.metricas([
                { rotulo: 'Recebido', valor: moeda(t.recebido), tom: 'emerald' },
                { rotulo: 'Por receber', valor: moeda(t.pendente), tom: 'amber' },
                { rotulo: 'Isencoes', valor: moeda(t.isento), tom: 'sky' },
                { rotulo: 'Cobrancas', valor: t.total, tom: 'indigo' }
            ]);

            html += '<div class="flex flex-wrap gap-1.5 mb-4">' +
                [['', 'Todas']].concat(Object.keys(ESTADOS).map(function (k) { return [k, ESTADOS[k].rotulo]; }))
                    .map(function (par) {
                        return '<button class="filtro' + (filtro.estado === par[0] ? ' filtro--ativo' : '') + '" data-filtro="' + par[0] + '">' + par[1] + '</button>';
                    }).join('') +
            '</div>';

            if (!lista.length) {
                return html + UI.painel('', UI.vazio('Nenhuma cobranca nesta categoria.', 'wallet'));
            }

            html += UI.painel('', '<div class="overflow-x-auto"><table class="tabela">' +
                '<thead><tr><th>Participante</th><th>Descrição</th><th>Valor</th><th>Estado</th><th>Forma</th><th>Data</th><th class="text-right">Ações</th></tr></thead>' +
                '<tbody>' + lista.map(function (p) {
                    var e = ESTADOS[p.estado] || ESTADOS.pendente;
                    return '<tr>' +
                        '<td><div class="flex items-center gap-2.5">' + UI.avatar(p.nome, 'slate', 'pequeno') +
                            '<b>' + UI.esc(p.nome) + '</b></div></td>' +
                        '<td class="texto-medio">' + UI.esc(p.descricao) + '</td>' +
                        '<td class="numero">' + moeda(p.valor) + '</td>' +
                        '<td>' + UI.etiqueta(e.rotulo, e.cor, { forte: true }) + '</td>' +
                        '<td class="texto-medio">' + UI.esc(p.metodo || '—') + '</td>' +
                        '<td class="texto-medio">' + (p.data ? UI.dataCurta(p.data) : '—') + '</td>' +
                        '<td><div class="registo__acoes">' +
                            (p.estado !== 'pago'
                                ? '<button class="btn btn--pequeno" data-acao="pagar" data-id="' + p.id + '">Marcar pago</button>'
                                : '') +
                            '<button class="btn btn--icone" data-acao="editar" data-id="' + p.id + '">' + UI.icone('pencil', 14) + '</button>' +
                        '</div></td>' +
                    '</tr>';
                }).join('') + '</tbody></table></div>', { semPadding: true });

            return html;
        },

        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }

            raiz.querySelectorAll('[data-filtro]').forEach(function (el) {
                el.addEventListener('click', function () { filtro.estado = el.getAttribute('data-filtro'); App.recarregar(); });
            });
            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('pagamentos', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="pagar"]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var p = Store.encontrar('pagamentos', el.getAttribute('data-id'));
                    Store.atualizar('pagamentos', p.id, { estado: 'pago', data: Store.agora() });
                    Store.registar('Pagamento recebido', p.nome + ' · ' + moeda(p.valor));
                    UI.toast('Pagamento de ' + p.nome + ' registrado.', 'sucesso');
                    App.recarregar();
                });
            });

            var csv = raiz.querySelector('[data-acao="csv"]');
            if (csv) {
                csv.addEventListener('click', function () {
                    var linhas = 'Participante;Descricao;Valor;Estado;Forma;Data\n' +
                        Dados.pagamentosVisiveis().map(function (p) {
                            return [p.nome, p.descricao, p.valor, p.estado, p.metodo || '', p.data ? UI.dataCurta(p.data) : ''].join(';');
                        }).join('\n');
                    UI.guardarFicheiro('pagamentos-siv.csv', '﻿' + linhas, 'text/csv;charset=utf-8;');
                });
            }
        }
    };
})(window);
