/* =============================== Membros =============================== */
(function (global) {
    'use strict';

    var filtro = { comissaoId: '', busca: '' };

    function formulario(membro) {
        var edicao = !!membro;
        var comissoes = Dados.opcoesComissoes();
        if (!comissoes.length) { UI.toast('Nao tens comissoes disponiveis.', 'aviso'); return; }
        var eu = Auth.usuarioAtual();

        UI.formulario({
            titulo: edicao ? 'Editar membro' : 'Cadastrar membro',
            subtitulo: 'Os membros recebem as postagens internas e os comunicados da comissao.',
            botao: edicao ? 'Guardar' : 'Cadastrar',
            campos: [
                { nome: 'nome', rotulo: 'Nome do aluno', tipo: 'text', valor: edicao ? membro.nome : '', obrigatorio: true },
                { nome: 'turma', rotulo: 'Turma', tipo: 'text', largura: 'metade', valor: edicao ? membro.turma : '', placeholder: 'Ex.: 9.º B' },
                { nome: 'papel', rotulo: 'Funcao na comissao', tipo: 'text', largura: 'metade', valor: edicao ? membro.papel : '', placeholder: 'Ex.: Delegado, Reporter' },
                { nome: 'email', rotulo: 'E-mail (opcional)', tipo: 'email', largura: 'metade', valor: edicao ? membro.email : '' },
                {
                    nome: 'comissaoId', rotulo: 'Comissao', tipo: 'select', largura: 'metade', obrigatorio: true,
                    valor: edicao ? membro.comissaoId : (eu && eu.comissaoIds && eu.comissaoIds[0] ? eu.comissaoIds[0] : comissoes[0].valor),
                    opcoes: comissoes
                },
                {
                    nome: 'status', rotulo: 'Situacao', tipo: 'select', largura: 'metade', valor: edicao ? membro.status : 'ativo',
                    opcoes: [
                        { valor: 'ativo', rotulo: 'Ativo' },
                        { valor: 'pendente', rotulo: 'Inscricao pendente' },
                        { valor: 'inativo', rotulo: 'Inativo' }
                    ]
                }
            ],
            validar: function (d) {
                if (!Auth.veComissao(d.comissaoId)) { return 'Nao tens acesso a essa comissao.'; }
                return null;
            },
            aoGuardar: function (d) {
                if (edicao) {
                    Store.atualizar('membros', membro.id, d);
                    Store.registar('Membro atualizado', d.nome);
                    UI.toast('Membro atualizado.', 'sucesso');
                } else {
                    Store.inserir('membros', d);
                    Store.registar('Membro cadastrado', d.nome + ' → ' + Dados.nomeComissao(d.comissaoId));
                    UI.toast('Membro cadastrado.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function eliminar(membro) {
        UI.confirmar({
            titulo: 'Remover membro',
            mensagem: 'Queres remover "' + membro.nome + '" da comissao?',
            confirmar: 'Remover',
            aoConfirmar: function () {
                Store.remover('membros', membro.id);
                Store.registar('Membro removido', membro.nome);
                UI.toast('Membro removido.', 'sucesso');
                App.recarregar();
            }
        });
    }

    var CORES_ESTADO = { ativo: 'emerald', pendente: 'amber', inativo: 'slate' };

    global.Views = global.Views || {};
    global.Views.membros = {
        titulo: 'Membros',
        formulario: formulario,
        render: function () {
            var pode = Auth.pode('membros.gerir');
            var todos = Dados.membrosVisiveis();
            var lista = todos.filter(function (m) {
                if (filtro.comissaoId && m.comissaoId !== filtro.comissaoId) { return false; }
                if (filtro.busca) {
                    var alvo = (m.nome + ' ' + (m.turma || '') + ' ' + (m.papel || '')).toLowerCase();
                    if (alvo.indexOf(filtro.busca.toLowerCase()) === -1) { return false; }
                }
                return true;
            });

            var html = UI.cabecalho('Membros das comissoes',
                'Alunos inscritos nas comissoes a que tens acesso.',
                (pode ? '<button class="btn-primario" data-acao="novo"><i data-lucide="user-plus" class="w-4 h-4"></i> Cadastrar membro</button>' : ''));

            html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">' +
                UI.estatistica('Total de membros', todos.length, 'users', 'indigo') +
                UI.estatistica('Ativos', todos.filter(function (m) { return m.status === 'ativo'; }).length, 'user-check', 'emerald') +
                UI.estatistica('Pendentes', todos.filter(function (m) { return m.status === 'pendente'; }).length, 'user-plus', 'amber') +
                UI.estatistica('Comissoes', Auth.comissoesVisiveis().length, 'users-round', 'sky') +
            '</div>';

            html += '<div class="bg-slate-850 border border-slate-700 rounded-2xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">' +
                '<input id="m-busca" type="search" value="' + UI.esc(filtro.busca) + '" placeholder="Procurar por nome, turma ou funcao..." class="campo">' +
                '<select id="m-comissao" class="campo">' +
                    '<option value="">Todas as comissoes</option>' +
                    Dados.opcoesComissoes().map(function (o) {
                        return '<option value="' + o.valor + '"' + (filtro.comissaoId === o.valor ? ' selected' : '') + '>' + UI.esc(o.rotulo) + '</option>';
                    }).join('') +
                '</select>' +
            '</div>';

            if (!lista.length) {
                return html + UI.cartao(UI.vazio('Nenhum membro encontrado.', 'users'));
            }

            html += '<div class="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm">' +
                '<thead><tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/60">' +
                    '<th class="px-5 py-3 font-semibold">Aluno</th>' +
                    '<th class="px-5 py-3 font-semibold">Comissao</th>' +
                    '<th class="px-5 py-3 font-semibold">Funcao</th>' +
                    '<th class="px-5 py-3 font-semibold">Situacao</th>' +
                    (pode ? '<th class="px-5 py-3 font-semibold text-right">Acoes</th>' : '') +
                '</tr></thead><tbody class="divide-y divide-slate-700/60">' +
                lista.map(function (m) {
                    var comissao = Store.encontrar('comissoes', m.comissaoId);
                    return '<tr class="hover:bg-slate-800/40 transition-all">' +
                        '<td class="px-5 py-3"><div class="flex items-center gap-3">' + UI.avatar(m.nome, 'sky') +
                            '<div class="min-w-0"><p class="text-white font-semibold truncate">' + UI.esc(m.nome) + '</p>' +
                            '<p class="text-[11px] text-slate-400 truncate">' + UI.esc(m.turma || '') + (m.email ? ' · ' + UI.esc(m.email) : '') + '</p></div></div></td>' +
                        '<td class="px-5 py-3 text-slate-300 text-xs">' + UI.esc(comissao ? comissao.nome : '—') +
                            '<p class="text-[11px] text-slate-500">' + UI.esc(comissao ? Dados.nomeFrente(comissao.frenteId) : '') + '</p></td>' +
                        '<td class="px-5 py-3 text-slate-300 text-xs">' + UI.esc(m.papel || '—') + '</td>' +
                        '<td class="px-5 py-3">' + UI.chip(m.status, CORES_ESTADO[m.status] || 'slate') + '</td>' +
                        (pode ? '<td class="px-5 py-3"><div class="flex gap-1 justify-end">' +
                            '<button class="btn-icone" data-acao="editar" data-id="' + m.id + '"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>' +
                            '<button class="btn-icone hover:text-rose-400" data-acao="eliminar" data-id="' + m.id + '"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>' +
                        '</div></td>' : '') +
                    '</tr>';
                }).join('') +
                '</tbody></table></div></div>';

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="novo"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }

            var busca = raiz.querySelector('#m-busca');
            if (busca) {
                var t;
                busca.addEventListener('input', function () {
                    clearTimeout(t);
                    t = setTimeout(function () {
                        filtro.busca = busca.value;
                        App.recarregar(function () {
                            var novo = document.querySelector('#m-busca');
                            if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
                        });
                    }, 350);
                });
            }
            var sel = raiz.querySelector('#m-comissao');
            if (sel) { sel.addEventListener('change', function () { filtro.comissaoId = sel.value; App.recarregar(); }); }

            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('membros', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('membros', el.getAttribute('data-id'))); });
            });
        }
    };
})(window);
