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

    /* Ajuda de demonstracao: o seletor "Modo de teste" no topo permite saltar
       entre os tres perfis sem sair da sessao. Poe a false quando o painel
       passar a ser usado a serio (ver README). */
    var MODO_TESTE = true;

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
        alvo.innerHTML = NAVEGACAO.map(function (grupo) {
            var itens = grupo.itens.filter(temAcesso);
            if (!itens.length) { return ''; }
            return '<div class="grupo-nav">' +
                '<p class="grupo-nav__titulo sobrancelha">' + UI.esc(grupo.grupo) + '</p>' +
                itens.map(function (i) {
                    return '<a href="#/' + i.rota + '" class="nav-item' + (i.rota === rotaAtual ? ' nav-item--ativo' : '') + '">' +
                        UI.icone(i.icone, 15) +
                        '<span>' + UI.esc(i.rotulo) + '</span>' +
                        (i.contador === 'mensagens' ? '<span id="badge-mensagens" class="nav-item__conta hidden"></span>' : '') +
                    '</a>';
                }).join('') +
            '</div>';
        }).join('');
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
    function desenharUtilizador() {
        var alvo = document.getElementById('cartao-utilizador');
        if (!alvo) { return; }
        var eu = Auth.usuarioAtual();
        var funcao = Auth.funcaoAtual();
        alvo.innerHTML =
            UI.avatar(eu ? eu.nome : 'Visitante', Auth.ehSupra() ? 'violet' : 'indigo', 'grande') +
            '<div class="min-w-0">' +
                '<p class="cartao-utilizador__nome truncate">' + UI.esc(eu ? eu.nome : 'Visitante') + '</p>' +
                '<p class="cartao-utilizador__papel truncate">' + UI.esc(funcao ? funcao.nome : 'Sem funcao') + '</p>' +
            '</div>';
    }

    function trocadorHTML() {
        if (!MODO_TESTE) { return ''; }
        var perfil = Auth.perfilAtual();
        var opcoes = [
            { chave: 'supra', rotulo: 'Supra Admin' },
            { chave: 'admin', rotulo: 'Admin (comissao)' },
            { chave: 'publico', rotulo: 'Publico' }
        ];
        return '<div class="trocador">' +
                    '<span class="trocador__rotulo hidden sm:inline">Modo de teste</span>' +
                    opcoes.map(function (o) {
                        return '<button type="button" class="trocador__opcao' + (perfil === o.chave ? ' trocador__opcao--ativa' : '') +
                               '" data-perfil="' + o.chave + '">' + o.rotulo + '</button>';
                    }).join('') +
                '</div>';
    }

    function desenharTopo() {
        var alvo = document.getElementById('topo');
        if (!alvo) { return; }
        var eu = Auth.usuarioAtual();
        var porLer = Dados.naoLidas();

        alvo.innerHTML =
            '<div class="flex items-center gap-2 min-w-0">' +
                '<button id="abrir-menu" class="btn btn--nu lg:hidden" aria-label="Abrir menu">' + UI.icone('menu', 18) + '</button>' +
                trocadorHTML() +
            '</div>' +
            '<div class="flex items-center gap-1.5">' +
                '<a href="#/mensagens" class="btn btn--nu sino" aria-label="Comunicados">' +
                    UI.icone('bell', 17) +
                    (porLer > 0 ? '<span class="sino__ponto"></span>' : '') +
                '</a>' +
                '<div class="relative">' +
                    '<button id="btn-conta" class="btn btn--nu flex items-center gap-2" style="padding:.25rem .35rem">' +
                        UI.avatar(eu ? eu.nome : 'Visitante', Auth.ehSupra() ? 'violet' : 'indigo', 'pequeno') +
                        '<span class="hidden sm:block" style="font-size:.75rem;font-weight:500">' + UI.esc(eu ? eu.nome.split(' ')[0] : 'Visitante') + '</span>' +
                        UI.icone('chevron-down', 14) +
                    '</button>' +
                    '<div id="menu-conta" class="menu-conta hidden absolute right-0 mt-2 w-56 z-40">' +
                        '<div class="px-3 py-2.5 border-b" style="border-color:var(--linha)">' +
                            '<p class="truncate" style="font-size:.75rem;font-weight:500">' + UI.esc(eu ? eu.email : '') + '</p>' +
                            '<p class="nota" style="font-size:.6875rem">' + UI.esc(eu && eu.cargo ? eu.cargo : '') + '</p>' +
                        '</div>' +
                        '<a href="#/portal">' + UI.icone('globe', 14) + ' Portal publico</a>' +
                        '<button id="btn-sair" style="color:var(--sinal)">' + UI.icone('log-out', 14) + ' Terminar sessao</button>' +
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

        ligarTrocador(alvo);
    }

    function ligarTrocador(raiz) {
        raiz.querySelectorAll('[data-perfil]').forEach(function (el) {
            el.addEventListener('click', function () {
                var perfil = el.getAttribute('data-perfil');
                var r = Auth.assumirPerfil(perfil);
                if (!r.ok) { UI.toast(r.erro, 'erro'); return; }
                rotaAtual = 'visao';
                render();
                UI.toast(perfil === 'publico'
                    ? 'A ver a plataforma como visitante.'
                    : 'A ver o painel de ' + r.usuario.nome + '.', 'info');
            });
        });
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
            '<header class="portal-topo sticky top-0 z-30">' +
                '<div class="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-baseline justify-between gap-4">' +
                    '<div class="flex items-baseline gap-3">' +
                        '<span class="serifa" style="font-size:1.1rem">Protagonismo</span>' +
                        '<span class="sobrancelha hidden sm:inline">Portal da escola</span>' +
                    '</div>' +
                    '<div class="flex items-center gap-3">' +
                        trocadorHTML() +
                        '<button id="btn-entrar-painel" class="ligacao hidden sm:block">Area de coordenacao</button>' +
                    '</div>' +
                '</div>' +
            '</header>' +
            '<main class="palco max-w-4xl mx-auto px-5 sm:px-8 py-10" id="conteudo-publico"></main>' +
            '<footer class="max-w-4xl mx-auto px-5 sm:px-8 py-8 mt-6 border-t" style="border-color:var(--linha)">' +
                '<p class="nota">Protagonismo Estudantil · SIV — Simulado da ONU · Cine Club</p>' +
            '</footer>';

        var conteudo = document.getElementById('conteudo-publico');
        conteudo.innerHTML = Views.portal.render();
        Views.portal.ligar(conteudo);
        UI.icones();
        UI.animarNumeros(conteudo);

        ligarTrocador(alvo);
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
        desenharUtilizador();
        desenharTopo();
        // Em ecras pequenos, navegar fecha o menu lateral.
        if (global.innerWidth < 1024) { fecharLateral(); }

        var conteudo = document.getElementById('conteudo');
        conteudo.innerHTML = vista.render();
        if (typeof vista.ligar === 'function') { vista.ligar(conteudo); }
        UI.icones();
        UI.animarNumeros(conteudo);
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

        var fechar = document.getElementById('fechar-menu');
        if (fechar) { fechar.addEventListener('click', alternarLateral); }

        var verPublico = document.getElementById('btn-ver-publico');
        if (verPublico) {
            verPublico.addEventListener('click', function () {
                Auth.assumirPerfil('publico');
                render();
            });
        }

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
