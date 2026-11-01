/* ==================== Funções do painel (perfis) ======================= */
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
            titulo: edicao ? 'Editar função do painel' : 'Cadastrar função do painel',
            subtitulo: 'Uma função define exatamente que painéis e ações o coordenador vai encontrar quando entrar.',
            botao: edicao ? 'Salvar função' : 'Criar função',
            largura: 'max-w-2xl',
            campos: [
                { nome: 'nome', rotulo: 'Nome da função', tipo: 'text', valor: edicao ? funcao.nome : '', obrigatorio: true, placeholder: 'Ex.: Coordenador de Imprensa' },
                {
                    nome: 'escopo', rotulo: 'Ambito', tipo: 'select', largura: 'metade',
                    valor: edicao ? funcao.escopo : 'comissao',
                    opcoes: [
                        { valor: 'comissao', rotulo: 'Comitê (só o que lhe for atribuído)' },
                        { valor: 'frente', rotulo: 'Frente (todos os comitês da frente)' },
                        { valor: 'global', rotulo: 'Global (toda a plataforma)' }
                    ]
                },
                { nome: 'descricao', rotulo: 'Descricao', tipo: 'text', valor: edicao ? funcao.descricao : '', largura: 'metade', placeholder: 'Para que serve esta função' },
                {
                    nome: 'permissoes', rotulo: 'Painéis e ações liberados', tipo: 'checkboxes',
                    valor: edicao ? (funcao.permissoes || []) : ['postagens.criar', 'mensagens.enviar'],
                    opcoes: opcoesPermissoes(),
                    ajuda: '"Acesso total a plataforma" e exclusivo do Supra Admin.'
                }
            ],
            validar: function (d) {
                if (!d.permissoes.length) { return 'Escolha pelo menos uma permissão para esta função.'; }
                return null;
            },
            aoGuardar: function (d) {
                if (edicao) {
                    Store.atualizar('funcoes', funcao.id, d);
                    Store.registar('Função atualizada', d.nome + ' (' + d.permissoes.length + ' permissões)');
                    UI.toast('Função atualizada.', 'sucesso');
                } else {
                    d.sistema = false;
                    Store.inserir('funcoes', d);
                    Store.registar('Função criada', d.nome);
                    UI.toast('Função "' + d.nome + '" cadastrada.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function eliminar(funcao) {
        var emUso = Store.listar('usuarios').filter(function (u) { return u.funcaoId === funcao.id; });
        if (funcao.sistema) {
            UI.toast('As funções do sistema não podem ser eliminadas.', 'aviso');
            return;
        }
        UI.confirmar({
            titulo: 'Excluir função',
            mensagem: emUso.length
                ? 'Esta função esta atribuída a ' + emUso.length + ' coordenador(es). Muda-lhes a função antes de excluir.'
                : 'Quer excluir a função "' + funcao.nome + '"?',
            confirmar: emUso.length ? 'Compreendi' : 'Eliminar',
            aoConfirmar: function () {
                if (emUso.length) { return; }
                Store.remover('funcoes', funcao.id);
                Store.registar('Função excluída', funcao.nome);
                UI.toast('Função excluída.', 'sucesso');
                App.recarregar();
            }
        });
    }

    global.Views = global.Views || {};
    global.Views.funcoes = {
        titulo: 'Funções do painel',
        formulario: formulario,
        render: function () {
            var funcoes = Store.listar('funcoes');
            var html = UI.cabecalho('Acessos', 'Funções do painel',
                'Cada coordenador recebe uma função. É a função que decide os painéis e as ações que ele encontra ao entrar.',
                '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Cadastrar função</button>');

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
                            '<span class="nota">' + utilizadores.length + ' coordenador(es) com esta função</span>' +
                            '<div class="flex -space-x-1.5">' + utilizadores.slice(0, 5).map(function (u) {
                                return UI.avatar(u.nome, 'slate', 'pequeno');
                            }).join('') + '</div>' +
                        '</div>' +
                    '</div>' +
                '</section>';
            }).join('') + '</div>';

            html += '<div class="mt-4">' + UI.painel('Permissões disponíveis',
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
