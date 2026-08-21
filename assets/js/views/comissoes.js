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

            var html = UI.cabecalho('Protagonismo', 'Comissoes',
                pode ? 'Cria comissoes, define objetivos e nomeia o coordenador de cada painel.'
                     : 'Comissoes a que tens acesso.',
                pode ? '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Nova comissao</button>' : '');

            if (!comissoes.length) {
                return html + UI.painel('', UI.vazio('Ainda nao ha comissoes disponiveis para o teu acesso.', 'users-round'));
            }

            frentes.forEach(function (f) {
                var doGrupo = comissoes.filter(function (c) { return c.frenteId === f.id; });
                if (!doGrupo.length) { return; }
                html += '<div class="mb-6 ' + UI.tom(f.cor) + '">' +
                    '<div class="flex items-baseline gap-3 mb-3">' +
                        '<h3 class="titulo-painel">' + UI.esc(f.nome) + '</h3>' +
                        '<span class="nota">' + doGrupo.length + ' comissao(oes)</span>' +
                    '</div>' +
                    '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">' +
                    doGrupo.map(function (c) {
                        var coord = c.coordenadorId ? Store.encontrar('usuarios', c.coordenadorId) : null;
                        var membros = Store.listar('membros').filter(function (m) { return m.comissaoId === c.id; }).length;
                        var posts = Store.listar('postagens').filter(function (p) { return p.comissaoId === c.id; }).length;
                        return '<section class="painel h-full flex flex-col">' +
                            '<div class="painel__corpo flex-1">' +
                                '<div class="flex items-start justify-between gap-2">' +
                                    '<div class="min-w-0">' +
                                        '<h4 class="titulo-painel truncate">' + UI.esc(c.nome) + '</h4>' +
                                        '<p class="nota">' + UI.esc(c.sigla || '') + (c.ativo ? '' : ' · inativa') + '</p>' +
                                    '</div>' +
                                    (pode ? '<div class="flex gap-1 shrink-0">' +
                                        '<button class="btn btn--icone" data-acao="editar" data-id="' + c.id + '">' + UI.icone('pencil', 13) + '</button>' +
                                        '<button class="btn btn--icone perigo" data-acao="eliminar" data-id="' + c.id + '">' + UI.icone('trash-2', 13) + '</button>' +
                                    '</div>' : '') +
                                '</div>' +
                                '<p class="texto-medio line-clamp-3" style="margin-top:.6rem">' + UI.esc(c.descricao || 'Sem descricao.') + '</p>' +
                            '</div>' +
                            '<div class="painel__corpo" style="border-top:1px solid var(--linha)">' +
                                (coord
                                    ? '<div class="flex items-center gap-2.5">' + UI.avatar(coord.nome, f.cor, 'pequeno') +
                                      '<div class="min-w-0"><p class="truncate" style="font-size:.75rem;font-weight:500">' + UI.esc(coord.nome) + '</p>' +
                                      '<p class="nota truncate">' + UI.esc(Dados.nomeFuncao(coord.funcaoId)) + '</p></div></div>'
                                    : '<p class="etiqueta tom-amber">Sem coordenador atribuido</p>') +
                                '<div class="flex gap-x-4 mt-3">' +
                                    UI.etiqueta(membros + ' membros', 'slate') +
                                    UI.etiqueta(posts + ' postagens', 'slate') +
                                '</div>' +
                            '</div>' +
                        '</section>';
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
