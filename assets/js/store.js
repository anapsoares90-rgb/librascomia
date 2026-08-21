/* =========================================================================
   Store — camada de dados do Dashboard Protagonismo
   -------------------------------------------------------------------------
   Toda a persistencia da aplicacao passa por aqui (localStorage do browser).
   O resto do codigo NUNCA acede ao localStorage diretamente: assim, para
   migrar mais tarde para um servidor real (Supabase, Firebase, API propria)
   basta reescrever as funcoes deste ficheiro.
   ========================================================================= */
(function (global) {
    'use strict';

    var CHAVE_DB = 'protagonismo.db.v1';

    /* ---------------------------------------------------------------------
       Catalogo de permissoes (as "funcoes do painel" sao combinacoes destas)
       --------------------------------------------------------------------- */
    var PERMISSOES = [
        { chave: 'plataforma.total',  grupo: 'Plataforma', rotulo: 'Acesso total a plataforma', descricao: 'Ve e edita tudo, em todas as frentes e comissoes.' },
        { chave: 'frentes.gerir',     grupo: 'Plataforma', rotulo: 'Gerir frentes',             descricao: 'Criar e editar frentes do protagonismo (SIV, Cine Club, ...).' },
        { chave: 'comissoes.gerir',   grupo: 'Plataforma', rotulo: 'Gerir comissoes',           descricao: 'Criar comissoes e nomear coordenadores.' },
        { chave: 'funcoes.gerir',     grupo: 'Plataforma', rotulo: 'Gerir funcoes do painel',   descricao: 'Cadastrar perfis de acesso e as suas permissoes.' },
        { chave: 'usuarios.gerir',    grupo: 'Plataforma', rotulo: 'Gerir coordenadores',       descricao: 'Adicionar coordenadores e atribuir funcoes.' },
        { chave: 'membros.gerir',     grupo: 'Comissao',   rotulo: 'Gerir membros',             descricao: 'Cadastrar os alunos membros da comissao.' },
        { chave: 'postagens.criar',   grupo: 'Conteudo',   rotulo: 'Criar postagens',           descricao: 'Escrever comunicados para membros ou para o publico.' },
        { chave: 'postagens.publicar',grupo: 'Conteudo',   rotulo: 'Liberar postagens',         descricao: 'Aprovar / liberar postagens no portal publico.' },
        { chave: 'mensagens.enviar',  grupo: 'Comunicacao',rotulo: 'Enviar mensagens',          descricao: 'Comunicar com a propria comissao.' },
        { chave: 'mensagens.geral',   grupo: 'Comunicacao',rotulo: 'Comunicado geral',          descricao: 'Enviar mensagens para todas as comissoes de uma frente ou para a plataforma inteira.' },
        { chave: 'calendario.gerir',  grupo: 'Agenda',     rotulo: 'Gerir calendario',          descricao: 'Criar e editar eventos da agenda.' },
        { chave: 'relatorios.ver',    grupo: 'Gestao',     rotulo: 'Ver relatorios',            descricao: 'Acompanhar indicadores e producao das comissoes.' },
        { chave: 'auditoria.ver',     grupo: 'Gestao',     rotulo: 'Ver registo de atividade',  descricao: 'Consultar o historico de acoes na plataforma.' }
    ];

    var COLECOES = ['frentes', 'comissoes', 'funcoes', 'usuarios', 'membros', 'postagens', 'mensagens', 'eventos', 'auditoria'];

    /* --------------------------------------------------------------------- */
    /* Utilitarios                                                            */
    /* --------------------------------------------------------------------- */
    function uid(prefixo) {
        return (prefixo || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    }

    function agora() {
        return new Date().toISOString();
    }

    function clonar(valor) {
        return JSON.parse(JSON.stringify(valor));
    }

    /* --------------------------------------------------------------------- */
    /* Leitura / escrita da base                                              */
    /* --------------------------------------------------------------------- */
    var cache = null;

    function base() {
        if (cache) { return cache; }
        var bruto = null;
        try { bruto = global.localStorage.getItem(CHAVE_DB); } catch (e) { bruto = null; }
        if (!bruto) {
            cache = dadosIniciais();
            gravar();
            return cache;
        }
        try {
            cache = JSON.parse(bruto);
        } catch (e) {
            cache = dadosIniciais();
        }
        // Garante que colecoes novas nao rebentam bases antigas.
        COLECOES.forEach(function (nome) {
            if (!Array.isArray(cache[nome])) { cache[nome] = []; }
        });
        return cache;
    }

    function gravar() {
        try {
            global.localStorage.setItem(CHAVE_DB, JSON.stringify(cache));
        } catch (e) {
            console.warn('Nao foi possivel gravar os dados localmente:', e);
        }
        if (typeof global.dispatchEvent === 'function') {
            global.dispatchEvent(new CustomEvent('store:alterado'));
        }
    }

    /* --------------------------------------------------------------------- */
    /* CRUD generico                                                          */
    /* --------------------------------------------------------------------- */
    function listar(colecao, filtro) {
        var itens = clonar(base()[colecao] || []);
        return typeof filtro === 'function' ? itens.filter(filtro) : itens;
    }

    function encontrar(colecao, id) {
        var achado = (base()[colecao] || []).filter(function (i) { return i.id === id; })[0];
        return achado ? clonar(achado) : null;
    }

    function inserir(colecao, item) {
        var db = base();
        if (!db[colecao]) { db[colecao] = []; }
        var novo = clonar(item);
        novo.id = novo.id || uid(colecao.slice(0, 3));
        novo.criadoEm = novo.criadoEm || agora();
        db[colecao].push(novo);
        gravar();
        return clonar(novo);
    }

    function atualizar(colecao, id, alteracoes) {
        var db = base();
        var lista = db[colecao] || [];
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].id === id) {
                Object.keys(alteracoes).forEach(function (k) { lista[i][k] = alteracoes[k]; });
                lista[i].atualizadoEm = agora();
                gravar();
                return clonar(lista[i]);
            }
        }
        return null;
    }

    function remover(colecao, id) {
        var db = base();
        var antes = (db[colecao] || []).length;
        db[colecao] = (db[colecao] || []).filter(function (i) { return i.id !== id; });
        gravar();
        return db[colecao].length < antes;
    }

    /* --------------------------------------------------------------------- */
    /* Registo de atividade (auditoria)                                       */
    /* --------------------------------------------------------------------- */
    function registar(acao, detalhe, usuarioId) {
        var autor = usuarioId;
        if (!autor && global.Auth && typeof global.Auth.usuarioAtual === 'function') {
            var u = global.Auth.usuarioAtual();
            autor = u ? u.id : null;
        }
        var db = base();
        db.auditoria.unshift({
            id: uid('log'),
            quando: agora(),
            usuarioId: autor || null,
            acao: acao,
            detalhe: detalhe || ''
        });
        // Mantem o registo com um tamanho razoavel no browser.
        if (db.auditoria.length > 400) { db.auditoria.length = 400; }
        gravar();
    }

    /* --------------------------------------------------------------------- */
    /* Reposicao / exportacao                                                 */
    /* --------------------------------------------------------------------- */
    function repor() {
        cache = dadosIniciais();
        gravar();
        return cache;
    }

    function exportar() {
        return JSON.stringify(base(), null, 2);
    }

    function importar(texto) {
        var dados = JSON.parse(texto);
        COLECOES.forEach(function (nome) {
            if (!Array.isArray(dados[nome])) { throw new Error('Ficheiro invalido: falta a coleccao "' + nome + '".'); }
        });
        cache = dados;
        gravar();
    }

    /* --------------------------------------------------------------------- */
    /* Dados de demonstracao                                                  */
    /* --------------------------------------------------------------------- */
    function dataRelativa(dias, hora) {
        var d = new Date();
        d.setDate(d.getDate() + dias);
        var iso = d.toISOString().slice(0, 10);
        return hora ? iso : iso;
    }

    function dadosIniciais() {
        var siv = 'fre_siv';
        var cine = 'fre_cine';

        var frentes = [
            {
                id: siv, nome: 'SIV — Simulado da ONU', sigla: 'SIV', cor: 'indigo', icone: 'globe',
                descricao: 'Simulacao das Nacoes Unidas da escola: comites, delegacoes, imprensa e cerimonial.',
                responsavel: 'Coordenacao do Protagonismo', ativo: true, criadoEm: agora()
            },
            {
                id: cine, nome: 'Cine Club', sigla: 'CINE', cor: 'amber', icone: 'clapperboard',
                descricao: 'Sessoes de cinema comentadas, curadoria de filmes e rodas de debate.',
                responsavel: 'Coordenacao do Protagonismo', ativo: true, criadoEm: agora()
            }
        ];

        var comissoes = [
            { id: 'com_secretariado', frenteId: siv, nome: 'Secretariado-Geral', sigla: 'SEC', descricao: 'Coordena os trabalhos, regimento e resolucao final.', coordenadorId: 'usu_helena', ativo: true, criadoEm: agora() },
            { id: 'com_seguranca',    frenteId: siv, nome: 'Conselho de Seguranca', sigla: 'CS', descricao: 'Comite de crise e negociacao entre delegacoes.', coordenadorId: null, ativo: true, criadoEm: agora() },
            { id: 'com_assembleia',   frenteId: siv, nome: 'Assembleia Geral', sigla: 'AG', descricao: 'Debate tematico aberto a todas as delegacoes.', coordenadorId: null, ativo: true, criadoEm: agora() },
            { id: 'com_imprensa',     frenteId: siv, nome: 'Imprensa e Comunicacao', sigla: 'IMP', descricao: 'Cobertura do evento, jornal do SIV e redes sociais.', coordenadorId: 'usu_bruno', ativo: true, criadoEm: agora() },
            { id: 'com_logistica',    frenteId: siv, nome: 'Logistica e Cerimonial', sigla: 'LOG', descricao: 'Espacos, credenciais, som, protocolo e abertura.', coordenadorId: 'usu_marta', ativo: true, criadoEm: agora() },
            { id: 'com_curadoria',    frenteId: cine, nome: 'Curadoria', sigla: 'CUR', descricao: 'Escolhe os filmes e prepara as fichas tecnicas.', coordenadorId: 'usu_rafa', ativo: true, criadoEm: agora() },
            { id: 'com_exibicao',     frenteId: cine, nome: 'Producao e Exibicao', sigla: 'EXI', descricao: 'Equipamento, sala, legendas e sessao.', coordenadorId: null, ativo: true, criadoEm: agora() }
        ];

        var funcoes = [
            {
                id: 'fun_supra', nome: 'Supra Admin', sistema: true, escopo: 'global',
                descricao: 'Coordenacao geral do Protagonismo. Ve toda a plataforma.',
                permissoes: PERMISSOES.map(function (p) { return p.chave; }), criadoEm: agora()
            },
            {
                id: 'fun_coord', nome: 'Coordenador de Comissao', sistema: true, escopo: 'comissao',
                descricao: 'Administra a sua comissao: membros, postagens, mensagens e agenda.',
                permissoes: ['membros.gerir', 'postagens.criar', 'mensagens.enviar', 'calendario.gerir', 'relatorios.ver'],
                criadoEm: agora()
            },
            {
                id: 'fun_imprensa', nome: 'Coordenador de Imprensa', sistema: false, escopo: 'comissao',
                descricao: 'Alem do painel normal, pode liberar postagens diretamente no portal publico.',
                permissoes: ['membros.gerir', 'postagens.criar', 'postagens.publicar', 'mensagens.enviar', 'calendario.gerir', 'relatorios.ver'],
                criadoEm: agora()
            },
            {
                id: 'fun_apoio', nome: 'Apoio de Comissao', sistema: false, escopo: 'comissao',
                descricao: 'Perfil reduzido: escreve postagens e consulta a agenda, sem gerir membros.',
                permissoes: ['postagens.criar', 'mensagens.enviar'],
                criadoEm: agora()
            }
        ];

        var usuarios = [
            {
                id: 'usu_supra', nome: 'Coordenacao do Protagonismo', email: 'supra@escola.pt', senha: 'supra123',
                perfil: 'supra', funcaoId: 'fun_supra', frenteIds: [], comissaoIds: [], cargo: 'Supra Admin',
                ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_helena', nome: 'Helena Rocha', email: 'helena@escola.pt', senha: 'siv123',
                perfil: 'admin', funcaoId: 'fun_coord', frenteIds: [], comissaoIds: ['com_secretariado'],
                cargo: 'Secretaria-Geral do SIV', ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_bruno', nome: 'Bruno Alves', email: 'bruno@escola.pt', senha: 'siv123',
                perfil: 'admin', funcaoId: 'fun_imprensa', frenteIds: [], comissaoIds: ['com_imprensa'],
                cargo: 'Coordenador de Imprensa', ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_marta', nome: 'Marta Nogueira', email: 'marta@escola.pt', senha: 'siv123',
                perfil: 'admin', funcaoId: 'fun_coord', frenteIds: [], comissaoIds: ['com_logistica'],
                cargo: 'Coordenadora de Logistica', ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_rafa', nome: 'Rafael Pinto', email: 'rafael@escola.pt', senha: 'cine123',
                perfil: 'admin', funcaoId: 'fun_coord', frenteIds: [], comissaoIds: ['com_curadoria'],
                cargo: 'Coordenador de Curadoria', ativo: true, criadoEm: agora(), ultimoAcesso: null
            }
        ];

        var membros = [
            { id: uid('mem'), comissaoId: 'com_imprensa', nome: 'Ana Beatriz Lima', turma: '9.º B', papel: 'Reporter', email: 'ana.lima@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_imprensa', nome: 'Diogo Ferreira', turma: '8.º A', papel: 'Fotografia', email: 'diogo.f@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_imprensa', nome: 'Sofia Marques', turma: '9.º A', papel: 'Redacao', email: 'sofia.m@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_logistica', nome: 'Tiago Nunes', turma: '9.º C', papel: 'Credenciais', email: 'tiago.n@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_logistica', nome: 'Carolina Dias', turma: '8.º B', papel: 'Cerimonial', email: 'carolina.d@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_secretariado', nome: 'Miguel Sousa', turma: '9.º A', papel: 'Diretor de Mesa', email: 'miguel.s@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_seguranca', nome: 'Ines Carvalho', turma: '9.º B', papel: 'Delegada', email: 'ines.c@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_curadoria', nome: 'Pedro Antunes', turma: '8.º C', papel: 'Pesquisa', email: 'pedro.a@aluno.pt', status: 'ativo', criadoEm: agora() }
        ];

        var postagens = [
            {
                id: uid('pos'), titulo: 'Abertura das inscricoes para o SIV 2026',
                resumo: 'As delegacoes ja podem inscrever-se nos comites do Simulado da ONU da escola.',
                conteudo: 'Estao abertas as inscricoes para o SIV 2026. Cada aluno pode escolher ate duas comissoes de preferencia. As vagas do Conselho de Seguranca sao limitadas e a selecao tem em conta a participacao nas formacoes preparatorias.\n\nAs inscricoes decorrem na biblioteca, durante os intervalos, ate ao final do mes.',
                autorId: 'usu_bruno', frenteId: siv, comissaoId: 'com_imprensa',
                visibilidade: 'publico', status: 'aprovado', destaque: true,
                tags: ['inscricoes', 'siv'], criadoEm: agora(), publicadoEm: agora()
            },
            {
                id: uid('pos'), titulo: 'Guia de trajes e protocolo do cerimonial',
                resumo: 'Como se apresentar na sessao de abertura do SIV.',
                conteudo: 'A comissao de Logistica e Cerimonial preparou o guia de traje formal para a sessao de abertura. Delegados devem apresentar-se com traje social e o cracha de identificacao entregue na receccao.',
                autorId: 'usu_marta', frenteId: siv, comissaoId: 'com_logistica',
                visibilidade: 'interno', status: 'aprovado', destaque: false,
                tags: ['cerimonial'], criadoEm: agora(), publicadoEm: agora()
            },
            {
                id: uid('pos'), titulo: 'Cine Club: sessao sobre cinema e memoria',
                resumo: 'A proxima sessao do Cine Club discute memoria historica atraves do cinema.',
                conteudo: 'A curadoria selecionou um filme que aborda memoria historica e identidade. A sessao termina com uma roda de conversa mediada pelos alunos do 9.º ano.',
                autorId: 'usu_rafa', frenteId: cine, comissaoId: 'com_curadoria',
                visibilidade: 'publico', status: 'pendente', destaque: false,
                tags: ['cineclub', 'sessao'], criadoEm: agora(), publicadoEm: null
            }
        ];

        var mensagens = [
            {
                id: uid('msg'), assunto: 'Reuniao geral de coordenadores',
                corpo: 'Todos os coordenadores de comissao devem comparecer a reuniao geral de alinhamento do SIV, na sala 12, para fecharmos o cronograma do evento.',
                autorId: 'usu_supra', alcance: 'geral', frenteId: null, comissaoId: null,
                prioridade: 'alta', criadoEm: agora(), lidasPor: []
            },
            {
                id: uid('msg'), assunto: 'Cobertura fotografica da abertura',
                corpo: 'A equipa de imprensa precisa de dois fotografos para a sessao de abertura. Quem puder, responda na reuniao de quinta.',
                autorId: 'usu_supra', alcance: 'frente', frenteId: siv, comissaoId: null,
                prioridade: 'normal', criadoEm: agora(), lidasPor: []
            }
        ];

        var eventos = [
            { id: uid('evt'), titulo: 'Formacao: como redigir uma resolucao', data: dataRelativa(3), hora: '14:30', local: 'Biblioteca', frenteId: siv, comissaoId: 'com_secretariado', tipo: 'formacao', publico: true, descricao: 'Oficina preparatoria para delegados.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Reuniao da comissao de Imprensa', data: dataRelativa(5), hora: '13:00', local: 'Sala 12', frenteId: siv, comissaoId: 'com_imprensa', tipo: 'reuniao', publico: false, descricao: 'Fecho do jornal do SIV.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Sessao de abertura do SIV', data: dataRelativa(12), hora: '09:00', local: 'Auditorio', frenteId: siv, comissaoId: null, tipo: 'evento', publico: true, descricao: 'Cerimonia de abertura com todas as delegacoes.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Cine Club — sessao de cinema e memoria', data: dataRelativa(8), hora: '15:00', local: 'Auditorio', frenteId: cine, comissaoId: 'com_curadoria', tipo: 'evento', publico: true, descricao: 'Exibicao seguida de debate.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Entrega das credenciais', data: dataRelativa(11), hora: '10:00', local: 'Atrio', frenteId: siv, comissaoId: 'com_logistica', tipo: 'prazo', publico: false, descricao: 'Distribuicao de crachas por delegacao.', criadoEm: agora() }
        ];

        return {
            versao: 1,
            frentes: frentes,
            comissoes: comissoes,
            funcoes: funcoes,
            usuarios: usuarios,
            membros: membros,
            postagens: postagens,
            mensagens: mensagens,
            eventos: eventos,
            auditoria: [
                { id: uid('log'), quando: agora(), usuarioId: 'usu_supra', acao: 'Plataforma iniciada', detalhe: 'Dados de demonstracao carregados.' }
            ]
        };
    }

    /* --------------------------------------------------------------------- */
    global.Store = {
        PERMISSOES: PERMISSOES,
        COLECOES: COLECOES,
        uid: uid,
        agora: agora,
        base: base,
        listar: listar,
        encontrar: encontrar,
        inserir: inserir,
        atualizar: atualizar,
        remover: remover,
        registar: registar,
        repor: repor,
        exportar: exportar,
        importar: importar
    };
})(window);
