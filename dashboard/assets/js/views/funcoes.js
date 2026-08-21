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
            var html = UI.cabecalho('Funcoes do painel',
                'Cadastro dos perfis de acesso. Cada coordenador recebe uma funcao e so ve os paineis aqui libertados.',
                '<button class="btn-primario" data-acao="nova"><i data-lucide="plus" class="w-4 h-4"></i> Cadastrar funcao</button>');

            html += '<div class="grid grid-cols-1 xl:grid-cols-2 gap-5">' + funcoes.map(function (f) {
                var utilizadores = Store.listar('usuarios').filter(function (u) { return u.funcaoId === f.id; });
                var total = f.permissoes.indexOf('plataforma.total') !== -1;
                return '<div class="bg-slate-850 border border-slate-700 rounded-2xl p-5">' +
                    '<div class="flex items-start justify-between gap-3 mb-3">' +
                        '<div class="min-w-0">' +
                            '<div class="flex items-center gap-2 flex-wrap">' +
                                '<h3 class="font-bold text-white">' + UI.esc(f.nome) + '</h3>' +
                                (f.sistema ? UI.chip('Sistema', 'slate', 'lock') : '') +
                                UI.chip('Ambito: ' + UI.esc(f.escopo), total ? 'rose' : 'sky') +
                            '</div>' +
                            '<p class="text-xs text-slate-400 mt-1">' + UI.esc(f.descricao || '') + '</p>' +
                        '</div>' +
                        '<div class="flex gap-1 shrink-0">' +
                            '<button class="btn-icone" data-acao="editar" data-id="' + f.id + '"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>' +
                            (f.sistema ? '' : '<button class="btn-icone hover:text-rose-400" data-acao="eliminar" data-id="' + f.id + '"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>') +
                        '</div>' +
                    '</div>' +
                    '<div class="flex flex-wrap gap-1.5 mb-4">' +
                        (total
                            ? UI.chip('Acesso total a plataforma', 'rose', 'shield')
                            : f.permissoes.map(function (chave) {
                                  var p = Store.PERMISSOES.filter(function (x) { return x.chave === chave; })[0];
                                  return UI.chip(p ? p.rotulo : chave, 'indigo', 'check');
                              }).join('')) +
                    '</div>' +
                    '<div class="pt-3 border-t border-slate-700/60 flex items-center justify-between">' +
                        '<span class="text-[11px] text-slate-400">' + utilizadores.length + ' coordenador(es) com esta funcao</span>' +
                        '<div class="flex -space-x-2">' + utilizadores.slice(0, 5).map(function (u) {
                            return UI.avatar(u.nome, 'indigo', 'w-7 h-7 text-[10px] ring-2 ring-slate-850');
                        }).join('') + '</div>' +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';

            html += '<div class="mt-6 bg-slate-850 border border-slate-700 rounded-2xl p-5">' +
                '<h3 class="font-bold text-white text-sm mb-3 flex items-center gap-2"><i data-lucide="key-round" class="w-4 h-4 text-indigo-400"></i> Permissoes disponiveis</h3>' +
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' + Store.PERMISSOES.map(function (p) {
                    return '<div class="flex gap-3 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">' +
                        '<span class="text-[10px] font-bold uppercase text-slate-500 w-20 shrink-0 pt-0.5">' + UI.esc(p.grupo) + '</span>' +
                        '<div><p class="text-xs text-slate-200 font-medium">' + UI.esc(p.rotulo) + '</p>' +
                        '<p class="text-[11px] text-slate-400">' + UI.esc(p.descricao) + '</p></div></div>';
                }).join('') + '</div></div>';

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
