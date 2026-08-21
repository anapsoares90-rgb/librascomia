/* ============================ Visao geral ============================== */
(function (global) {
    'use strict';

    function saudacao() {
        var h = new Date().getHours();
        if (h < 12) { return 'Bom dia'; }
        if (h < 19) { return 'Boa tarde'; }
        return 'Boa noite';
    }

    function blocoFrentes() {
        var frentes = Auth.frentesVisiveis();
        if (!frentes.length) { return UI.vazio('Ainda nao ha frentes atribuidas ao teu acesso.', 'layers'); }

        return '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' + frentes.map(function (f) {
            var comissoes = Auth.comissoesVisiveis().filter(function (c) { return c.frenteId === f.id; });
            var posts = Dados.postagensVisiveis().filter(function (p) { return p.frenteId === f.id; });
            var eventos = Dados.eventosVisiveis().filter(function (e) { return e.frenteId === f.id && e.data >= UI.dataHoje(); });
            var c = UI.cor(f.cor);
            return '<a href="#/frentes" class="block bg-slate-850 border border-slate-700 rounded-2xl p-4 hover:border-indigo-500/50 transition-all group">' +
                        '<div class="flex items-start gap-3">' +
                            '<div class="w-11 h-11 rounded-xl ' + c.solido + ' flex items-center justify-center shrink-0">' +
                                '<i data-lucide="' + UI.esc(f.icone || 'layers') + '" class="w-5 h-5 text-white"></i>' +
                            '</div>' +
                            '<div class="min-w-0 flex-1">' +
                                '<h4 class="font-bold text-white text-sm group-hover:text-indigo-300 transition-all">' + UI.esc(f.nome) + '</h4>' +
                                '<p class="text-xs text-slate-400 mt-0.5 line-clamp-2">' + UI.esc(f.descricao) + '</p>' +
                                '<div class="flex flex-wrap gap-1.5 mt-3">' +
                                    UI.chip(comissoes.length + ' comissoes', f.cor, 'users') +
                                    UI.chip(posts.length + ' postagens', 'slate', 'megaphone') +
                                    UI.chip(eventos.length + ' na agenda', 'slate', 'calendar') +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</a>';
        }).join('') + '</div>';
    }

    function blocoAgenda() {
        var eventos = Dados.proximosEventos(5);
        if (!eventos.length) { return UI.vazio('Sem eventos agendados para os proximos dias.', 'calendar-off'); }
        return '<ul class="divide-y divide-slate-700/60">' + eventos.map(function (e) {
            var t = Dados.tipoEvento(e.tipo);
            var d = new Date(e.data + 'T00:00:00');
            return '<li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">' +
                        '<div class="w-12 shrink-0 text-center bg-slate-800 border border-slate-700 rounded-lg py-1">' +
                            '<div class="text-[10px] uppercase text-slate-400 font-bold">' + UI.MESES[d.getMonth()].slice(0, 3) + '</div>' +
                            '<div class="text-lg font-bold text-white leading-none">' + d.getDate() + '</div>' +
                        '</div>' +
                        '<div class="min-w-0 flex-1">' +
                            '<p class="text-sm font-semibold text-white truncate">' + UI.esc(e.titulo) + '</p>' +
                            '<p class="text-xs text-slate-400 truncate">' + UI.esc(e.hora || '') + (e.local ? ' · ' + UI.esc(e.local) : '') + ' · ' + UI.esc(Dados.nomeComissao(e.comissaoId)) + '</p>' +
                        '</div>' +
                        UI.chip(t.rotulo, t.cor) +
                    '</li>';
        }).join('') + '</ul>';
    }

    function blocoMensagens() {
        var msgs = Dados.mensagensVisiveis().slice(0, 4);
        if (!msgs.length) { return UI.vazio('Ainda nao ha comunicados.', 'message-square-off'); }
        return '<ul class="space-y-3">' + msgs.map(function (m) {
            return '<li class="flex gap-3">' +
                        UI.avatar(Dados.nomeUsuario(m.autorId), m.prioridade === 'alta' ? 'rose' : 'indigo') +
                        '<div class="min-w-0 flex-1">' +
                            '<div class="flex items-center gap-2 flex-wrap">' +
                                '<p class="text-sm font-semibold text-white truncate">' + UI.esc(m.assunto) + '</p>' +
                                (m.prioridade === 'alta' ? UI.chip('Urgente', 'rose', 'alert-triangle') : '') +
                            '</div>' +
                            '<p class="text-xs text-slate-400 line-clamp-2 mt-0.5">' + UI.esc(m.corpo) + '</p>' +
                            '<p class="text-[11px] text-slate-500 mt-1">' + UI.esc(Dados.nomeUsuario(m.autorId)) + ' · ' + UI.esc(Dados.destinatarios(m)) + ' · ' + UI.haQuanto(m.criadoEm) + '</p>' +
                        '</div>' +
                    '</li>';
        }).join('') + '</ul>';
    }

    function blocoPendentes() {
        var pendentes = Dados.postagensPendentes();
        if (!pendentes.length) {
            return '<div class="flex items-center gap-3 text-sm text-slate-400 py-2">' +
                   '<i data-lucide="check-check" class="w-5 h-5 text-emerald-400"></i> Nao ha postagens a espera de liberacao.</div>';
        }
        return '<ul class="space-y-2">' + pendentes.map(function (p) {
            return '<li class="flex items-center gap-3 bg-slate-800/60 border border-amber-500/20 rounded-xl px-3 py-2.5">' +
                        '<i data-lucide="clock" class="w-4 h-4 text-amber-400 shrink-0"></i>' +
                        '<div class="min-w-0 flex-1">' +
                            '<p class="text-sm text-white font-medium truncate">' + UI.esc(p.titulo) + '</p>' +
                            '<p class="text-[11px] text-slate-400 truncate">' + UI.esc(Dados.nomeComissao(p.comissaoId)) + ' · ' + UI.esc(Dados.nomeUsuario(p.autorId)) + '</p>' +
                        '</div>' +
                        '<button class="btn-mini" data-acao="liberar" data-id="' + p.id + '">Liberar</button>' +
                    '</li>';
        }).join('') + '</ul>';
    }

    global.Views = global.Views || {};
    global.Views.visao = {
        titulo: 'Visao geral',
        render: function () {
            var eu = Auth.usuarioAtual();
            var supra = Auth.ehSupra();
            var comissoes = Auth.comissoesVisiveis();
            var posts = Dados.postagensVisiveis();
            var membros = Dados.membrosVisiveis();
            var pendentes = Dados.postagensPendentes();
            var eventos = Dados.eventosVisiveis().filter(function (e) { return e.data >= UI.dataHoje(); });

            var acoes = '';
            if (Auth.pode('postagens.criar')) {
                acoes += '<button class="btn-primario" data-acao="nova-postagem"><i data-lucide="plus" class="w-4 h-4"></i> Nova postagem</button>';
            }
            if (Auth.pode('mensagens.enviar')) {
                acoes += '<button class="btn-secundario" data-acao="nova-mensagem"><i data-lucide="send" class="w-4 h-4"></i> Comunicar</button>';
            }

            var html = UI.cabecalho(
                saudacao() + ', ' + (eu ? eu.nome.split(' ')[0] : 'visitante') + '!',
                supra ? 'Estas a ver toda a plataforma do Protagonismo.'
                      : 'Painel de ' + (eu && eu.cargo ? eu.cargo : 'coordenacao') + ' · acesso definido pela coordenacao geral.',
                acoes
            );

            html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
                UI.estatistica(supra ? 'Frentes ativas' : 'As minhas frentes', Auth.frentesVisiveis().length, 'layers', 'indigo') +
                UI.estatistica(supra ? 'Comissoes' : 'As minhas comissoes', comissoes.length, 'users-round', 'sky') +
                UI.estatistica('Membros inscritos', membros.length, 'user-check', 'emerald') +
                UI.estatistica('Postagens', posts.length, 'megaphone', 'amber', pendentes.length + ' a aguardar liberacao') +
            '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">';

            html += '<div class="lg:col-span-2 space-y-5">' +
                        UI.cartao('<div class="px-5 py-4 border-b border-slate-700 flex items-center gap-2">' +
                                    '<i data-lucide="layers" class="w-4 h-4 text-indigo-400"></i>' +
                                    '<h3 class="font-bold text-sm text-white">Frentes do Protagonismo</h3></div>' +
                                  '<div class="p-5">' + blocoFrentes() + '</div>');

            if (Auth.pode('postagens.publicar')) {
                html += UI.cartao('<div class="px-5 py-4 border-b border-slate-700 flex items-center gap-2">' +
                                    '<i data-lucide="shield-check" class="w-4 h-4 text-amber-400"></i>' +
                                    '<h3 class="font-bold text-sm text-white">A aguardar liberacao</h3></div>' +
                                  '<div class="p-5">' + blocoPendentes() + '</div>');
            }
            html += '</div>';

            html += '<div class="space-y-5">' +
                        UI.cartao('<div class="px-5 py-4 border-b border-slate-700 flex items-center justify-between">' +
                                    '<div class="flex items-center gap-2"><i data-lucide="calendar-days" class="w-4 h-4 text-sky-400"></i>' +
                                    '<h3 class="font-bold text-sm text-white">Proximos eventos</h3></div>' +
                                    '<a href="#/calendario" class="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold">Ver agenda</a></div>' +
                                  '<div class="p-5">' + blocoAgenda() + '</div>') +
                        UI.cartao('<div class="px-5 py-4 border-b border-slate-700 flex items-center justify-between">' +
                                    '<div class="flex items-center gap-2"><i data-lucide="messages-square" class="w-4 h-4 text-violet-400"></i>' +
                                    '<h3 class="font-bold text-sm text-white">Mural de comunicados</h3></div>' +
                                    '<a href="#/mensagens" class="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold">Abrir</a></div>' +
                                  '<div class="p-5">' + blocoMensagens() + '</div>') +
                    '</div>';

            html += '</div>';
            return html;
        },
        ligar: function (raiz) {
            raiz.querySelectorAll('[data-acao="nova-postagem"]').forEach(function (b) {
                b.addEventListener('click', function () { Views.postagens.formulario(null); });
            });
            raiz.querySelectorAll('[data-acao="nova-mensagem"]').forEach(function (b) {
                b.addEventListener('click', function () { Views.mensagens.formulario(); });
            });
            raiz.querySelectorAll('[data-acao="liberar"]').forEach(function (b) {
                b.addEventListener('click', function () {
                    Views.postagens.mudarEstado(b.getAttribute('data-id'), 'aprovado');
                });
            });
        }
    };
})(window);
