/* =========================================================================
   Dados — consultas de dominio partilhadas pelas vistas
   Aplica sempre o ambito (scope) do usuário com sessão iniciada.
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
        return f ? f.nome : 'Sem função';
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
            // Postagens já liberadas ao público sao visiveis a qualquer coordenador.
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
        if (mensagem.alcance === 'geral') { return 'Todos os comitês'; }
        if (mensagem.alcance === 'frente') { return nomeFrente(mensagem.frenteId) + ' (todos os comitês)'; }
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
    /* SiV — delegações, sessões de debate, moções                            */
    /* --------------------------------------------------------------------- */
    var MODOS = {
        lista:    { rotulo: 'Lista de oradores', cor: 'indigo', icone: 'list-ordered' },
        moderado: { rotulo: 'Caucus moderado',   cor: 'sky',    icone: 'users' },
        simples:  { rotulo: 'Caucus simples',    cor: 'amber',  icone: 'coffee' },
        votacao:  { rotulo: 'Votação',           cor: 'violet', icone: 'vote' },
        suspensa: { rotulo: 'Sessão suspensa',   cor: 'slate',  icone: 'pause' }
    };

    var TIPOS_MOCAO = {
        moderado: 'Caucus moderado',
        simples:  'Caucus não moderado',
        tempo:    'Alterar o tempo de fala',
        encerrar: 'Encerrar os debates',
        votacao:  'Passar a votação',
        outra:    'Outra moção'
    };

    var PRESENCAS = {
        votante:  { rotulo: 'Presente e votante', curto: 'P/V', cor: 'emerald' },
        presente: { rotulo: 'Presente',           curto: 'P',   cor: 'sky' },
        ausente:  { rotulo: 'Ausente',            curto: '—',   cor: 'slate' }
    };

    function modo(chave) { return MODOS[chave] || MODOS.lista; }

    function delegacoesDe(comissaoId) {
        return Store.listar('delegacoes')
            .filter(function (d) { return d.comissaoId === comissaoId; })
            .sort(function (a, b) { return a.pais.localeCompare(b.pais); });
    }

    function delegacao(id) {
        return id ? Store.encontrar('delegacoes', id) : null;
    }

    function nomeDelegacao(id) {
        var d = delegacao(id);
        return d ? d.pais : '—';
    }

    /* Comitês onde faz sentido abrir uma mesa: os que já tem delegações. */
    function comissoesComDebate() {
        var comIds = Store.listar('delegacoes').map(function (d) { return d.comissaoId; });
        return Auth.comissoesVisiveis().filter(function (c) {
            return comIds.indexOf(c.id) !== -1;
        });
    }

    function sessaoDe(comissaoId) {
        return Store.listar('sessoes').filter(function (s) {
            return s.comissaoId === comissaoId && s.aberta;
        })[0] || null;
    }

    function abrirSessao(comissaoId) {
        var ja = sessaoDe(comissaoId);
        if (ja) { return ja; }
        var nova = Store.inserir('sessoes', {
            comissaoId: comissaoId, aberta: true, modo: 'lista', topico: '',
            tempoOrador: 90, tempoTotal: 0, oradorAtual: null, fila: [],
            cronometro: { correndo: false, inicio: null, acumulado: 0 },
            abertaEm: Store.agora(), encerradaEm: null
        });
        Store.registar('Sessão aberta', nomeComissao(comissaoId));
        return nova;
    }

    function encerrarSessao(sessaoId) {
        var s = Store.encontrar('sessoes', sessaoId);
        if (!s) { return; }
        Store.atualizar('sessoes', sessaoId, {
            aberta: false, encerradaEm: Store.agora(),
            cronometro: { correndo: false, inicio: null, acumulado: 0 }
        });
        Store.registar('Sessão encerrada', nomeComissao(s.comissaoId));
    }

    /* Segundos já decorridos no cronometro, contando o tempo a correr. */
    function decorrido(sessao) {
        if (!sessao || !sessao.cronometro) { return 0; }
        var c = sessao.cronometro;
        var extra = c.correndo && c.inicio ? (Date.now() - new Date(c.inicio).getTime()) / 1000 : 0;
        return Math.max(0, Math.floor((c.acumulado || 0) + extra));
    }

    function relogio(segundos) {
        var s = Math.max(0, Math.floor(segundos || 0));
        var m = Math.floor(s / 60);
        return m + ':' + String(s % 60).padStart(2, '0');
    }

    /* Chamada: contagens, quórum e maiorias. */
    function chamada(comissaoId) {
        var ds = delegacoesDe(comissaoId);
        var votantes = ds.filter(function (d) { return d.presenca === 'votante'; }).length;
        var presentes = ds.filter(function (d) { return d.presenca === 'presente'; }).length;
        var ausentes = ds.filter(function (d) { return d.presenca === 'ausente'; }).length;
        var naSala = votantes + presentes;
        return {
            total: ds.length,
            votantes: votantes,
            presentes: presentes,
            ausentes: ausentes,
            naSala: naSala,
            /* Quórum da simulação: metade das delegações inscritas, arredondada para cima. */
            quorum: Math.ceil(ds.length / 2),
            temQuorum: naSala >= Math.ceil(ds.length / 2) && ds.length > 0,
            maioriaSimples: Math.floor(naSala / 2) + 1,
            maioriaQualificada: Math.ceil((votantes || naSala) * 2 / 3)
        };
    }

    function discursosDe(comissaoId) {
        return Store.listar('discursos').filter(function (d) { return d.comissaoId === comissaoId; });
    }

    function estatisticasOradores(comissaoId) {
        var porDelegacao = {};
        discursosDe(comissaoId).forEach(function (d) {
            if (!porDelegacao[d.delegacaoId]) { porDelegacao[d.delegacaoId] = { discursos: 0, segundos: 0 }; }
            porDelegacao[d.delegacaoId].discursos += 1;
            porDelegacao[d.delegacaoId].segundos += d.segundos || 0;
        });
        return delegacoesDe(comissaoId).map(function (d) {
            var e = porDelegacao[d.id] || { discursos: 0, segundos: 0 };
            return { delegacao: d, discursos: e.discursos, segundos: e.segundos };
        }).sort(function (a, b) { return b.discursos - a.discursos || b.segundos - a.segundos; });
    }

    function mocoesDe(comissaoId) {
        return Store.listar('mocoes')
            .filter(function (m) { return m.comissaoId === comissaoId; })
            .sort(function (a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
    }

    /* --------------------------------------------------------------------- */
    /* Inscrições e pagamentos                                                */
    /* --------------------------------------------------------------------- */
    function inscricoesVisiveis() {
        var todas = Store.listar('inscricoes').sort(function (a, b) {
            return new Date(b.criadoEm) - new Date(a.criadoEm);
        });
        if (Auth.ehSupra()) { return todas; }
        var comissoes = Auth.idsComissoesVisiveis();
        var frentes = Auth.idsFrentesVisiveis();
        return todas.filter(function (i) {
            return comissoes.indexOf(i.comissaoId) !== -1 || frentes.indexOf(i.frenteId) !== -1;
        });
    }

    function pagamentosVisiveis() {
        var inscricoes = inscricoesVisiveis().map(function (i) { return i.id; });
        return Store.listar('pagamentos').filter(function (p) {
            return Auth.ehSupra() || inscricoes.indexOf(p.inscricaoId) !== -1;
        });
    }

    function totaisFinanceiros() {
        var pgs = pagamentosVisiveis();
        function soma(estado) {
            return pgs.filter(function (p) { return p.estado === estado; })
                      .reduce(function (t, p) { return t + (Number(p.valor) || 0); }, 0);
        }
        return {
            recebido: soma('pago'),
            pendente: soma('pendente'),
            isento: soma('isento'),
            devolvido: soma('devolvido'),
            total: pgs.length
        };
    }

    /* --------------------------------------------------------------------- */
    /* Utilitarios de apresentacao                                            */
    /* --------------------------------------------------------------------- */
    var ESTADOS = {
        rascunho:  { rotulo: 'Rascunho',  cor: 'slate',   icone: 'file-pen' },
        pendente:  { rotulo: 'Em análise', cor: 'amber',  icone: 'clock' },
        aprovado:  { rotulo: 'Liberada',  cor: 'emerald', icone: 'check-circle-2' },
        rejeitado: { rotulo: 'Devolvida', cor: 'rose',    icone: 'undo-2' }
    };

    var TIPOS_EVENTO = {
        reuniao:  { rotulo: 'Reunião',   cor: 'sky' },
        formacao: { rotulo: 'Formação',  cor: 'violet' },
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
        ESTADOS: ESTADOS, TIPOS_EVENTO: TIPOS_EVENTO, estado: estado, tipoEvento: tipoEvento,
        MODOS: MODOS, TIPOS_MOCAO: TIPOS_MOCAO, PRESENCAS: PRESENCAS, modo: modo,
        delegacoesDe: delegacoesDe, delegacao: delegacao, nomeDelegacao: nomeDelegacao,
        comissoesComDebate: comissoesComDebate, sessaoDe: sessaoDe, abrirSessao: abrirSessao,
        encerrarSessao: encerrarSessao, decorrido: decorrido, relogio: relogio, chamada: chamada,
        discursosDe: discursosDe, estatisticasOradores: estatisticasOradores, mocoesDe: mocoesDe,
        inscricoesVisiveis: inscricoesVisiveis, pagamentosVisiveis: pagamentosVisiveis,
        totaisFinanceiros: totaisFinanceiros
    };
})(window);
