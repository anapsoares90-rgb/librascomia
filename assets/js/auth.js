/* =========================================================================
   Auth — sessao, perfis e permissoes
   -------------------------------------------------------------------------
   Perfis existentes:
     supra   -> Supra Admin: ve e administra toda a plataforma.
     admin   -> Coordenador: so ve as frentes/comissoes que o Supra Admin
                lhe libertou, e so as funcionalidades da funcao atribuida.
     publico -> Visitante: portal publico, apenas postagens liberadas.
   ========================================================================= */
(function (global) {
    'use strict';

    var CHAVE_SESSAO = 'protagonismo.sessao.v1';
    var sessao = null;

    function carregarSessao() {
        if (sessao !== null) { return sessao; }
        try {
            var bruto = global.localStorage.getItem(CHAVE_SESSAO);
            sessao = bruto ? JSON.parse(bruto) : false;
        } catch (e) {
            sessao = false;
        }
        return sessao;
    }

    function guardarSessao(valor) {
        sessao = valor;
        try {
            if (valor) {
                global.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(valor));
            } else {
                global.localStorage.removeItem(CHAVE_SESSAO);
            }
        } catch (e) { /* modo privado do browser */ }
    }

    /* --------------------------------------------------------------------- */
    function entrar(email, senha) {
        var alvo = (email || '').trim().toLowerCase();
        var utilizador = Store.listar('usuarios').filter(function (u) {
            return u.email.toLowerCase() === alvo;
        })[0];

        if (!utilizador) { return { ok: false, erro: 'Nao existe nenhuma conta com esse e-mail.' }; }
        if (!utilizador.ativo) { return { ok: false, erro: 'Esta conta esta desativada. Fale com a coordenacao.' }; }
        if (utilizador.senha !== senha) { return { ok: false, erro: 'Palavra-passe incorreta.' }; }

        Store.atualizar('usuarios', utilizador.id, { ultimoAcesso: Store.agora() });
        guardarSessao({ usuarioId: utilizador.id, perfil: utilizador.perfil, iniciadaEm: Store.agora() });
        Store.registar('Inicio de sessao', utilizador.nome + ' entrou no painel.', utilizador.id);
        return { ok: true, usuario: utilizador };
    }

    function entrarComoPublico() {
        guardarSessao({ usuarioId: null, perfil: 'publico', iniciadaEm: Store.agora() });
        return { ok: true };
    }

    /* Modo de teste: salta entre perfis sem voltar ao ecra de entrada.
       E uma ajuda de demonstracao — ver App.MODO_TESTE em app.js. */
    function assumirPerfil(perfil) {
        if (perfil === 'publico') {
            entrarComoPublico();
            return { ok: true };
        }
        var candidatos = Store.listar('usuarios').filter(function (u) { return u.perfil === perfil && u.ativo; });
        var alvo = candidatos[0];
        if (perfil === 'admin') {
            var atual = usuarioAtual();
            if (atual && atual.perfil === 'admin') { alvo = atual; }
        }
        if (!alvo) { return { ok: false, erro: 'Nao ha nenhuma conta ativa com esse perfil.' }; }
        guardarSessao({ usuarioId: alvo.id, perfil: alvo.perfil, iniciadaEm: Store.agora(), teste: true });
        return { ok: true, usuario: alvo };
    }

    function sair() {
        var u = usuarioAtual();
        if (u) { Store.registar('Fim de sessao', u.nome + ' saiu do painel.', u.id); }
        guardarSessao(false);
    }

    function usuarioAtual() {
        var s = carregarSessao();
        if (!s || !s.usuarioId) { return null; }
        return Store.encontrar('usuarios', s.usuarioId);
    }

    function perfilAtual() {
        var s = carregarSessao();
        if (!s) { return null; }
        var u = usuarioAtual();
        return u ? u.perfil : s.perfil;
    }

    function autenticado() {
        return carregarSessao() !== false && carregarSessao() !== null;
    }

    function ehSupra() {
        return perfilAtual() === 'supra';
    }

    function ehPublico() {
        return perfilAtual() === 'publico';
    }

    /* --------------------------------------------------------------------- */
    /* Permissoes                                                             */
    /* --------------------------------------------------------------------- */
    function funcaoAtual() {
        var u = usuarioAtual();
        return u && u.funcaoId ? Store.encontrar('funcoes', u.funcaoId) : null;
    }

    function permissoes() {
        if (ehPublico()) { return []; }
        var f = funcaoAtual();
        if (!f) { return []; }
        return f.permissoes || [];
    }

    function pode(chave) {
        var lista = permissoes();
        if (lista.indexOf('plataforma.total') !== -1) { return true; }
        return lista.indexOf(chave) !== -1;
    }

    /* --------------------------------------------------------------------- */
    /* Ambito de dados (o que este utilizador tem direito a ver)               */
    /* --------------------------------------------------------------------- */
    function comissoesVisiveis() {
        var todas = Store.listar('comissoes');
        if (ehSupra()) { return todas; }
        var u = usuarioAtual();
        if (!u) { return []; }
        return todas.filter(function (c) {
            return (u.comissaoIds || []).indexOf(c.id) !== -1 ||
                   (u.frenteIds || []).indexOf(c.frenteId) !== -1 ||
                   c.coordenadorId === u.id;
        });
    }

    function frentesVisiveis() {
        var todas = Store.listar('frentes');
        if (ehSupra()) { return todas; }
        var u = usuarioAtual();
        if (!u) { return []; }
        var idsPorComissao = comissoesVisiveis().map(function (c) { return c.frenteId; });
        return todas.filter(function (f) {
            return (u.frenteIds || []).indexOf(f.id) !== -1 || idsPorComissao.indexOf(f.id) !== -1;
        });
    }

    function idsComissoesVisiveis() {
        return comissoesVisiveis().map(function (c) { return c.id; });
    }

    function idsFrentesVisiveis() {
        return frentesVisiveis().map(function (f) { return f.id; });
    }

    function veComissao(comissaoId) {
        if (ehSupra()) { return true; }
        return idsComissoesVisiveis().indexOf(comissaoId) !== -1;
    }

    /* --------------------------------------------------------------------- */
    global.Auth = {
        entrar: entrar,
        entrarComoPublico: entrarComoPublico,
        assumirPerfil: assumirPerfil,
        sair: sair,
        autenticado: autenticado,
        usuarioAtual: usuarioAtual,
        perfilAtual: perfilAtual,
        funcaoAtual: funcaoAtual,
        permissoes: permissoes,
        pode: pode,
        ehSupra: ehSupra,
        ehPublico: ehPublico,
        comissoesVisiveis: comissoesVisiveis,
        frentesVisiveis: frentesVisiveis,
        idsComissoesVisiveis: idsComissoesVisiveis,
        idsFrentesVisiveis: idsFrentesVisiveis,
        veComissao: veComissao
    };
})(window);
