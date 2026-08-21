/* ============================== Comissoes ============================== */
(function (global) {
    'use strict';

    function opcoesCoordenador() {
        var lista = Store.listar('usuarios').filter(function (u) { return u.perfil === 'admin' && u.ativo; });
        return [{ valor: '', rotulo: '— Sem coordenador atribuido —' }].concat(lista.map(function (u) {
            return { valor: u.id, rotulo: u.nome + ' (' + Dados.nomeFuncao(u.funcaoId) + ')' };
        }));
    }

    function formulario(comissao) {
        var edicao = !!comissao;
        var frentes = Dados.opcoesFrentes();
        if (!frentes.length) {
            UI.toast('Cria primeiro uma frente do Protagonismo.', 'aviso');
            return;
        }
        UI.formulario({
            titulo: edicao ? 'Editar comissao' : 'Nova comissao',
            subtitulo: 'Cada comissao pertence a uma frente e tem um coordenador responsavel pelo seu painel.',
            botao: edicao ? 'Guardar alteracoes' : 'Criar comissao',
            campos: [
                { nome: 'nome', rotulo: 'Nome da comissao', tipo: 'text', valor: edicao ? comissao.nome : '', obrigatorio: true, placeholder: 'Ex.: Conselho de Seguranca' },
                { nome: 'sigla', rotulo: 'Sigla', tipo: 'text', valor: edicao ? comissao.sigla : '', largura: 'metade', placeholder: 'Ex.: CS' },
                { nome: 'frenteId', rotulo: 'Frente', tipo: 'select', valor: edicao ? comissao.frenteId : frentes[0].valor, opcoes: frentes, obrigatorio: true, largura: 'metade' },
                { nome: 'descricao', rotulo: 'Descricao / objetivo', tipo: 'textarea', valor: edicao ? comissao.descricao : '', linhas: 3 },
                {
                    nome: 'coordenadorId', rotulo: 'Coordenador responsavel', tipo: 'select',
                    valor: edicao ? (comissao.coordenadorId || '') : '', opcoes: opcoesCoordenador(),
                    ajuda: 'So aparecem coordenadores ja cadastrados em "Coordenadores".'
                },
                { nome: 'ativo', rotulo: 'Comissao ativa', tipo: 'checkbox', valor: edicao ? comissao.ativo : true }
            ],
            aoGuardar: function (d) {
                d.coordenadorId = d.coordenadorId || null;
                if (edicao) {
                    Store.atualizar('comissoes', comissao.id, d);
                    Store.registar('Comissao atualizada', d.nome);
                    UI.toast('Comissao atualizada.', 'sucesso');
                } else {
                    var nova = Store.inserir('comissoes', d);
                    Store.registar('Comissao criada', d.nome + ' (' + Dados.nomeFrente(d.frenteId) + ')');
                    comissao = nova;
                    UI.toast('Comissao criada.', 'sucesso');
                }
                // Mantem o coordenador com acesso a comissao que passou a coordenar.
                if (d.coordenadorId) {
                    var alvo = Store.encontrar('usuarios', d.coordenadorId);
                    if (alvo) {
                        var ids = alvo.comissaoIds || [];
                        if (ids.indexOf(comissao.id) === -1) { ids.push(comissao.id); }
                        var fids = alvo.frenteIds || [];
                        if (fids.indexOf(d.frenteId) === -1) { fids.push(d.frenteId); }
                        Store.atualizar('usuarios', alvo.id, { comissaoIds: ids, frenteIds: fids });
                    }
                }
                App.recarregar();
            }
        });
    }

    function eliminar(comissao) {
        var membros = Store.listar('membros').filter(function (m) { return m.comissaoId === comissao.id; }).length;
        UI.confirmar({
            titulo: 'Eliminar comissao',
            mensagem: 'Ao eliminar "' + comissao.nome + '" perdes tambem o vinculo de ' + membros + ' membro(s). As postagens ficam sem comissao associada.',
            aoConfirmar: function () {
                Store.listar('membros').filter(function (m) { return m.comissaoId === comissao.id; })
                    .forEach(function (m) { Store.remover('membros', m.id); });
                Store.remover('comissoes', comissao.id);
                Store.registar('Comissao eliminada', comissao.nome);
                UI.toast('Comissao eliminada.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.comissoes = {
        titulo: 'Comissoes',
        formulario: formulario,
        render: function () {
            var pode = Auth.pode('comissoes.gerir');
            var comissoes = Auth.comissoesVisiveis();
            var frentes = Auth.frentesVisiveis();

            var html = UI.cabecalho('Comissoes',
                pode ? 'Cria comissoes, define objetivos e nomeia o coordenador de cada painel.'
                     : 'Comissoes a que tens acesso.',
                pode ? '<button class="btn-primario" data-acao="nova"><i data-lucide="plus" class="w-4 h-4"></i> Nova comissao</button>' : '');

            if (!comissoes.length) {
                return html + UI.cartao(UI.vazio('Ainda nao ha comissoes disponiveis para o teu acesso.', 'users-round'));
            }

            frentes.forEach(function (f) {
                var doGrupo = comissoes.filter(function (c) { return c.frenteId === f.id; });
                if (!doGrupo.length) { return; }
                html += '<div class="mb-6">' +
                    '<div class="flex items-center gap-2 mb-3">' +
                        '<span class="w-2.5 h-2.5 rounded-full ' + UI.cor(f.cor).ponto + '"></span>' +
                        '<h3 class="text-sm font-bold text-white">' + UI.esc(f.nome) + '</h3>' +
                        '<span class="text-xs text-slate-500">' + doGrupo.length + ' comissao(oes)</span>' +
                    '</div>' +
                    '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">' +
                    doGrupo.map(function (c) {
                        var coord = c.coordenadorId ? Store.encontrar('usuarios', c.coordenadorId) : null;
                        var membros = Store.listar('membros').filter(function (m) { return m.comissaoId === c.id; }).length;
                        var posts = Store.listar('postagens').filter(function (p) { return p.comissaoId === c.id; }).length;
                        return '<div class="bg-slate-850 border border-slate-700 rounded-2xl p-4 flex flex-col hover:border-slate-600 transition-all">' +
                            '<div class="flex items-start justify-between gap-2 mb-2">' +
                                '<div class="min-w-0">' +
                                    '<h4 class="font-bold text-white text-sm truncate">' + UI.esc(c.nome) + '</h4>' +
                                    '<p class="text-[11px] text-slate-500">' + UI.esc(c.sigla || '') + (c.ativo ? '' : ' · inativa') + '</p>' +
                                '</div>' +
                                (pode ? '<div class="flex gap-1 shrink-0">' +
                                    '<button class="btn-icone" data-acao="editar" data-id="' + c.id + '"><i data-lucide="pencil" class="w-3.5 h-3.5 pointer-events-none"></i></button>' +
                                    '<button class="btn-icone hover:text-rose-400" data-acao="eliminar" data-id="' + c.id + '"><i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i></button>' +
                                '</div>' : '') +
                            '</div>' +
                            '<p class="text-xs text-slate-400 flex-1 line-clamp-3">' + UI.esc(c.descricao || 'Sem descricao.') + '</p>' +
                            '<div class="mt-3 pt-3 border-t border-slate-700/60">' +
                                (coord
                                    ? '<div class="flex items-center gap-2">' + UI.avatar(coord.nome, f.cor, 'w-8 h-8 text-[11px]') +
                                      '<div class="min-w-0"><p class="text-xs text-white font-medium truncate">' + UI.esc(coord.nome) + '</p>' +
                                      '<p class="text-[10px] text-slate-400 truncate">' + UI.esc(Dados.nomeFuncao(coord.funcaoId)) + '</p></div></div>'
                                    : '<p class="text-xs text-amber-400 flex items-center gap-1.5"><i data-lucide="user-x" class="w-3.5 h-3.5"></i> Sem coordenador atribuido</p>') +
                                '<div class="flex gap-1.5 mt-3">' + UI.chip(membros + ' membros', 'slate', 'users') + UI.chip(posts + ' postagens', 'slate', 'megaphone') + '</div>' +
                            '</div>' +
                        '</div>';
                    }).join('') +
                    '</div></div>';
            });

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }
            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('comissoes', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('comissoes', el.getAttribute('data-id'))); });
            });
        }
    };
})(window);
