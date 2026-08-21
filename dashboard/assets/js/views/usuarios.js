/* ======================= Coordenadores (acessos) ======================= */
(function (global) {
    'use strict';

    function formulario(usuario) {
        var edicao = !!usuario;
        var funcoes = Store.listar('funcoes').filter(function (f) { return f.id !== 'fun_supra'; });
        var todasFrentes = Store.listar('frentes');
        var todasComissoes = Store.listar('comissoes');

        UI.formulario({
            titulo: edicao ? 'Editar acesso de coordenador' : 'Adicionar coordenador',
            subtitulo: 'Define a funcao do painel e exatamente que frentes e comissoes este coordenador pode ver.',
            largura: 'max-w-3xl',
            botao: edicao ? 'Guardar acesso' : 'Criar acesso',
            campos: [
                { nome: 'nome', rotulo: 'Nome completo', tipo: 'text', valor: edicao ? usuario.nome : '', obrigatorio: true },
                { nome: 'cargo', rotulo: 'Cargo / titulo', tipo: 'text', valor: edicao ? usuario.cargo : '', largura: 'metade', placeholder: 'Ex.: Coordenador de Imprensa' },
                { nome: 'email', rotulo: 'E-mail de acesso', tipo: 'email', valor: edicao ? usuario.email : '', obrigatorio: true, largura: 'metade' },
                { nome: 'senha', rotulo: edicao ? 'Palavra-passe (deixa vazio para manter)' : 'Palavra-passe inicial', tipo: 'text', valor: '', obrigatorio: !edicao, largura: 'metade', placeholder: edicao ? '••••••' : 'Ex.: siv2026' },
                {
                    nome: 'funcaoId', rotulo: 'Funcao do painel', tipo: 'select', largura: 'metade', obrigatorio: true,
                    valor: edicao ? usuario.funcaoId : (funcoes[0] ? funcoes[0].id : ''),
                    opcoes: funcoes.map(function (f) { return { valor: f.id, rotulo: f.nome + ' — ' + f.permissoes.length + ' permissoes' }; }),
                    ajuda: 'A funcao determina os paineis visiveis. Cadastra novas funcoes em "Funcoes do painel".'
                },
                {
                    nome: 'frenteIds', rotulo: 'Frentes libertadas', tipo: 'checkboxes',
                    valor: edicao ? (usuario.frenteIds || []) : [],
                    opcoes: todasFrentes.map(function (f) { return { valor: f.id, rotulo: f.nome, ajuda: 'Da acesso a todas as comissoes desta frente.' }; })
                },
                {
                    nome: 'comissaoIds', rotulo: 'Comissoes libertadas', tipo: 'checkboxes',
                    valor: edicao ? (usuario.comissaoIds || []) : [],
                    opcoes: todasComissoes.map(function (c) {
                        return { valor: c.id, rotulo: Dados.siglaFrente(c.frenteId) + ' · ' + c.nome };
                    })
                },
                { nome: 'ativo', rotulo: 'Acesso ativo', tipo: 'checkbox', valor: edicao ? usuario.ativo : true, ajuda: 'Desativa para bloquear o inicio de sessao sem apagar o historico.' }
            ],
            validar: function (d) {
                var repetido = Store.listar('usuarios').filter(function (u) {
                    return u.email.toLowerCase() === d.email.toLowerCase() && (!edicao || u.id !== usuario.id);
                });
                if (repetido.length) { return 'Ja existe uma conta com esse e-mail.'; }
                if (!d.frenteIds.length && !d.comissaoIds.length) { return 'Liberta pelo menos uma frente ou comissao para este coordenador.'; }
                return null;
            },
            aoGuardar: function (d) {
                var dados = {
                    nome: d.nome, cargo: d.cargo, email: d.email, funcaoId: d.funcaoId,
                    frenteIds: d.frenteIds, comissaoIds: d.comissaoIds, ativo: d.ativo, perfil: 'admin'
                };
                if (d.senha) { dados.senha = d.senha; }
                if (edicao) {
                    Store.atualizar('usuarios', usuario.id, dados);
                    Store.registar('Acesso atualizado', d.nome + ' — ' + Dados.nomeFuncao(d.funcaoId));
                    UI.toast('Acesso atualizado.', 'sucesso');
                } else {
                    dados.ultimoAcesso = null;
                    var novo = Store.inserir('usuarios', dados);
                    Store.registar('Coordenador adicionado', d.nome + ' — ' + Dados.nomeFuncao(d.funcaoId));
                    UI.toast('Coordenador criado. Entrega-lhe o e-mail e a palavra-passe.', 'sucesso');
                    // Se so tem uma comissao e ela esta sem coordenador, assume-a.
                    if (d.comissaoIds.length === 1) {
                        var c = Store.encontrar('comissoes', d.comissaoIds[0]);
                        if (c && !c.coordenadorId) { Store.atualizar('comissoes', c.id, { coordenadorId: novo.id }); }
                    }
                }
                App.recarregar();
            }
        });
    }

    function eliminar(usuario) {
        UI.confirmar({
            titulo: 'Remover coordenador',
            mensagem: 'Queres remover o acesso de "' + usuario.nome + '"? As postagens que criou continuam na plataforma.',
            confirmar: 'Remover acesso',
            aoConfirmar: function () {
                Store.listar('comissoes').filter(function (c) { return c.coordenadorId === usuario.id; })
                    .forEach(function (c) { Store.atualizar('comissoes', c.id, { coordenadorId: null }); });
                Store.remover('usuarios', usuario.id);
                Store.registar('Coordenador removido', usuario.nome);
                UI.toast('Acesso removido.', 'sucesso');
                App.recarregar();
            }
        });
    }

    function verAcesso(usuario) {
        var funcao = Store.encontrar('funcoes', usuario.funcaoId);
        var comissoes = Store.listar('comissoes').filter(function (c) {
            return (usuario.comissaoIds || []).indexOf(c.id) !== -1 || (usuario.frenteIds || []).indexOf(c.frenteId) !== -1;
        });
        UI.modal({
            titulo: 'Painel de ' + usuario.nome,
            subtitulo: 'Isto e exatamente o que este coordenador ve ao entrar.',
            largura: 'max-w-xl',
            corpo:
                '<div class="space-y-4">' +
                    '<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4">' +
                        '<p class="text-[11px] uppercase font-bold text-slate-400 mb-2">Funcao atribuida</p>' +
                        '<p class="text-sm text-white font-semibold">' + UI.esc(funcao ? funcao.nome : '—') + '</p>' +
                        '<p class="text-xs text-slate-400 mt-1">' + UI.esc(funcao ? funcao.descricao : '') + '</p>' +
                    '</div>' +
                    '<div>' +
                        '<p class="text-[11px] uppercase font-bold text-slate-400 mb-2">Paineis visiveis</p>' +
                        '<div class="flex flex-wrap gap-1.5">' + (funcao ? funcao.permissoes.map(function (chave) {
                            var p = Store.PERMISSOES.filter(function (x) { return x.chave === chave; })[0];
                            return UI.chip(p ? p.rotulo : chave, 'indigo', 'check');
                        }).join('') : '') + '</div>' +
                    '</div>' +
                    '<div>' +
                        '<p class="text-[11px] uppercase font-bold text-slate-400 mb-2">Comissoes que consegue ver (' + comissoes.length + ')</p>' +
                        (comissoes.length
                            ? '<ul class="space-y-1.5">' + comissoes.map(function (c) {
                                  return '<li class="text-xs text-slate-300 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">' +
                                         UI.esc(Dados.nomeFrente(c.frenteId)) + ' · <span class="text-white font-medium">' + UI.esc(c.nome) + '</span></li>';
                              }).join('') + '</ul>'
                            : '<p class="text-xs text-amber-400">Nenhuma comissao libertada.</p>') +
                    '</div>' +
                    '<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4">' +
                        '<p class="text-[11px] uppercase font-bold text-slate-400 mb-1">Credenciais</p>' +
                        '<p class="text-xs text-slate-300">E-mail: <span class="text-white font-mono">' + UI.esc(usuario.email) + '</span></p>' +
                        '<p class="text-xs text-slate-300 mt-1">Ultimo acesso: ' + UI.esc(usuario.ultimoAcesso ? UI.dataHora(usuario.ultimoAcesso) : 'ainda nao entrou') + '</p>' +
                    '</div>' +
                '</div>',
            rodape: '<button type="button" data-fechar="1" class="btn-secundario">Fechar</button>'
        });
    }

    global.Views = global.Views || {};
    global.Views.usuarios = {
        titulo: 'Coordenadores',
        formulario: formulario,
        render: function () {
            var usuarios = Store.listar('usuarios');
            var html = UI.cabecalho('Coordenadores e acessos',
                'Adiciona os coordenadores de cada comissao e atribui a funcao e o painel a que terao acesso.',
                '<button class="btn-primario" data-acao="novo"><i data-lucide="user-plus" class="w-4 h-4"></i> Adicionar coordenador</button>');

            html += '<div class="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden">' +
                '<div class="overflow-x-auto"><table class="w-full text-sm">' +
                '<thead><tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/60">' +
                    '<th class="px-5 py-3 font-semibold">Coordenador</th>' +
                    '<th class="px-5 py-3 font-semibold">Funcao do painel</th>' +
                    '<th class="px-5 py-3 font-semibold">Acesso libertado</th>' +
                    '<th class="px-5 py-3 font-semibold">Estado</th>' +
                    '<th class="px-5 py-3 font-semibold text-right">Acoes</th>' +
                '</tr></thead><tbody class="divide-y divide-slate-700/60">' +
                usuarios.map(function (u) {
                    var frentes = (u.frenteIds || []).map(Dados.nomeFrente);
                    var comissoes = (u.comissaoIds || []).map(Dados.nomeComissao);
                    var supra = u.perfil === 'supra';
                    return '<tr class="hover:bg-slate-800/40 transition-all">' +
                        '<td class="px-5 py-3">' +
                            '<div class="flex items-center gap-3">' + UI.avatar(u.nome, supra ? 'rose' : 'indigo') +
                            '<div class="min-w-0"><p class="text-white font-semibold truncate">' + UI.esc(u.nome) + '</p>' +
                            '<p class="text-[11px] text-slate-400 truncate">' + UI.esc(u.email) + '</p></div></div>' +
                        '</td>' +
                        '<td class="px-5 py-3">' +
                            UI.chip(Dados.nomeFuncao(u.funcaoId), supra ? 'rose' : 'sky', supra ? 'shield' : 'id-card') +
                            (u.cargo ? '<p class="text-[11px] text-slate-400 mt-1">' + UI.esc(u.cargo) + '</p>' : '') +
                        '</td>' +
                        '<td class="px-5 py-3 text-xs text-slate-300 max-w-xs">' +
                            (supra ? '<span class="text-rose-300">Toda a plataforma</span>'
                                   : (frentes.concat(comissoes).length
                                        ? UI.esc(frentes.concat(comissoes).join(' · '))
                                        : '<span class="text-amber-400">Sem acesso atribuido</span>')) +
                        '</td>' +
                        '<td class="px-5 py-3">' + (u.ativo ? UI.chip('Ativo', 'emerald', 'circle-check') : UI.chip('Desativado', 'slate', 'circle-slash')) + '</td>' +
                        '<td class="px-5 py-3">' +
                            '<div class="flex gap-1 justify-end">' +
                                '<button class="btn-icone" data-acao="ver" data-id="' + u.id + '" title="Ver painel"><i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i></button>' +
                                (supra ? '' :
                                    '<button class="btn-icone" data-acao="editar" data-id="' + u.id + '" title="Editar"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>' +
                                    '<button class="btn-icone" data-acao="alternar" data-id="' + u.id + '" title="Ativar/desativar"><i data-lucide="power" class="w-4 h-4 pointer-events-none"></i></button>' +
                                    '<button class="btn-icone hover:text-rose-400" data-acao="eliminar" data-id="' + u.id + '" title="Remover"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>') +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                }).join('') +
                '</tbody></table></div></div>';

            var semCoord = Store.listar('comissoes').filter(function (c) { return !c.coordenadorId; });
            if (semCoord.length) {
                html += '<div class="mt-5 bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 flex gap-3">' +
                    '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400 shrink-0"></i>' +
                    '<div><p class="text-sm text-amber-200 font-semibold">' + semCoord.length + ' comissao(oes) sem coordenador</p>' +
                    '<p class="text-xs text-amber-200/70 mt-0.5">' + UI.esc(semCoord.map(function (c) { return c.nome; }).join(', ')) + '</p></div></div>';
            }
            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="novo"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }
            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('usuarios', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="ver"]').forEach(function (el) {
                el.addEventListener('click', function () { verAcesso(Store.encontrar('usuarios', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('usuarios', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="alternar"]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var u = Store.encontrar('usuarios', el.getAttribute('data-id'));
                    Store.atualizar('usuarios', u.id, { ativo: !u.ativo });
                    Store.registar(u.ativo ? 'Acesso desativado' : 'Acesso reativado', u.nome);
                    UI.toast(u.ativo ? 'Acesso desativado.' : 'Acesso reativado.', 'sucesso');
                    App.recarregar();
                });
            });
        }
    };
})(window);
