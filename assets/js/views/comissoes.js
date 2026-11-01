/* ============================== Comitês ============================== */
(function (global) {
    'use strict';

    function opcoesCoordenador() {
        var lista = Store.listar('usuarios').filter(function (u) { return u.perfil === 'admin' && u.ativo; });
        return [{ valor: '', rotulo: '— Sem coordenador atribuído —' }].concat(lista.map(function (u) {
            return { valor: u.id, rotulo: u.nome + ' (' + Dados.nomeFuncao(u.funcaoId) + ')' };
        }));
    }

    function formulario(comissao) {
        var edicao = !!comissao;
        var frentes = Dados.opcoesFrentes();
        if (!frentes.length) {
            UI.toast('Crie primeiro uma frente do Protagonismo.', 'aviso');
            return;
        }
        UI.formulario({
            titulo: edicao ? 'Editar comitê' : 'Novo comitê',
            subtitulo: 'Cada comitê pertence a uma frente e tem um coordenador responsável pelo seu painel.',
            botao: edicao ? 'Salvar alteracoes' : 'Criar comitê',
            campos: [
                { nome: 'nome', rotulo: 'Nome do comitê', tipo: 'text', valor: edicao ? comissao.nome : '', obrigatorio: true, placeholder: 'Ex.: Conselho de Segurança' },
                { nome: 'sigla', rotulo: 'Sigla', tipo: 'text', valor: edicao ? comissao.sigla : '', largura: 'metade', placeholder: 'Ex.: CS' },
                { nome: 'frenteId', rotulo: 'Frente', tipo: 'select', valor: edicao ? comissao.frenteId : frentes[0].valor, opcoes: frentes, obrigatorio: true, largura: 'metade' },
                { nome: 'descricao', rotulo: 'Descrição / objetivo', tipo: 'textarea', valor: edicao ? comissao.descricao : '', linhas: 3 },
                {
                    nome: 'coordenadorId', rotulo: 'Coordenador responsável', tipo: 'select',
                    valor: edicao ? (comissao.coordenadorId || '') : '', opcoes: opcoesCoordenador(),
                    ajuda: 'Só aparecem coordenadores já cadastrados em "Coordenadores".'
                },
                { nome: 'ativo', rotulo: 'Comitê ativa', tipo: 'checkbox', valor: edicao ? comissao.ativo : true }
            ],
            aoGuardar: function (d) {
                d.coordenadorId = d.coordenadorId || null;
                if (edicao) {
                    Store.atualizar('comissoes', comissao.id, d);
                    Store.registar('Comitê atualizado', d.nome);
                    UI.toast('Comitê atualizado.', 'sucesso');
                } else {
                    var nova = Store.inserir('comissoes', d);
                    Store.registar('Comitê criado', d.nome + ' (' + Dados.nomeFrente(d.frenteId) + ')');
                    comissao = nova;
                    UI.toast('Comitê criado.', 'sucesso');
                }
                // Mantem o coordenador com acesso o comitê que passou a coordenar.
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
            titulo: 'Excluir comitê',
            mensagem: 'Ao excluir "' + comissao.nome + '" perdes tambem o vinculo de ' + membros + ' membro(s). As postagens ficam sem comitê associada.',
            aoConfirmar: function () {
                Store.listar('membros').filter(function (m) { return m.comissaoId === comissao.id; })
                    .forEach(function (m) { Store.remover('membros', m.id); });
                Store.remover('comissoes', comissao.id);
                Store.registar('Comitê excluído', comissao.nome);
                UI.toast('Comitê excluído.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.comissoes = {
        titulo: 'Comitês',
        formulario: formulario,
        render: function () {
            var pode = Auth.pode('comissoes.gerir');
            var comissoes = Auth.comissoesVisiveis();
            var frentes = Auth.frentesVisiveis();

            var html = UI.cabecalho('Protagonismo', 'Comitês',
                pode ? 'Crie comitês, define objetivos e nomeia o coordenador de cada painel.'
                     : 'Comitês a que tem acesso.',
                pode ? '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Novo comitê</button>' : '');

            if (!comissoes.length) {
                return html + UI.painel('', UI.vazio('Ainda não ha comitês disponíveis para o seu acesso.', 'users-round'));
            }

            frentes.forEach(function (f) {
                var doGrupo = comissoes.filter(function (c) { return c.frenteId === f.id; });
                if (!doGrupo.length) { return; }
                html += '<div class="mb-6 ' + UI.tom(f.cor) + '">' +
                    '<div class="flex items-baseline gap-3 mb-3">' +
                        '<h3 class="titulo-painel">' + UI.esc(f.nome) + '</h3>' +
                        '<span class="nota">' + doGrupo.length + ' comitê(s)</span>' +
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
                                '<p class="texto-medio line-clamp-3" style="margin-top:.6rem">' + UI.esc(c.descricao || 'Sem descrição.') + '</p>' +
                            '</div>' +
                            '<div class="painel__corpo" style="border-top:1px solid var(--linha)">' +
                                (coord
                                    ? '<div class="flex items-center gap-2.5">' + UI.avatar(coord.nome, f.cor, 'pequeno') +
                                      '<div class="min-w-0"><p class="truncate" style="font-size:.75rem;font-weight:500">' + UI.esc(coord.nome) + '</p>' +
                                      '<p class="nota truncate">' + UI.esc(Dados.nomeFuncao(coord.funcaoId)) + '</p></div></div>'
                                    : '<p class="etiqueta tom-amber">Sem coordenador atribuído</p>') +
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
