/* ===================== Frentes do Protagonismo ========================= */
(function (global) {
    'use strict';

    var ICONES = ['globe', 'clapperboard', 'mic', 'book-open', 'palette', 'leaf', 'heart-handshake', 'trophy', 'music', 'flask-conical'];

    function formulario(frente) {
        var edicao = !!frente;
        UI.formulario({
            titulo: edicao ? 'Editar frente' : 'Nova frente do Protagonismo',
            subtitulo: 'As frentes agrupam comissoes (ex.: SIV — Simulado da ONU, Cine Club, Radio Escola).',
            botao: edicao ? 'Guardar alteracoes' : 'Criar frente',
            campos: [
                { nome: 'nome', rotulo: 'Nome da frente', tipo: 'text', valor: edicao ? frente.nome : '', obrigatorio: true, placeholder: 'Ex.: Cine Club' },
                { nome: 'sigla', rotulo: 'Sigla', tipo: 'text', valor: edicao ? frente.sigla : '', obrigatorio: true, largura: 'metade', placeholder: 'Ex.: CINE' },
                { nome: 'responsavel', rotulo: 'Responsavel', tipo: 'text', valor: edicao ? frente.responsavel : '', largura: 'metade', placeholder: 'Professor(a) ou coordenacao' },
                { nome: 'descricao', rotulo: 'Descricao', tipo: 'textarea', valor: edicao ? frente.descricao : '', linhas: 3, obrigatorio: true },
                {
                    nome: 'cor', rotulo: 'Cor de identificacao', tipo: 'select', largura: 'metade', valor: edicao ? frente.cor : 'indigo',
                    opcoes: Object.keys(UI.CORES).map(function (c) { return { valor: c, rotulo: c }; })
                },
                {
                    nome: 'icone', rotulo: 'Icone', tipo: 'select', largura: 'metade', valor: edicao ? frente.icone : 'layers',
                    opcoes: ICONES.map(function (i) { return { valor: i, rotulo: i }; })
                },
                { nome: 'ativo', rotulo: 'Frente ativa', tipo: 'checkbox', valor: edicao ? frente.ativo : true, ajuda: 'Frentes inativas deixam de aparecer no portal publico.' }
            ],
            aoGuardar: function (d) {
                if (edicao) {
                    Store.atualizar('frentes', frente.id, d);
                    Store.registar('Frente atualizada', d.nome);
                    UI.toast('Frente atualizada.', 'sucesso');
                } else {
                    Store.inserir('frentes', d);
                    Store.registar('Frente criada', d.nome);
                    UI.toast('Frente "' + d.nome + '" criada.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function eliminar(frente) {
        var comissoes = Store.listar('comissoes').filter(function (c) { return c.frenteId === frente.id; });
        UI.confirmar({
            titulo: 'Eliminar frente',
            mensagem: comissoes.length
                ? 'A frente "' + frente.nome + '" tem ' + comissoes.length + ' comissao(oes). Elimina primeiro as comissoes ou desativa a frente.'
                : 'Queres mesmo eliminar a frente "' + frente.nome + '"? Esta acao nao pode ser desfeita.',
            confirmar: comissoes.length ? 'Compreendi' : 'Eliminar',
            aoConfirmar: function () {
                if (comissoes.length) { return; }
                Store.remover('frentes', frente.id);
                Store.registar('Frente eliminada', frente.nome);
                UI.toast('Frente eliminada.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.frentes = {
        titulo: 'Frentes',
        formulario: formulario,
        render: function () {
            var pode = Auth.pode('frentes.gerir');
            var frentes = Auth.frentesVisiveis();

            var html = UI.cabecalho('Frentes do Protagonismo',
                pode ? 'Cadastra e administra todas as frentes: SIV, Cine Club e outras que venham a existir.'
                     : 'Frentes a que o teu perfil tem acesso.',
                pode ? '<button class="btn-primario" data-acao="nova"><i data-lucide="plus" class="w-4 h-4"></i> Nova frente</button>' : '');

            if (!frentes.length) {
                return html + UI.cartao(UI.vazio('Ainda nao existem frentes cadastradas.', 'layers'));
            }

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">' + frentes.map(function (f) {
                var comissoes = Auth.comissoesVisiveis().filter(function (c) { return c.frenteId === f.id; });
                var membros = Dados.membrosVisiveis().filter(function (m) {
                    return comissoes.some(function (c) { return c.id === m.comissaoId; });
                });
                var c = UI.cor(f.cor);
                return '<div class="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden">' +
                    '<div class="px-5 py-4 flex items-start gap-4 border-b border-slate-700">' +
                        '<div class="w-12 h-12 rounded-xl ' + c.solido + ' flex items-center justify-center shrink-0">' +
                            '<i data-lucide="' + UI.esc(f.icone || 'layers') + '" class="w-6 h-6 text-white"></i></div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<div class="flex items-center gap-2 flex-wrap">' +
                                '<h3 class="font-bold text-white">' + UI.esc(f.nome) + '</h3>' +
                                UI.chip(f.sigla, f.cor) +
                                (f.ativo ? '' : UI.chip('Inativa', 'slate')) +
                            '</div>' +
                            '<p class="text-xs text-slate-400 mt-1">' + UI.esc(f.descricao) + '</p>' +
                            (f.responsavel ? '<p class="text-[11px] text-slate-500 mt-1.5"><i data-lucide="user" class="w-3 h-3 inline"></i> ' + UI.esc(f.responsavel) + '</p>' : '') +
                        '</div>' +
                        (pode ? '<div class="flex gap-1 shrink-0">' +
                            '<button class="btn-icone" data-acao="editar" data-id="' + f.id + '" title="Editar"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>' +
                            '<button class="btn-icone hover:text-rose-400" data-acao="eliminar" data-id="' + f.id + '" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>' +
                        '</div>' : '') +
                    '</div>' +
                    '<div class="px-5 py-4">' +
                        '<div class="flex gap-4 mb-4">' +
                            '<div><p class="text-2xl font-bold text-white leading-none">' + comissoes.length + '</p><p class="text-[11px] text-slate-400 mt-1">Comissoes</p></div>' +
                            '<div><p class="text-2xl font-bold text-white leading-none">' + membros.length + '</p><p class="text-[11px] text-slate-400 mt-1">Membros</p></div>' +
                            '<div><p class="text-2xl font-bold text-white leading-none">' + Dados.postagensVisiveis().filter(function (p) { return p.frenteId === f.id; }).length + '</p><p class="text-[11px] text-slate-400 mt-1">Postagens</p></div>' +
                        '</div>' +
                        (comissoes.length
                            ? '<div class="flex flex-wrap gap-1.5">' + comissoes.map(function (co) {
                                  return '<a href="#/comissoes" class="text-[11px] bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-300 px-2.5 py-1 rounded-lg transition-all">' + UI.esc(co.nome) + '</a>';
                              }).join('') + '</div>'
                            : '<p class="text-xs text-slate-500">Sem comissoes cadastradas nesta frente.</p>') +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }
            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('frentes', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('frentes', el.getAttribute('data-id'))); });
            });
        }
    };
})(window);
