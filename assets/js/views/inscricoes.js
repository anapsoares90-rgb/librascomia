/* ======================== Inscrições (o ANTES) =========================
   Recebe as candidaturas dos alunos, aceita ou recusa, e aloca cada
   participante a um comitê — criando a delegação e a cobranca.
   ======================================================================= */
(function (global) {
    'use strict';

    var filtro = { status: '' };

    var ESTADOS = {
        recebida: { rotulo: 'Recebida',  cor: 'amber' },
        aceite:   { rotulo: 'Aceita',    cor: 'sky' },
        alocada:  { rotulo: 'Alocada',   cor: 'emerald' },
        recusada: { rotulo: 'Recusada',  cor: 'rose' }
    };

    var TIPOS = {
        delegado: 'Delegado(a)',
        imprensa: 'Imprensa',
        mesa: 'Mesa / presidência',
        observador: 'Observador(a)'
    };

    function formulario(inscricao) {
        var edicao = !!inscricao;
        var frentes = Dados.opcoesFrentes();
        UI.formulario({
            titulo: edicao ? 'Editar inscrição' : 'Nova inscrição',
            subtitulo: 'A ficha de candidatura de um participante do SiV.',
            botao: edicao ? 'Salvar' : 'Registrar inscrição',
            campos: [
                { nome: 'nome', rotulo: 'Nome do aluno', tipo: 'text', valor: edicao ? inscricao.nome : '', obrigatorio: true },
                { nome: 'email', rotulo: 'E-mail', tipo: 'email', largura: 'metade', valor: edicao ? inscricao.email : '' },
                { nome: 'turma', rotulo: 'Turma', tipo: 'text', largura: 'metade', valor: edicao ? inscricao.turma : '', placeholder: 'Ex.: 9.º A' },
                {
                    nome: 'frenteId', rotulo: 'Frente', tipo: 'select', largura: 'metade', obrigatorio: true,
                    valor: edicao ? inscricao.frenteId : (frentes[0] ? frentes[0].valor : ''), opcoes: frentes
                },
                {
                    nome: 'comissaoId', rotulo: 'Comitê pretendido', tipo: 'select', largura: 'metade',
                    valor: edicao ? inscricao.comissaoId : '', opcoes: Dados.opcoesComissoes(null, '— sem preferencia —')
                },
                {
                    nome: 'tipo', rotulo: 'Participa como', tipo: 'select', largura: 'metade',
                    valor: edicao ? inscricao.tipo : 'delegado',
                    opcoes: Object.keys(TIPOS).map(function (k) { return { valor: k, rotulo: TIPOS[k] }; })
                },
                { nome: 'paisPreferido', rotulo: 'Pais preferido', tipo: 'text', largura: 'metade', valor: edicao ? inscricao.paisPreferido : '' }
            ],
            aoGuardar: function (d) {
                d.comissaoId = d.comissaoId || null;
                if (edicao) {
                    Store.atualizar('inscricoes', inscricao.id, d);
                    UI.toast('Inscrição atualizada.', 'sucesso');
                } else {
                    d.status = 'recebida';
                    d.delegacaoId = null;
                    Store.inserir('inscricoes', d);
                    Store.registar('Inscrição recebida', d.nome);
                    UI.toast('Inscrição registrada.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    /* Aceitar e alocar: cria a delegação no comitê e a cobranca da inscrição. */
    function alocar(inscricao) {
        var comissoes = Dados.opcoesComissoes();
        UI.formulario({
            titulo: 'Alocar ' + inscricao.nome,
            subtitulo: 'Crie a delegação no comitê e regista a cobranca da inscrição.',
            botao: 'Alocar',
            campos: [
                {
                    nome: 'comissaoId', rotulo: 'Comitê', tipo: 'select', obrigatorio: true,
                    valor: inscricao.comissaoId || (comissoes[0] ? comissoes[0].valor : ''), opcoes: comissoes
                },
                { nome: 'pais', rotulo: 'Pais atribuído', tipo: 'text', largura: 'metade', valor: inscricao.paisPreferido || '', obrigatorio: true },
                { nome: 'bandeira', rotulo: 'Bandeira (emoji)', tipo: 'text', largura: 'metade', valor: '' },
                { nome: 'valor', rotulo: 'Valor da inscrição', tipo: 'number', largura: 'metade', valor: 5 },
                {
                    nome: 'estadoPagamento', rotulo: 'Pagamento', tipo: 'select', largura: 'metade', valor: 'pendente',
                    opcoes: [
                        { valor: 'pendente', rotulo: 'Por pagar' },
                        { valor: 'pago', rotulo: 'Pago' },
                        { valor: 'isento', rotulo: 'Isento' }
                    ]
                }
            ],
            aoGuardar: function (d) {
                var delegacao = Store.inserir('delegacoes', {
                    comissaoId: d.comissaoId, pais: d.pais, bandeira: d.bandeira,
                    delegado: inscricao.nome, turma: inscricao.turma,
                    presenca: 'ausente', dpo: 'pendente', inscricaoId: inscricao.id
                });
                Store.atualizar('inscricoes', inscricao.id, { status: 'alocada', delegacaoId: delegacao.id, comissaoId: d.comissaoId });
                Store.inserir('pagamentos', {
                    inscricaoId: inscricao.id, nome: inscricao.nome,
                    descricao: 'Inscrição de ' + (TIPOS[inscricao.tipo] || inscricao.tipo).toLowerCase(),
                    valor: Number(d.valor) || 0, estado: d.estadoPagamento,
                    metodo: '', data: d.estadoPagamento === 'pago' ? Store.agora() : null
                });
                Store.registar('Inscrição alocada', inscricao.nome + ' → ' + d.pais + ' (' + Dados.nomeComissao(d.comissaoId) + ')');
                UI.toast(inscricao.nome + ' alocado(a) como ' + d.pais + '.', 'sucesso');
                App.recarregar();
            }
        });
    }

    function mudarEstado(inscricao, estado) {
        Store.atualizar('inscricoes', inscricao.id, { status: estado });
        Store.registar('Inscrição ' + estado, inscricao.nome);
        UI.toast('Inscrição de ' + inscricao.nome + ' marcada como ' + ESTADOS[estado].rotulo.toLowerCase() + '.', 'info');
        App.recarregar();
    }

    global.Views = global.Views || {};
    global.Views.inscricoes = {
        titulo: 'Inscrições',
        formulario: formulario,

        render: function () {
            var todas = Dados.inscricoesVisiveis();
            var lista = todas.filter(function (i) { return !filtro.status || i.status === filtro.status; });

            var html = UI.cabecalho('SiV · antes do evento', 'Inscrições',
                'Candidaturas dos alunos: aceitar, recusar e alocar cada participante a um comitê.',
                '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Nova inscrição</button>');

            html += UI.metricas([
                { rotulo: 'Total', valor: todas.length, tom: 'indigo' },
                { rotulo: 'Por analisar', valor: todas.filter(function (i) { return i.status === 'recebida'; }).length, tom: 'amber' },
                { rotulo: 'Alocadas', valor: todas.filter(function (i) { return i.status === 'alocada'; }).length, tom: 'emerald' },
                { rotulo: 'Recusadas', valor: todas.filter(function (i) { return i.status === 'recusada'; }).length, tom: 'rose' }
            ]);

            html += '<div class="flex flex-wrap gap-1.5 mb-4">' +
                [['', 'Todas']].concat(Object.keys(ESTADOS).map(function (k) { return [k, ESTADOS[k].rotulo]; }))
                    .map(function (par) {
                        return '<button class="filtro' + (filtro.status === par[0] ? ' filtro--ativo' : '') + '" data-filtro="' + par[0] + '">' + par[1] + '</button>';
                    }).join('') +
            '</div>';

            if (!lista.length) {
                return html + UI.painel('', UI.vazio('Nenhuma inscrição nesta categoria.', 'clipboard-list'));
            }

            html += UI.painel('', lista.map(function (i) {
                var e = ESTADOS[i.status] || ESTADOS.recebida;
                return '<article class="registo">' +
                    UI.avatar(i.nome, 'sky') +
                    '<div class="min-w-0 flex-1">' +
                        '<div class="flex flex-wrap items-center gap-x-3 gap-y-1">' +
                            '<p style="font-weight:600;font-size:.875rem">' + UI.esc(i.nome) + '</p>' +
                            UI.etiqueta(e.rotulo, e.cor, { forte: true }) +
                            UI.etiqueta(TIPOS[i.tipo] || i.tipo, 'slate') +
                        '</div>' +
                        '<p class="nota" style="margin-top:.25rem">' +
                            UI.esc(i.turma || '') + (i.email ? ' · ' + UI.esc(i.email) : '') +
                            ' · ' + UI.esc(Dados.nomeFrente(i.frenteId)) +
                            (i.comissaoId ? ' · ' + UI.esc(Dados.nomeComissao(i.comissaoId)) : '') +
                            (i.paisPreferido ? ' · prefere ' + UI.esc(i.paisPreferido) : '') +
                        '</p>' +
                        (i.delegacaoId ? '<p class="nota">Delegação: ' + UI.esc(Dados.nomeDelegacao(i.delegacaoId)) + '</p>' : '') +
                    '</div>' +
                    '<div class="flex flex-wrap items-center gap-1.5 shrink-0">' +
                        (i.status === 'recebida'
                            ? '<button class="btn btn--pequeno" data-acao="aceitar" data-id="' + i.id + '">Aceitar</button>' +
                              '<button class="btn btn--pequeno" data-acao="recusar" data-id="' + i.id + '">Recusar</button>'
                            : '') +
                        (i.status === 'aceite' || (i.status === 'recebida')
                            ? '<button class="btn btn--principal btn--pequeno" data-acao="alocar" data-id="' + i.id + '">Alocar</button>'
                            : '') +
                        '<button class="btn btn--icone" data-acao="editar" data-id="' + i.id + '">' + UI.icone('pencil', 13) + '</button>' +
                    '</div>' +
                '</article>';
            }).join(''), { semPadding: true });

            return html;
        },

        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }

            raiz.querySelectorAll('[data-filtro]').forEach(function (el) {
                el.addEventListener('click', function () { filtro.status = el.getAttribute('data-filtro'); App.recarregar(); });
            });

            function liga(acao, fn) {
                raiz.querySelectorAll('[data-acao="' + acao + '"]').forEach(function (el) {
                    el.addEventListener('click', function () { fn(Store.encontrar('inscricoes', el.getAttribute('data-id'))); });
                });
            }
            liga('editar', formulario);
            liga('alocar', alocar);
            liga('aceitar', function (i) { mudarEstado(i, 'aceite'); });
            liga('recusar', function (i) { mudarEstado(i, 'recusada'); });
        }
    };
})(window);
