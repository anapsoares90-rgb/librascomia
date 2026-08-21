/* =========================================================================
   Dados — consultas de dominio partilhadas pelas vistas
   Aplica sempre o ambito (scope) do utilizador com sessao iniciada.
   ========================================================================= */
(function (global) {
    'use strict';

    function nomeFrente(id) {
        var f = id ? Store.encontrar('frentes', id) : null;
        return f ? f.nome : '—';
    }

    function corFrente(id) {
        var f = id ? Store.encontrar('frentes', id) : null;
        return f ? (f.cor || 'slate') : 'slate';
    }

    function siglaFrente(id) {
        var f = id ? Store.encontrar('frentes', id) : null;
        return f ? f.sigla : '—';
    }

    function nomeComissao(id) {
        var c = id ? Store.encontrar('comissoes', id) : null;
        return c ? c.nome : 'Toda a frente';
    }

    function nomeUsuario(id) {
        var u = id ? Store.encontrar('usuarios', id) : null;
        return u ? u.nome : 'Sistema';
    }

    function nomeFuncao(id) {
        var f = id ? Store.encontrar('funcoes', id) : null;
        return f ? f.nome : 'Sem funcao';
    }

    /* --------------------------------------------------------------------- */
    /* Opcoes para formularios                                                */
    /* --------------------------------------------------------------------- */
    function opcoesFrentes(incluirVazio) {
        var lista = Auth.frentesVisiveis().map(function (f) {
            return { valor: f.id, rotulo: f.nome };
        });
        return incluirVazio ? [{ valor: '', rotulo: incluirVazio }].concat(lista) : lista;
    }

    function opcoesComissoes(frenteId, incluirVazio) {
        var lista = Auth.comissoesVisiveis()
            .filter(function (c) { return !frenteId || c.frenteId === frenteId; })
            .map(function (c) { return { valor: c.id, rotulo: siglaFrente(c.frenteId) + ' · ' + c.nome }; });
        return incluirVazio ? [{ valor: '', rotulo: incluirVazio }].concat(lista) : lista;
    }

    /* --------------------------------------------------------------------- */
    /* Postagens                                                              */
    /* --------------------------------------------------------------------- */
    function postagensVisiveis() {
        var todas = Store.listar('postagens').sort(function (a, b) {
            return new Date(b.criadoEm) - new Date(a.criadoEm);
        });
        if (Auth.ehSupra()) { return todas; }
        if (Auth.ehPublico()) {
            return todas.filter(function (p) { return p.visibilidade === 'publico' && p.status === 'aprovado'; });
        }
        var comissoes = Auth.idsComissoesVisiveis();
        var frentes = Auth.idsFrentesVisiveis();
        var eu = Auth.usuarioAtual();
        return todas.filter(function (p) {
            if (p.autorId === (eu && eu.id)) { return true; }
            if (p.comissaoId && comissoes.indexOf(p.comissaoId) !== -1) { return true; }
            if (!p.comissaoId && p.frenteId && frentes.indexOf(p.frenteId) !== -1) { return true; }
            // Postagens ja liberadas ao publico sao visiveis a qualquer coordenador.
            return p.visibilidade === 'publico' && p.status === 'aprovado';
        });
    }

    function postagensPublicas() {
        return Store.listar('postagens')
            .filter(function (p) { return p.visibilidade === 'publico' && p.status === 'aprovado'; })
            .sort(function (a, b) { return new Date(b.publicadoEm || b.criadoEm) - new Date(a.publicadoEm || a.criadoEm); });
    }

    function postagensPendentes() {
        return Store.listar('postagens').filter(function (p) {
            return p.status === 'pendente';
        });
    }

    /* --------------------------------------------------------------------- */
    /* Mensagens                                                              */
    /* --------------------------------------------------------------------- */
    function mensagensVisiveis() {
        var todas = Store.listar('mensagens').sort(function (a, b) {
            return new Date(b.criadoEm) - new Date(a.criadoEm);
        });
        if (Auth.ehSupra()) { return todas; }
        var eu = Auth.usuarioAtual();
        if (!eu) { return []; }
        var comissoes = Auth.idsComissoesVisiveis();
        var frentes = Auth.idsFrentesVisiveis();
        return todas.filter(function (m) {
            if (m.autorId === eu.id) { return true; }
            if (m.alcance === 'geral') { return true; }
            if (m.alcance === 'frente') { return frentes.indexOf(m.frenteId) !== -1; }
            if (m.alcance === 'comissao') { return comissoes.indexOf(m.comissaoId) !== -1; }
            return false;
        });
    }

    function naoLidas() {
        var eu = Auth.usuarioAtual();
        if (!eu) { return 0; }
        return mensagensVisiveis().filter(function (m) {
            return m.autorId !== eu.id && (m.lidasPor || []).indexOf(eu.id) === -1;
        }).length;
    }

    function marcarLida(mensagemId) {
        var eu = Auth.usuarioAtual();
        if (!eu) { return; }
        var m = Store.encontrar('mensagens', mensagemId);
        if (!m) { return; }
        var lidas = m.lidasPor || [];
        if (lidas.indexOf(eu.id) === -1) {
            lidas.push(eu.id);
            Store.atualizar('mensagens', mensagemId, { lidasPor: lidas });
        }
    }

    function destinatarios(mensagem) {
        if (mensagem.alcance === 'geral') { return 'Todas as comissoes'; }
        if (mensagem.alcance === 'frente') { return nomeFrente(mensagem.frenteId) + ' (todas as comissoes)'; }
        return nomeComissao(mensagem.comissaoId);
    }

    /* --------------------------------------------------------------------- */
    /* Eventos                                                                */
    /* --------------------------------------------------------------------- */
    function eventosVisiveis() {
        var todos = Store.listar('eventos').sort(function (a, b) {
            return (a.data + (a.hora || '')) > (b.data + (b.hora || '')) ? 1 : -1;
        });
        if (Auth.ehSupra()) { return todos; }
        if (Auth.ehPublico()) { return todos.filter(function (e) { return e.publico; }); }
        var comissoes = Auth.idsComissoesVisiveis();
        var frentes = Auth.idsFrentesVisiveis();
        return todos.filter(function (e) {
            if (e.publico) { return true; }
            if (e.comissaoId) { return comissoes.indexOf(e.comissaoId) !== -1; }
            return frentes.indexOf(e.frenteId) !== -1;
        });
    }

    function proximosEventos(limite) {
        var hoje = UI.dataHoje();
        return eventosVisiveis()
            .filter(function (e) { return e.data >= hoje; })
            .slice(0, limite || 5);
    }

    /* --------------------------------------------------------------------- */
    /* Membros                                                                */
    /* --------------------------------------------------------------------- */
    function membrosVisiveis() {
        var todos = Store.listar('membros');
        if (Auth.ehSupra()) { return todos; }
        var comissoes = Auth.idsComissoesVisiveis();
        return todos.filter(function (m) { return comissoes.indexOf(m.comissaoId) !== -1; });
    }

    /* --------------------------------------------------------------------- */
    /* Utilitarios de apresentacao                                            */
    /* --------------------------------------------------------------------- */
    var ESTADOS = {
        rascunho:  { rotulo: 'Rascunho',  cor: 'slate',   icone: 'file-pen' },
        pendente:  { rotulo: 'Em analise', cor: 'amber',  icone: 'clock' },
        aprovado:  { rotulo: 'Liberada',  cor: 'emerald', icone: 'check-circle-2' },
        rejeitado: { rotulo: 'Devolvida', cor: 'rose',    icone: 'undo-2' }
    };

    var TIPOS_EVENTO = {
        reuniao:  { rotulo: 'Reuniao',   cor: 'sky' },
        formacao: { rotulo: 'Formacao',  cor: 'violet' },
        evento:   { rotulo: 'Evento',    cor: 'indigo' },
        prazo:    { rotulo: 'Prazo',     cor: 'rose' },
        ensaio:   { rotulo: 'Ensaio',    cor: 'emerald' }
    };

    function estado(chave) { return ESTADOS[chave] || ESTADOS.rascunho; }
    function tipoEvento(chave) { return TIPOS_EVENTO[chave] || TIPOS_EVENTO.evento; }

    global.Dados = {
        nomeFrente: nomeFrente, corFrente: corFrente, siglaFrente: siglaFrente,
        nomeComissao: nomeComissao, nomeUsuario: nomeUsuario, nomeFuncao: nomeFuncao,
        opcoesFrentes: opcoesFrentes, opcoesComissoes: opcoesComissoes,
        postagensVisiveis: postagensVisiveis, postagensPublicas: postagensPublicas, postagensPendentes: postagensPendentes,
        mensagensVisiveis: mensagensVisiveis, naoLidas: naoLidas, marcarLida: marcarLida, destinatarios: destinatarios,
        eventosVisiveis: eventosVisiveis, proximosEventos: proximosEventos,
        membrosVisiveis: membrosVisiveis,
        ESTADOS: ESTADOS, TIPOS_EVENTO: TIPOS_EVENTO, estado: estado, tipoEvento: tipoEvento
    };
})(window);
