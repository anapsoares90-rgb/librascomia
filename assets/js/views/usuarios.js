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
                '<div class="space-y-5">' +
                    '<div>' +
                        '<p class="sobrancelha">Funcao atribuida</p>' +
                        '<p style="font-weight:600;margin-top:.3rem">' + UI.esc(funcao ? funcao.nome : '—') + '</p>' +
                        '<p class="nota">' + UI.esc(funcao ? funcao.descricao : '') + '</p>' +
                    '</div>' +
                    '<div>' +
                        '<p class="sobrancelha">Paineis visiveis</p>' +
                        '<div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">' + (funcao ? funcao.permissoes.map(function (chave) {
                            var pm = Store.PERMISSOES.filter(function (x) { return x.chave === chave; })[0];
                            return UI.etiqueta(pm ? pm.rotulo : chave, 'indigo');
                        }).join('') : '') + '</div>' +
                    '</div>' +
                    '<div>' +
                        '<p class="sobrancelha">Comissoes que consegue ver (' + comissoes.length + ')</p>' +
                        (comissoes.length
                            ? '<ul class="lista mt-2">' + comissoes.map(function (c) {
                                  return '<li style="font-size:.8125rem">' + UI.esc(Dados.nomeFrente(c.frenteId)) +
                                         ' · <b>' + UI.esc(c.nome) + '</b></li>';
                              }).join('') + '</ul>'
                            : '<p class="etiqueta tom-amber" style="margin-top:.4rem">Nenhuma comissao libertada.</p>') +
                    '</div>' +
                    '<div class="corpo-texto--destacado">' +
                        '<p class="sobrancelha">Credenciais</p>' +
                        '<p class="texto-medio" style="margin-top:.3rem">' + UI.esc(usuario.email) + '</p>' +
                        '<p class="nota">Ultimo acesso: ' + UI.esc(usuario.ultimoAcesso ? UI.dataHora(usuario.ultimoAcesso) : 'ainda nao entrou') + '</p>' +
                    '</div>' +
                '</div>',
            rodape: '<button type="button" data-fechar="1" class="btn">Fechar</button>'
        });
    }

    global.Views = global.Views || {};
    global.Views.usuarios = {
        titulo: 'Coordenadores',
        formulario: formulario,
        render: function () {
            var usuarios = Store.listar('usuarios');
            var html = UI.cabecalho('Acessos', 'Coordenadores',
                'Adiciona os coordenadores de cada comissao e atribui a funcao e o painel a que terao acesso.',
                '<button class="btn btn--principal" data-acao="novo">' + UI.icone('user-plus', 15) + ' Adicionar coordenador</button>');

            html += UI.painel('', '<div class="overflow-x-auto"><table class="tabela">' +
                '<thead><tr>' +
                    '<th>Coordenador</th><th>Funcao do painel</th><th>Acesso libertado</th><th>Estado</th><th class="text-right">Acoes</th>' +
                '</tr></thead><tbody>' +
                usuarios.map(function (u) {
                    var frentes = (u.frenteIds || []).map(Dados.nomeFrente);
                    var comissoes = (u.comissaoIds || []).map(Dados.nomeComissao);
                    var supra = u.perfil === 'supra';
                    return '<tr>' +
                        '<td>' +
                            '<div class="flex items-center gap-3">' + UI.avatar(u.nome, supra ? 'violet' : 'indigo') +
                            '<div class="min-w-0"><p class="truncate" style="font-weight:500">' + UI.esc(u.nome) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(u.email) + '</p></div></div>' +
                        '</td>' +
                        '<td>' + UI.etiqueta(Dados.nomeFuncao(u.funcaoId), supra ? 'violet' : 'indigo') +
                            (u.cargo ? '<p class="nota" style="margin-top:.2rem">' + UI.esc(u.cargo) + '</p>' : '') + '</td>' +
                        '<td class="texto-medio" style="max-width:20rem">' +
                            (supra ? 'Toda a plataforma'
                                   : (frentes.concat(comissoes).length
                                        ? UI.esc(frentes.concat(comissoes).join(' · '))
                                        : '<span class="etiqueta tom-amber">Sem acesso atribuido</span>')) +
                        '</td>' +
                        '<td>' + (u.ativo ? UI.etiqueta('Ativo', 'emerald') : UI.etiqueta('Desativado', 'slate')) + '</td>' +
                        '<td>' +
                            '<div class="registo__acoes">' +
                                '<button class="btn btn--icone" data-acao="ver" data-id="' + u.id + '" title="Ver painel">' + UI.icone('eye', 14) + '</button>' +
                                (supra ? '' :
                                    '<button class="btn btn--icone" data-acao="editar" data-id="' + u.id + '" title="Editar">' + UI.icone('pencil', 14) + '</button>' +
                                    '<button class="btn btn--icone" data-acao="alternar" data-id="' + u.id + '" title="Ativar/desativar">' + UI.icone('power', 14) + '</button>' +
                                    '<button class="btn btn--icone perigo" data-acao="eliminar" data-id="' + u.id + '" title="Remover">' + UI.icone('trash-2', 14) + '</button>') +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                }).join('') +
                '</tbody></table></div>', { semPadding: true });

            var semCoord = Store.listar('comissoes').filter(function (c) { return !c.coordenadorId; });
            if (semCoord.length) {
                html += '<div class="mt-4">' + UI.aviso(
                    '<p style="font-weight:500">' + semCoord.length + ' comissao(oes) ainda sem coordenador</p>' +
                    '<p class="nota">' + UI.esc(semCoord.map(function (c) { return c.nome; }).join(', ')) + '</p>', 'amber') + '</div>';
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
