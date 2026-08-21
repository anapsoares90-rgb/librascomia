/* ============================== Postagens ============================== */
(function (global) {
    'use strict';

    var filtro = { estado: '', comissaoId: '', visibilidade: '', busca: '' };

    /* --------------------------------------------------------------------- */
    function podeEditar(post) {
        var eu = Auth.usuarioAtual();
        if (!eu) { return false; }
        if (Auth.ehSupra()) { return true; }
        if (post.autorId === eu.id) { return true; }
        return Auth.pode('postagens.publicar') && Auth.veComissao(post.comissaoId);
    }

    function formulario(post) {
        var edicao = !!post;
        var eu = Auth.usuarioAtual();
        var comissoes = Dados.opcoesComissoes(null, '— Comunicado da frente (sem comissao) —');
        var frentes = Dados.opcoesFrentes();
        if (!frentes.length) { UI.toast('Sem frentes disponiveis para publicar.', 'aviso'); return; }

        UI.formulario({
            titulo: edicao ? 'Editar postagem' : 'Nova postagem',
            subtitulo: 'Postagens internas chegam aos membros da comissao. Postagens publicas so aparecem no portal depois de liberadas.',
            largura: 'max-w-3xl',
            botao: edicao ? 'Guardar postagem' : 'Criar postagem',
            campos: [
                { nome: 'titulo', rotulo: 'Titulo', tipo: 'text', valor: edicao ? post.titulo : '', obrigatorio: true },
                { nome: 'resumo', rotulo: 'Resumo (aparece na listagem)', tipo: 'text', valor: edicao ? post.resumo : '', obrigatorio: true },
                { nome: 'conteudo', rotulo: 'Conteudo', tipo: 'textarea', linhas: 7, valor: edicao ? post.conteudo : '', obrigatorio: true },
                {
                    nome: 'frenteId', rotulo: 'Frente', tipo: 'select', largura: 'metade', obrigatorio: true,
                    valor: edicao ? post.frenteId : (eu && eu.frenteIds && eu.frenteIds[0] ? eu.frenteIds[0] : frentes[0].valor),
                    opcoes: frentes
                },
                {
                    nome: 'comissaoId', rotulo: 'Comissao', tipo: 'select', largura: 'metade',
                    valor: edicao ? (post.comissaoId || '') : (eu && eu.comissaoIds && eu.comissaoIds[0] ? eu.comissaoIds[0] : ''),
                    opcoes: comissoes
                },
                {
                    nome: 'visibilidade', rotulo: 'Publico-alvo', tipo: 'select', largura: 'metade',
                    valor: edicao ? post.visibilidade : 'interno',
                    opcoes: [
                        { valor: 'interno', rotulo: 'Interno — membros cadastrados' },
                        { valor: 'publico', rotulo: 'Publico — portal da escola' }
                    ],
                    ajuda: Auth.pode('postagens.publicar') ? 'Podes liberar diretamente.' : 'As publicas ficam em analise ate a coordenacao liberar.'
                },
                { nome: 'tags', rotulo: 'Etiquetas (separadas por virgula)', tipo: 'text', largura: 'metade', valor: edicao ? (post.tags || []).join(', ') : '' },
                { nome: 'destaque', rotulo: 'Marcar como destaque no portal', tipo: 'checkbox', valor: edicao ? post.destaque : false }
            ],
            validar: function (d) {
                if (d.comissaoId && !Auth.veComissao(d.comissaoId)) { return 'Nao tens acesso a essa comissao.'; }
                return null;
            },
            aoGuardar: function (d) {
                var dados = {
                    titulo: d.titulo, resumo: d.resumo, conteudo: d.conteudo,
                    frenteId: d.frenteId, comissaoId: d.comissaoId || null,
                    visibilidade: d.visibilidade, destaque: d.destaque,
                    tags: d.tags ? d.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []
                };
                if (edicao) {
                    // Alterar uma postagem ja liberada volta a coloca-la em analise.
                    if (post.status === 'aprovado' && dados.visibilidade === 'publico' && !Auth.pode('postagens.publicar')) {
                        dados.status = 'pendente';
                        dados.publicadoEm = null;
                    }
                    Store.atualizar('postagens', post.id, dados);
                    Store.registar('Postagem editada', d.titulo);
                    UI.toast('Postagem atualizada.', 'sucesso');
                } else {
                    dados.autorId = eu ? eu.id : null;
                    dados.status = 'rascunho';
                    dados.publicadoEm = null;
                    Store.inserir('postagens', dados);
                    Store.registar('Postagem criada', d.titulo);
                    UI.toast('Postagem guardada como rascunho.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function mudarEstado(id, novoEstado) {
        var post = Store.encontrar('postagens', id);
        if (!post) { return; }
        var alteracoes = {
            status: novoEstado,
            publicadoEm: novoEstado === 'aprovado' ? Store.agora() : null
        };
        Store.atualizar('postagens', id, alteracoes);
        Store.registar('Postagem ' + Dados.estado(novoEstado).rotulo.toLowerCase(), post.titulo);
        var mensagens = {
            aprovado: 'Postagem liberada.',
            pendente: 'Enviada para liberacao da coordenacao.',
            rejeitado: 'Postagem devolvida ao autor.',
            rascunho: 'Postagem devolvida a rascunho.'
        };
        UI.toast(mensagens[novoEstado] || 'Estado atualizado.', 'sucesso');
        App.recarregar();
    }

    function eliminar(post) {
        UI.confirmar({
            titulo: 'Eliminar postagem',
            mensagem: 'Queres eliminar "' + post.titulo + '"?',
            aoConfirmar: function () {
                Store.remover('postagens', post.id);
                Store.registar('Postagem eliminada', post.titulo);
                UI.toast('Postagem eliminada.', 'sucesso');
                App.recarregar();
            }
        });
    }

    function ver(post) {
        var e = Dados.estado(post.status);
        UI.modal({
            titulo: post.titulo,
            subtitulo: Dados.nomeFrente(post.frenteId) + ' · ' + Dados.nomeComissao(post.comissaoId),
            largura: 'max-w-2xl',
            corpo:
                '<div class="flex flex-wrap gap-x-4 gap-y-2 mb-4">' +
                    UI.etiqueta(e.rotulo, e.cor, { forte: true }) +
                    UI.etiqueta(post.visibilidade === 'publico' ? 'Portal publico' : 'Interno', post.visibilidade === 'publico' ? 'sky' : 'slate') +
                    (post.destaque ? UI.etiqueta('Destaque', 'amber') : '') +
                '</div>' +
                '<p style="font-weight:500;margin-bottom:.9rem">' + UI.esc(post.resumo) + '</p>' +
                '<div class="corpo-texto corpo-texto--destacado">' + UI.nl2br(post.conteudo) + '</div>' +
                '<p class="nota" style="margin-top:1rem">Por ' + UI.esc(Dados.nomeUsuario(post.autorId)) + ' · criada ' + UI.haQuanto(post.criadoEm) +
                (post.publicadoEm ? ' · liberada em ' + UI.dataHora(post.publicadoEm) : '') + '</p>',
            rodape: '<button type="button" data-fechar="1" class="btn">Fechar</button>'
        });
    }

    /* --------------------------------------------------------------------- */
    function acoesDe(post) {
        var html = '<button class="btn btn--pequeno" data-acao="ver" data-id="' + post.id + '">Abrir</button>';
        if (!podeEditar(post)) { return html; }

        if (post.status === 'rascunho') {
            html += post.visibilidade === 'publico' && !Auth.pode('postagens.publicar')
                ? '<button class="btn btn--principal btn--pequeno" data-acao="estado" data-estado="pendente" data-id="' + post.id + '">Pedir liberacao</button>'
                : '<button class="btn btn--principal btn--pequeno" data-acao="estado" data-estado="aprovado" data-id="' + post.id + '">Publicar</button>';
        }
        if (post.status === 'pendente' && Auth.pode('postagens.publicar')) {
            html += '<button class="btn btn--principal btn--pequeno" data-acao="estado" data-estado="aprovado" data-id="' + post.id + '">Liberar</button>' +
                    '<button class="btn btn--pequeno" data-acao="estado" data-estado="rejeitado" data-id="' + post.id + '">Devolver</button>';
        }
        if (post.status === 'aprovado' && Auth.pode('postagens.publicar')) {
            html += '<button class="btn btn--pequeno" data-acao="estado" data-estado="rascunho" data-id="' + post.id + '">Retirar</button>';
        }
        if (post.status === 'rejeitado') {
            html += '<button class="btn btn--principal btn--pequeno" data-acao="estado" data-estado="pendente" data-id="' + post.id + '">Reenviar</button>';
        }
        html += '<button class="btn btn--icone" data-acao="editar" data-id="' + post.id + '">' + UI.icone('pencil', 13) + '</button>' +
                '<button class="btn btn--icone perigo" data-acao="eliminar" data-id="' + post.id + '">' + UI.icone('trash-2', 13) + '</button>';
        return html;
    }

    global.Views = global.Views || {};
    global.Views.postagens = {
        titulo: 'Postagens',
        formulario: formulario,
        mudarEstado: mudarEstado,
        render: function () {
            var todas = Dados.postagensVisiveis();
            var lista = todas.filter(function (p) {
                if (filtro.estado && p.status !== filtro.estado) { return false; }
                if (filtro.comissaoId && p.comissaoId !== filtro.comissaoId) { return false; }
                if (filtro.visibilidade && p.visibilidade !== filtro.visibilidade) { return false; }
                if (filtro.busca) {
                    var alvo = (p.titulo + ' ' + p.resumo + ' ' + (p.tags || []).join(' ')).toLowerCase();
                    if (alvo.indexOf(filtro.busca.toLowerCase()) === -1) { return false; }
                }
                return true;
            });

            var html = UI.cabecalho('Comunicacao', 'Postagens',
                Auth.ehSupra() ? 'Todas as postagens das comissoes, em qualquer estado.'
                               : 'As postagens da tua comissao e as ja liberadas no portal.',
                (Auth.pode('postagens.criar') ? '<button class="btn btn--principal" data-acao="nova">' + UI.icone('plus', 15) + ' Nova postagem</button>' : ''));

            html += UI.metricas([
                { rotulo: 'Total', valor: todas.length, tom: 'indigo' },
                { rotulo: 'Em analise', valor: todas.filter(function (p) { return p.status === 'pendente'; }).length, tom: 'amber' },
                { rotulo: 'Liberadas', valor: todas.filter(function (p) { return p.status === 'aprovado'; }).length, tom: 'emerald' },
                { rotulo: 'No portal publico', valor: todas.filter(function (p) { return p.status === 'aprovado' && p.visibilidade === 'publico'; }).length, tom: 'sky' }
            ]);

            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">' +
                '<input id="f-busca" type="search" value="' + UI.esc(filtro.busca) + '" placeholder="Procurar por titulo ou etiqueta..." class="campo">' +
                '<select id="f-estado" class="campo"><option value="">Todos os estados</option>' +
                    Object.keys(Dados.ESTADOS).map(function (k) {
                        return '<option value="' + k + '"' + (filtro.estado === k ? ' selected' : '') + '>' + Dados.ESTADOS[k].rotulo + '</option>';
                    }).join('') + '</select>' +
                '<select id="f-comissao" class="campo"><option value="">Todas as comissoes</option>' +
                    Dados.opcoesComissoes().map(function (o) {
                        return '<option value="' + o.valor + '"' + (filtro.comissaoId === o.valor ? ' selected' : '') + '>' + UI.esc(o.rotulo) + '</option>';
                    }).join('') + '</select>' +
                '<select id="f-visibilidade" class="campo">' +
                    '<option value="">Interno e publico</option>' +
                    '<option value="interno"' + (filtro.visibilidade === 'interno' ? ' selected' : '') + '>So internas</option>' +
                    '<option value="publico"' + (filtro.visibilidade === 'publico' ? ' selected' : '') + '>So publicas</option>' +
                '</select>' +
            '</div>';

            if (!lista.length) {
                return html + UI.painel('', UI.vazio('Nenhuma postagem corresponde a esta pesquisa.', 'file-search'));
            }

            html += UI.painel('', lista.map(function (p) {
                var e = Dados.estado(p.status);
                return '<article class="registo">' +
                    '<div class="min-w-0 flex-1">' +
                        '<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">' +
                            UI.etiqueta(e.rotulo, e.cor, { forte: true }) +
                            UI.etiqueta(p.visibilidade === 'publico' ? 'Publico' : 'Interno', p.visibilidade === 'publico' ? 'sky' : 'slate') +
                            (p.destaque ? UI.etiqueta('Destaque', 'amber') : '') +
                        '</div>' +
                        '<h3 style="font-weight:600;margin-top:.4rem">' + UI.esc(p.titulo) + '</h3>' +
                        '<p class="texto-medio line-clamp-2" style="margin-top:.15rem">' + UI.esc(p.resumo) + '</p>' +
                        '<p class="nota" style="margin-top:.4rem">' +
                            UI.esc(Dados.nomeFrente(p.frenteId)) + ' · ' + UI.esc(Dados.nomeComissao(p.comissaoId)) +
                            ' · ' + UI.esc(Dados.nomeUsuario(p.autorId)) + ' · ' + UI.haQuanto(p.criadoEm) +
                        '</p>' +
                    '</div>' +
                    '<div class="flex flex-wrap items-center gap-1.5 shrink-0">' + acoesDe(p) + '</div>' +
                '</article>';
            }).join(''), { semPadding: true });

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="nova"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }

            var busca = raiz.querySelector('#f-busca');
            if (busca) {
                var temporizador;
                busca.addEventListener('input', function () {
                    clearTimeout(temporizador);
                    temporizador = setTimeout(function () {
                        filtro.busca = busca.value;
                        App.recarregar(function () {
                            var novo = document.querySelector('#f-busca');
                            if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
                        });
                    }, 350);
                });
            }
            [['#f-estado', 'estado'], ['#f-comissao', 'comissaoId'], ['#f-visibilidade', 'visibilidade']].forEach(function (par) {
                var el = raiz.querySelector(par[0]);
                if (el) {
                    el.addEventListener('change', function () { filtro[par[1]] = el.value; App.recarregar(); });
                }
            });

            raiz.querySelectorAll('[data-acao="ver"]').forEach(function (el) {
                el.addEventListener('click', function () { ver(Store.encontrar('postagens', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="editar"]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(Store.encontrar('postagens', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="eliminar"]').forEach(function (el) {
                el.addEventListener('click', function () { eliminar(Store.encontrar('postagens', el.getAttribute('data-id'))); });
            });
            raiz.querySelectorAll('[data-acao="estado"]').forEach(function (el) {
                el.addEventListener('click', function () {
                    mudarEstado(el.getAttribute('data-id'), el.getAttribute('data-estado'));
                });
            });
        }
    };
})(window);
