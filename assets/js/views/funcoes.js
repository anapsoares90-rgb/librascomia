/* ==================== Funcoes do painel (perfis) ======================= */
(function (global) {
    'use strict';

    function opcoesPermissoes() {
        return Store.PERMISSOES.map(function (p) {
            return { valor: p.chave, rotulo: '[' + p.grupo + '] ' + p.rotulo, ajuda: p.descricao };
        });
    }

    function formulario(funcao) {
        var edicao = !!funcao;
        UI.formulario({
            titulo: edicao ? 'Editar funcao do painel' : 'Cadastrar funcao do painel',
            subtitulo: 'Uma funcao define exatamente que paineis e acoes o coordenador vai encontrar quando entrar.',
            botao: edicao ? 'Guardar funcao' : 'Criar funcao',
            largura: 'max-w-2xl',
            campos: [
                { nome: 'nome', rotulo: 'Nome da funcao', tipo: 'text', valor: edicao ? funcao.nome : '', obrigatorio: true, placeholder: 'Ex.: Coordenador de Imprensa' },
                {
                    nome: 'escopo', rotulo: 'Ambito', tipo: 'select', largura: 'metade',
                    valor: edicao ? funcao.escopo : 'comissao',
                    opcoes: [
                        { valor: 'comissao', rotulo: 'Comissao (so o que lhe for atribuido)' },
                        { valor: 'frente', rotulo: 'Frente (todas as comissoes da frente)' },
                        { valor: 'global', rotulo: 'Global (toda a plataforma)' }
                    ]
                },
                { nome: 'descricao', rotulo: 'Descricao', tipo: 'text', valor: edicao ? funcao.descricao : '', largura: 'metade', placeholder: 'Para que serve esta funcao' },
                {
                    nome: 'permissoes', rotulo: 'Paineis e acoes libertados', tipo: 'checkboxes',
                    valor: edicao ? (funcao.permissoes || []) : ['postagens.criar', 'mensagens.enviar'],
                    opcoes: opcoesPermissoes(),
                    ajuda: '"Acesso total a plataforma" e exclusivo do Supra Admin.'
                }
            ],
            validar: function (d) {
                if (!d.permissoes.length) { return 'Escolhe pelo menos uma permissao para esta funcao.'; }
                return null;
            },
            aoGuardar: function (d) {
                if (edicao) {
                    Store.atualizar('funcoes', funcao.id, d);
                    Store.registar('Funcao atualizada', d.nome + ' (' + d.permissoes.length + ' permissoes)');
                    UI.toast('Funcao atualizada.', 'sucesso');
                } else {
                    d.sistema = false;
                    Store.inserir('funcoes', d);
                    Store.registar('Funcao criada', d.nome);
                    UI.toast('Funcao "' + d.nome + '" cadastrada.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function eliminar(funcao) {
        var emUso = Store.listar('usuarios').filter(function (u) { return u.funcaoId === funcao.id; });
        if (funcao.sistema) {
            UI.toast('As funcoes do sistema nao podem ser eliminadas.', 'aviso');
            return;
        }
        UI.confirmar({
            titulo: 'Eliminar funcao',
            mensagem: emUso.length
                ? 'Esta funcao esta atribuida a ' + emUso.length + ' coordenador(es). Muda-lhes a funcao antes de eliminar.'
                : 'Queres eliminar a funcao "' + funcao.nome + '"?',
            confirmar: emUso.length ? 'Compreendi' : 'Eliminar',
            aoConfirmar: function () {
                if (emUso.length) { return; }
                Store.remover('funcoes', funcao.id);
                Store.registar('Funcao eliminada', funcao.nome);
                UI.toast('Funcao eliminada.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.funcoes = {
        titulo: 'Funcoes do painel',
        formulario: formulario,
        render: function () {
            var funcoes = Store.listar('funcoes');
            var html = UI.cabecalho('Acessos', 'Funcoes do painel',
                'Cada coordenador recebe uma funcao. E a funcao que decide os paineis e as acoes que ele encontra ao entrar.',
                '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Cadastrar funcao</button>');

            html += '<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">' + funcoes.map(function (f) {
                var utilizadores = Store.listar('usuarios').filter(function (u) { return u.funcaoId === f.id; });
                var total = f.permissoes.indexOf('plataforma.total') !== -1;
                return '<section class="painel ' + UI.tom(total ? 'rose' : 'indigo') + '">' +
                    '<div class="painel__cabeca" style="align-items:flex-start">' +
                        '<div class="min-w-0">' +
                            '<div class="flex items-center gap-2 flex-wrap">' +
                                '<h3 class="titulo-painel">' + UI.esc(f.nome) + '</h3>' +
                                (f.sistema ? UI.pastilha('sistema', 'slate') : '') +
                                UI.pastilha(f.escopo, total ? 'rose' : 'indigo') +
                            '</div>' +
                            '<p class="nota" style="margin-top:.2rem">' + UI.esc(f.descricao || '') + '</p>' +
                        '</div>' +
                        '<div class="flex gap-1 shrink-0">' +
                            '<button class="btn btn--icone" data-acao="editar" data-id="' + f.id + '">' + UI.icone('pencil', 14) + '</button>' +
                            (f.sistema ? '' : '<button class="btn btn--icone perigo" data-acao="eliminar" data-id="' + f.id + '">' + UI.icone('trash-2', 14) + '</button>') +
                        '</div>' +
                    '</div>' +
                    '<div class="painel__corpo">' +
                        '<div class="flex flex-wrap gap-x-4 gap-y-1.5">' +
                            (total
                                ? UI.etiqueta('Acesso total a plataforma', 'rose')
                                : f.permissoes.map(function (chave) {
                                      var pm = Store.PERMISSOES.filter(function (x) { return x.chave === chave; })[0];
                                      return UI.etiqueta(pm ? pm.rotulo : chave, 'indigo');
                                  }).join('')) +
                        '</div>' +
                        '<div class="flex items-center justify-between gap-3 mt-4 pt-3 border-t" style="border-color:var(--linha)">' +
                            '<span class="nota">' + utilizadores.length + ' coordenador(es) com esta funcao</span>' +
                            '<div class="flex -space-x-1.5">' + utilizadores.slice(0, 5).map(function (u) {
                                return UI.avatar(u.nome, 'slate', 'pequeno');
                            }).join('') + '</div>' +
                        '</div>' +
                    '</div>' +
                '</section>';
            }).join('') + '</div>';

            html += '<div class="mt-4">' + UI.painel('Permissoes disponiveis',
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">' + Store.PERMISSOES.map(function (pm) {
                    return '<div class="flex gap-3">' +
                        '<span class="sobrancelha shrink-0" style="width:5.5rem;padding-top:.15rem">' + UI.esc(pm.grupo) + '</span>' +
                        '<div><p style="font-size:.8125rem;font-weight:500">' + UI.esc(pm.rotulo) + '</p>' +
                        '<p class="nota">' + UI.esc(pm.descricao) + '</p></div></div>';
                }).join('') + '</div>') + '</div>';

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }
            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('funcoes', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('funcoes', el.getAttribute('data-id'))); });
            });
        }
    };
})(window);
