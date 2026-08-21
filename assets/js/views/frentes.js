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
                    opcoes: UI.TONS.map(function (c) { return { valor: c, rotulo: c }; })
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

            var html = UI.cabecalho('Protagonismo', 'Frentes',
                pode ? 'Cadastra e administra todas as frentes: SIV, Cine Club e outras que venham a existir.'
                     : 'Frentes a que o teu perfil tem acesso.',
                pode ? '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Nova frente</button>' : '');

            if (!frentes.length) {
                return html + UI.painel('', UI.vazio('Ainda nao existem frentes cadastradas.', 'layers'));
            }

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' + frentes.map(function (f) {
                var comissoes = Auth.comissoesVisiveis().filter(function (c) { return c.frenteId === f.id; });
                var membros = Dados.membrosVisiveis().filter(function (m) {
                    return comissoes.some(function (c) { return c.id === m.comissaoId; });
                });
                var posts = Dados.postagensVisiveis().filter(function (p) { return p.frenteId === f.id; });

                return '<section class="painel ' + UI.tom(f.cor) + '">' +
                    '<div class="painel__cabeca" style="align-items:flex-start">' +
                        '<div class="flex items-start gap-3 min-w-0">' +
                            '<span class="selo-frente">' + UI.icone(f.icone || 'layers', 18) + '</span>' +
                            '<div class="min-w-0">' +
                                '<div class="flex items-center gap-2 flex-wrap">' +
                                    '<h3 class="titulo-painel">' + UI.esc(f.nome) + '</h3>' +
                                    UI.pastilha(f.sigla, f.cor) +
                                    (f.ativo ? '' : UI.etiqueta('inativa', 'slate')) +
                                '</div>' +
                                '<p class="nota" style="margin-top:.2rem">' + UI.esc(f.descricao) + '</p>' +
                            '</div>' +
                        '</div>' +
                        (pode ? '<div class="flex gap-1 shrink-0">' +
                            '<button class="btn btn--icone" data-acao="editar" data-id="' + f.id + '" title="Editar">' + UI.icone('pencil', 14) + '</button>' +
                            '<button class="btn btn--icone perigo" data-acao="eliminar" data-id="' + f.id + '" title="Eliminar">' + UI.icone('trash-2', 14) + '</button>' +
                        '</div>' : '') +
                    '</div>' +
                    '<div class="painel__corpo">' +
                        '<div class="flex gap-8">' +
                            '<div><p class="numero" style="font-size:1.4rem">' + comissoes.length + '</p><p class="sobrancelha">Comissoes</p></div>' +
                            '<div><p class="numero" style="font-size:1.4rem">' + membros.length + '</p><p class="sobrancelha">Membros</p></div>' +
                            '<div><p class="numero" style="font-size:1.4rem">' + posts.length + '</p><p class="sobrancelha">Postagens</p></div>' +
                        '</div>' +
                        (f.responsavel ? '<p class="nota" style="margin-top:.9rem">Responsavel: ' + UI.esc(f.responsavel) + '</p>' : '') +
                        (comissoes.length
                            ? '<div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style="border-color:var(--linha)">' + comissoes.map(function (co) {
                                  return '<a href="#/comissoes" class="etiqueta etiqueta--contorno ' + UI.tom(f.cor) + '">' + UI.esc(co.nome) + '</a>';
                              }).join('') + '</div>'
                            : '<p class="nota" style="margin-top:.9rem">Sem comissoes cadastradas nesta frente.</p>') +
                    '</div>' +
                '</section>';
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
