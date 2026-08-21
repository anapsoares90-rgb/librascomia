/* ============================ Visao geral ============================== */
(function (global) {
    'use strict';

    function faixa() {
        var eu = Auth.usuarioAtual();
        var supra = Auth.ehSupra();
        var comissoes = Auth.comissoesVisiveis();
        var minhaComissao = comissoes.length === 1 ? comissoes[0].nome : null;

        var titulo = supra
            ? 'Coordenacao geral do Protagonismo'
            : 'Painel ' + (minhaComissao ? '— ' + minhaComissao : 'de coordenacao');

        var texto = supra
            ? 'Ves todas as frentes, todas as comissoes e todas as postagens. E daqui que se cadastram frentes, comissoes, funcoes do painel e coordenadores.'
            : 'Bem-vindo(a), ' + (eu ? eu.nome.split(' ')[0] : '') + '. Aqui geres a comunicacao interna da tua comissao e escreves as postagens que vao para o mural publico.';

        var dados = supra
            ? [
                { valor: Auth.frentesVisiveis().length, rotulo: 'Frentes' },
                { valor: comissoes.length, rotulo: 'Comissoes' },
                { valor: Store.listar('usuarios').filter(function (u) { return u.perfil === 'admin'; }).length, rotulo: 'Coordenadores' }
              ]
            : [
                { valor: Dados.membrosVisiveis().length, rotulo: 'Membros' },
                { valor: Dados.postagensVisiveis().length, rotulo: 'Postagens' },
                { valor: Dados.proximosEventos(30).length, rotulo: 'Na agenda' }
              ];

        return '<section class="faixa">' +
                    '<div class="faixa__marca">' + UI.icone(supra ? 'shield' : 'layout-panel-left', 190) + '</div>' +
                    '<p class="sobrancelha" style="color:rgba(255,255,255,.7)">' + (supra ? 'Supra Admin' : 'Administracao de comissao') + '</p>' +
                    '<h2 class="faixa__titulo" style="margin-top:.5rem">' + UI.esc(titulo) + '</h2>' +
                    '<p class="faixa__texto">' + UI.esc(texto) + '</p>' +
                    '<div class="faixa__pe">' + dados.map(function (d) {
                        return '<div class="faixa__dado"><b>' + d.valor + '</b><span>' + UI.esc(d.rotulo) + '</span></div>';
                    }).join('') + '</div>' +
                '</section>';
    }

    function blocoFrentes() {
        var frentes = Auth.frentesVisiveis();
        if (!frentes.length) { return UI.vazio('Ainda nao ha frentes atribuidas ao teu acesso.', 'layers'); }

        return '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + frentes.map(function (f) {
            var comissoes = Auth.comissoesVisiveis().filter(function (c) { return c.frenteId === f.id; });
            var posts = Dados.postagensVisiveis().filter(function (p) { return p.frenteId === f.id; });
            var eventos = Dados.eventosVisiveis().filter(function (e) { return e.frenteId === f.id && e.data >= UI.dataHoje(); });
            return '<a href="#/frentes" class="cartao-ligacao ' + UI.tom(f.cor) + '">' +
                        '<div class="flex items-start gap-3">' +
                            '<span class="selo-frente">' + UI.icone(f.icone || 'layers', 17) + '</span>' +
                            '<div class="min-w-0 flex-1">' +
                                '<p style="font-weight:600;font-size:.875rem">' + UI.esc(f.nome) + '</p>' +
                                '<p class="nota line-clamp-2" style="margin-top:.15rem">' + UI.esc(f.descricao) + '</p>' +
                                '<div class="flex flex-wrap gap-x-4 gap-y-1 mt-3">' +
                                    UI.etiqueta(comissoes.length + ' comissoes', f.cor) +
                                    UI.etiqueta(posts.length + ' postagens', 'slate') +
                                    UI.etiqueta(eventos.length + ' na agenda', 'slate') +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</a>';
        }).join('') + '</div>';
    }

    function blocoAgenda() {
        var eventos = Dados.proximosEventos(5);
        if (!eventos.length) { return UI.vazio('Sem eventos agendados para os proximos dias.', 'calendar-off'); }
        return '<ul class="lista">' + eventos.map(function (e) {
            var t = Dados.tipoEvento(e.tipo);
            return '<li class="flex items-center gap-3">' +
                        UI.dataBloco(e.data) +
                        '<div class="min-w-0 flex-1">' +
                            '<p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(e.titulo) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(e.hora || '') + (e.local ? ' · ' + UI.esc(e.local) : '') + ' · ' + UI.esc(Dados.nomeComissao(e.comissaoId)) + '</p>' +
                        '</div>' +
                        UI.etiqueta(t.rotulo, t.cor) +
                    '</li>';
        }).join('') + '</ul>';
    }

    function blocoMensagens() {
        var msgs = Dados.mensagensVisiveis().slice(0, 4);
        if (!msgs.length) { return UI.vazio('Nenhum comunicado recente.', 'message-square-off'); }
        return '<ul class="lista">' + msgs.map(function (m) {
            return '<li class="flex gap-3">' +
                        UI.avatar(Dados.nomeUsuario(m.autorId), m.prioridade === 'alta' ? 'rose' : 'indigo', 'pequeno') +
                        '<div class="min-w-0 flex-1">' +
                            '<div class="flex items-center gap-2 flex-wrap">' +
                                '<p class="truncate" style="font-size:.8125rem;font-weight:600">' + UI.esc(m.assunto) + '</p>' +
                                (m.prioridade === 'alta' ? UI.etiqueta('Urgente', 'rose', { forte: true, semPonto: true }) : '') +
                            '</div>' +
                            '<p class="nota line-clamp-2" style="margin-top:.1rem">' + UI.esc(m.corpo) + '</p>' +
                            '<p class="nota" style="margin-top:.3rem">' + UI.esc(Dados.nomeUsuario(m.autorId)) + ' · ' + UI.esc(Dados.destinatarios(m)) + ' · ' + UI.haQuanto(m.criadoEm) + '</p>' +
                        '</div>' +
                    '</li>';
        }).join('') + '</ul>';
    }

    function blocoPostagensRecentes() {
        var eu = Auth.usuarioAtual();
        var minhas = Auth.idsComissoesVisiveis();
        var posts = Dados.postagensVisiveis().filter(function (p) {
            return (eu && p.autorId === eu.id) || minhas.indexOf(p.comissaoId) !== -1;
        }).slice(0, 5);
        if (!posts.length) { return UI.vazio('Ainda nao escreveste nenhuma postagem.', 'file-plus'); }
        return '<ul class="lista">' + posts.map(function (p) {
            var e = Dados.estado(p.status);
            return '<li class="flex items-center gap-3">' +
                        '<div class="min-w-0 flex-1">' +
                            '<p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(p.titulo) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(Dados.nomeComissao(p.comissaoId)) + ' · ' + UI.haQuanto(p.criadoEm) + '</p>' +
                        '</div>' +
                        UI.etiqueta(e.rotulo, e.cor, { forte: true }) +
                    '</li>';
        }).join('') + '</ul>';
    }

    function blocoMembros() {
        var membros = Dados.membrosVisiveis().slice(0, 6);
        if (!membros.length) { return UI.vazio('Ainda nao ha membros cadastrados na tua comissao.', 'users'); }
        return '<ul class="lista">' + membros.map(function (m) {
            return '<li class="flex items-center gap-3">' +
                        UI.avatar(m.nome, 'sky', 'pequeno') +
                        '<div class="min-w-0 flex-1">' +
                            '<p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(m.nome) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(m.turma || '') + (m.papel ? ' · ' + UI.esc(m.papel) : '') + '</p>' +
                        '</div>' +
                        UI.etiqueta(m.status, m.status === 'ativo' ? 'emerald' : 'amber') +
                    '</li>';
        }).join('') + '</ul>';
    }

    function blocoPendentes() {
        var pendentes = Dados.postagensPendentes();
        if (!pendentes.length) {
            return '<p class="recado">' + UI.icone('check-check', 16) + ' Nao ha postagens a espera de liberacao.</p>';
        }
        return '<ul class="lista">' + pendentes.map(function (p) {
            return '<li class="flex items-center gap-3">' +
                        '<div class="min-w-0 flex-1">' +
                            '<p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(p.titulo) + '</p>' +
                            '<p class="nota truncate">' + UI.esc(Dados.nomeComissao(p.comissaoId)) + ' · ' + UI.esc(Dados.nomeUsuario(p.autorId)) + '</p>' +
                        '</div>' +
                        '<button class="btn btn--principal btn--pequeno" data-acao="liberar" data-id="' + p.id + '">Liberar</button>' +
                    '</li>';
        }).join('') + '</ul>';
    }

    global.Views = global.Views || {};
    global.Views.visao = {
        titulo: 'Visao geral',
        render: function () {
            var supra = Auth.ehSupra();
            var posts = Dados.postagensVisiveis();
            var pendentes = Dados.postagensPendentes();
            var eventos = Dados.eventosVisiveis().filter(function (e) { return e.data >= UI.dataHoje(); });

            var html = faixa();

            html += '<div class="mt-6">' + UI.metricas([
                { rotulo: supra ? 'Comissoes ativas' : 'As minhas comissoes', valor: Auth.comissoesVisiveis().length, tom: 'indigo', nota: Auth.frentesVisiveis().length + ' frente(s)' },
                { rotulo: 'Membros inscritos', valor: Dados.membrosVisiveis().length, tom: 'emerald' },
                { rotulo: 'Postagens', valor: posts.length, tom: 'sky', nota: pendentes.length + ' a aguardar liberacao' },
                { rotulo: 'Proximos eventos', valor: eventos.length, tom: 'violet', nota: 'nos proximos dias' }
            ]) + '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">';

            html += '<div class="lg:col-span-2 space-y-4">';

            if (supra) {
                html += UI.painel('Frentes do Protagonismo', blocoFrentes(), {
                    acao: '<a href="#/comissoes" class="ligacao">Ver comissoes</a>'
                });
            } else {
                html += UI.painel('As minhas postagens', blocoPostagensRecentes(), {
                    acao: (Auth.pode('postagens.criar') ? '<button class="ligacao" data-acao="nova-postagem">Nova postagem</button>' : '') 
                }) +
                UI.painel('Membros da comissao', blocoMembros(), {
                    acao: '<a href="#/membros" class="ligacao">Ver todos</a>'
                });
            }

            if (Auth.pode('postagens.publicar')) {
                html += UI.painel('A aguardar liberacao', blocoPendentes(), {
                    acao: pendentes.length ? UI.etiqueta(pendentes.length + ' em analise', 'amber', { forte: true, semPonto: true }) : ''
                });
            }
            html += '</div>';

            html += '<div class="space-y-4">' +
                        UI.painel('Proximos eventos', blocoAgenda(), { acao: '<a href="#/calendario" class="ligacao">Agenda</a>' }) +
                        UI.painel(supra ? 'Comunicados enviados' : 'Comunicados do Supra Admin', blocoMensagens(), { acao: '<a href="#/mensagens" class="ligacao">Abrir</a>' }) +
                    '</div>';

            html += '</div>';
            return html;
        },
        ligar: function (raiz) {
            var nova = raiz.querySelector('[data-acao="nova-postagem"]');
            if (nova) { nova.addEventListener('click', function () { Views.postagens.formulario(null); }); }

            raiz.querySelectorAll('[data-acao="liberar"]').forEach(function (b) {
                b.addEventListener('click', function () {
                    Views.postagens.mudarEstado(b.getAttribute('data-id'), 'aprovado');
                });
            });
        }
    };
})(window);
