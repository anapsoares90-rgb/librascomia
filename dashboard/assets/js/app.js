/* =========================================================================
   App — arranque, navegacao e montagem dos paineis
   ========================================================================= */
(function (global) {
    'use strict';

    var NAVEGACAO = [
        {
            grupo: 'Painel',
            itens: [
                { rota: 'visao',      rotulo: 'Visao geral',  icone: 'layout-dashboard', permissao: null },
                { rota: 'postagens',  rotulo: 'Postagens',    icone: 'megaphone',        permissao: ['postagens.criar', 'postagens.publicar'] },
                { rota: 'mensagens',  rotulo: 'Comunicacao',  icone: 'messages-square',  permissao: null, contador: 'mensagens' },
                { rota: 'calendario', rotulo: 'Calendario',   icone: 'calendar-days',    permissao: null },
                { rota: 'membros',    rotulo: 'Membros',      icone: 'users',            permissao: ['membros.gerir'] }
            ]
        },
        {
            grupo: 'Gestao do Protagonismo',
            itens: [
                { rota: 'frentes',    rotulo: 'Frentes',            icone: 'layers',      permissao: ['frentes.gerir'] },
                { rota: 'comissoes',  rotulo: 'Comissoes',          icone: 'users-round', permissao: null },
                { rota: 'usuarios',   rotulo: 'Coordenadores',      icone: 'id-card',     permissao: ['usuarios.gerir'] },
                { rota: 'funcoes',    rotulo: 'Funcoes do painel',  icone: 'key-round',   permissao: ['funcoes.gerir'] }
            ]
        },
        {
            grupo: 'Acompanhamento',
            itens: [
                { rota: 'relatorios', rotulo: 'Relatorios', icone: 'bar-chart-3', permissao: ['relatorios.ver'] },
                { rota: 'auditoria',  rotulo: 'Atividade',  icone: 'history',     permissao: ['auditoria.ver'] },
                { rota: 'portal',     rotulo: 'Portal publico', icone: 'globe',   permissao: null }
            ]
        }
    ];

    var rotaAtual = 'visao';

    function temAcesso(item) {
        if (!item.permissao) { return true; }
        return item.permissao.some(function (p) { return Auth.pode(p); });
    }

    function rotasDisponiveis() {
        var lista = [];
        NAVEGACAO.forEach(function (g) {
            g.itens.forEach(function (i) { if (temAcesso(i)) { lista.push(i.rota); } });
        });
        return lista;
    }

    /* --------------------------------------------------------------------- */
    /* Barra lateral                                                          */
    /* --------------------------------------------------------------------- */
    function desenharMenu() {
        var alvo = document.getElementById('menu');
        if (!alvo) { return; }
        var html = '';
        NAVEGACAO.forEach(function (grupo) {
            var itens = grupo.itens.filter(temAcesso);
            if (!itens.length) { return; }
            html += '<div class="mb-6">' +
                '<p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">' + UI.esc(grupo.grupo) + '</p>' +
                itens.map(function (i) {
                    var ativo = i.rota === rotaAtual;
                    return '<a href="#/' + i.rota + '" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all ' +
                        (ativo ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-800') + '">' +
                        '<i data-lucide="' + i.icone + '" class="w-4 h-4 shrink-0"></i>' +
                        '<span class="flex-1">' + UI.esc(i.rotulo) + '</span>' +
                        (i.contador === 'mensagens' ? '<span id="badge-mensagens" class="hidden text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full"></span>' : '') +
                    '</a>';
                }).join('') +
            '</div>';
        });
        alvo.innerHTML = html;
        UI.icones();
        atualizarContadores();
    }

    function atualizarContadores() {
        var badge = document.getElementById('badge-mensagens');
        if (!badge) { return; }
        var n = Dados.naoLidas();
        if (n > 0) {
            badge.textContent = n;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    /* --------------------------------------------------------------------- */
    /* Cabecalho                                                              */
    /* --------------------------------------------------------------------- */
    function desenharTopo() {
        var alvo = document.getElementById('topo');
        if (!alvo) { return; }
        var eu = Auth.usuarioAtual();
        var supra = Auth.ehSupra();
        var funcao = Auth.funcaoAtual();

        alvo.innerHTML =
            '<div class="flex items-center gap-3">' +
                '<button id="abrir-menu" class="lg:hidden btn-icone"><i data-lucide="menu" class="w-5 h-5 pointer-events-none"></i></button>' +
                '<div>' +
                    '<p class="text-[11px] text-slate-400 leading-none">Protagonismo Estudantil</p>' +
                    '<h1 class="text-base font-bold text-white leading-tight">' + UI.esc((Views[rotaAtual] && Views[rotaAtual].titulo) || 'Painel') + '</h1>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
                '<span class="hidden sm:block">' +
                    (supra ? UI.chip('Supra Admin', 'rose', 'shield') : UI.chip(funcao ? funcao.nome : 'Coordenador', 'indigo', 'id-card')) +
                '</span>' +
                '<div class="relative">' +
                    '<button id="btn-conta" class="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-800 transition-all">' +
                        UI.avatar(eu ? eu.nome : 'Visitante', supra ? 'rose' : 'indigo', 'w-8 h-8 text-[11px]') +
                        '<span class="hidden sm:block text-left"><span class="block text-xs font-semibold text-white leading-tight">' + UI.esc(eu ? eu.nome : 'Visitante') + '</span>' +
                        '<span class="block text-[10px] text-slate-400 leading-tight">' + UI.esc(eu && eu.cargo ? eu.cargo : '') + '</span></span>' +
                        '<i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 pointer-events-none"></i>' +
                    '</button>' +
                    '<div id="menu-conta" class="hidden absolute right-0 mt-2 w-56 bg-slate-850 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40">' +
                        '<div class="px-3 py-2 border-b border-slate-700 mb-1">' +
                            '<p class="text-xs font-semibold text-white truncate">' + UI.esc(eu ? eu.email : '') + '</p>' +
                            '<p class="text-[11px] text-slate-400">' + UI.esc(funcao ? funcao.nome : '') + '</p>' +
                        '</div>' +
                        '<a href="#/portal" class="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all"><i data-lucide="globe" class="w-4 h-4"></i> Ver portal publico</a>' +
                        '<button id="btn-sair" class="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-slate-800 transition-all"><i data-lucide="log-out" class="w-4 h-4"></i> Terminar sessao</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        UI.icones();

        var btn = document.getElementById('btn-conta');
        var menu = document.getElementById('menu-conta');
        if (btn) {
            btn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('hidden'); });
            document.addEventListener('click', function () { if (menu) { menu.classList.add('hidden'); } });
        }
        var sair = document.getElementById('btn-sair');
        if (sair) { sair.addEventListener('click', terminarSessao); }
        var abrir = document.getElementById('abrir-menu');
        if (abrir) { abrir.addEventListener('click', alternarLateral); }
    }

    function fecharLateral() {
        var lateral = document.getElementById('lateral');
        var fundo = document.getElementById('fundo-lateral');
        if (lateral) { lateral.classList.add('-translate-x-full'); }
        if (fundo) { fundo.classList.add('hidden'); }
    }

    function alternarLateral() {
        var lateral = document.getElementById('lateral');
        var fundo = document.getElementById('fundo-lateral');
        if (!lateral) { return; }
        var aberta = !lateral.classList.contains('-translate-x-full');
        lateral.classList.toggle('-translate-x-full', aberta);
        if (fundo) { fundo.classList.toggle('hidden', aberta); }
    }

    /* --------------------------------------------------------------------- */
    /* Portal publico (sem barra lateral)                                     */
    /* --------------------------------------------------------------------- */
    function desenharPublico() {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
        var alvo = document.getElementById('publico');
        alvo.classList.remove('hidden');
        alvo.innerHTML =
            '<header class="bg-slate-850/90 backdrop-blur border-b border-slate-700 sticky top-0 z-30">' +
                '<div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">' +
                    '<div class="flex items-center gap-3">' +
                        '<div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><i data-lucide="sparkles" class="w-5 h-5 text-white"></i></div>' +
                        '<div><p class="text-sm font-bold text-white leading-tight">Protagonismo Estudantil</p>' +
                        '<p class="text-[11px] text-slate-400 leading-tight">Portal publico da escola</p></div>' +
                    '</div>' +
                    '<button id="btn-entrar-painel" class="btn-secundario"><i data-lucide="log-in" class="w-4 h-4"></i> Area de coordenacao</button>' +
                '</div>' +
            '</header>' +
            '<main class="max-w-6xl mx-auto px-4 sm:px-6 py-8" id="conteudo-publico"></main>' +
            '<footer class="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-[11px] text-slate-500 border-t border-slate-800 mt-8">' +
                'Protagonismo Estudantil · SIV — Simulado da ONU · Cine Club' +
            '</footer>';

        var conteudo = document.getElementById('conteudo-publico');
        conteudo.innerHTML = Views.portal.render();
        Views.portal.ligar(conteudo);
        UI.icones();

        document.getElementById('btn-entrar-painel').addEventListener('click', function () {
            Auth.sair();
            mostrarLogin();
        });
    }

    /* --------------------------------------------------------------------- */
    /* Render principal                                                       */
    /* --------------------------------------------------------------------- */
    function render(depois) {
        if (!Auth.autenticado()) { mostrarLogin(); return; }
        if (Auth.ehPublico()) { desenharPublico(); return; }

        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('publico').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        var disponiveis = rotasDisponiveis();
        if (disponiveis.indexOf(rotaAtual) === -1) { rotaAtual = disponiveis[0] || 'visao'; }

        var vista = Views[rotaAtual];
        if (!vista) { rotaAtual = 'visao'; vista = Views.visao; }

        desenharMenu();
        desenharTopo();
        // Em ecras pequenos, navegar fecha o menu lateral.
        if (global.innerWidth < 1024) { fecharLateral(); }

        var conteudo = document.getElementById('conteudo');
        conteudo.innerHTML = vista.render();
        if (typeof vista.ligar === 'function') { vista.ligar(conteudo); }
        UI.icones();
        atualizarContadores();
        global.scrollTo(0, 0);
        if (typeof depois === 'function') { depois(); }
    }

    function irPara(rota) {
        rotaAtual = rota;
        render();
    }

    function tratarHash() {
        var hash = (global.location.hash || '').replace('#/', '').trim();
        if (hash && Views[hash]) { rotaAtual = hash; }
        render();
    }

    /* --------------------------------------------------------------------- */
    /* Login                                                                  */
    /* --------------------------------------------------------------------- */
    function mostrarLogin() {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('publico').classList.add('hidden');
        document.getElementById('tela-login').classList.remove('hidden');
        UI.icones();
    }

    function terminarSessao() {
        Auth.sair();
        rotaAtual = 'visao';
        global.location.hash = '';
        mostrarLogin();
        UI.toast('Sessao terminada.', 'info');
    }

    function ligarLogin() {
        var form = document.getElementById('form-login');
        var erro = document.getElementById('login-erro');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = document.getElementById('login-email').value;
            var senha = document.getElementById('login-senha').value;
            var r = Auth.entrar(email, senha);
            if (!r.ok) {
                erro.textContent = r.erro;
                erro.classList.remove('hidden');
                return;
            }
            erro.classList.add('hidden');
            rotaAtual = 'visao';
            global.location.hash = '#/visao';
            render();
            UI.toast('Bem-vindo(a), ' + r.usuario.nome.split(' ')[0] + '!', 'sucesso');
        });

        document.getElementById('btn-publico').addEventListener('click', function () {
            Auth.entrarComoPublico();
            render();
        });

        document.querySelectorAll('[data-demo]').forEach(function (b) {
            b.addEventListener('click', function () {
                var partes = b.getAttribute('data-demo').split('|');
                document.getElementById('login-email').value = partes[0];
                document.getElementById('login-senha').value = partes[1];
                erro.classList.add('hidden');
            });
        });

        var olho = document.getElementById('ver-senha');
        if (olho) {
            olho.addEventListener('click', function () {
                var campo = document.getElementById('login-senha');
                campo.type = campo.type === 'password' ? 'text' : 'password';
            });
        }
    }

    /* --------------------------------------------------------------------- */
    function arrancar() {
        Store.base();
        ligarLogin();

        global.addEventListener('hashchange', tratarHash);

        var fundo = document.getElementById('fundo-lateral');
        if (fundo) { fundo.addEventListener('click', alternarLateral); }

        if (Auth.autenticado()) {
            tratarHash();
        } else {
            mostrarLogin();
        }
        UI.icones();
    }

    global.App = {
        arrancar: arrancar,
        render: render,
        recarregar: function (depois) { render(depois); },
        irPara: irPara,
        atualizarContadores: atualizarContadores,
        terminarSessao: terminarSessao
    };
})(window);
