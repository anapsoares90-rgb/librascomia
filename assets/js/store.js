/* =========================================================================
   Store — camada de dados do Dashboard Protagonismo
   -------------------------------------------------------------------------
   Toda a persistencia da aplicacao passa por aqui (localStorage do browser).
   O resto do código NUNCA acede ao localStorage diretamente: assim, para
   migrar mais tarde para um servidor real (Supabase, Firebase, API propria)
   basta reescrever as funções deste arquivo.
   ========================================================================= */
(function (global) {
    'use strict';

    var CHAVE_DB = 'protagonismo.db.v1';

    /* ---------------------------------------------------------------------
       Catalogo de permissões (as "funções do painel" sao combinacoes destas)
       --------------------------------------------------------------------- */
    var PERMISSOES = [
        { chave: 'plataforma.total',  grupo: 'Plataforma', rotulo: 'Acesso total a plataforma', descricao: 'Ve e edita tudo, em todas as frentes e comitês.' },
        { chave: 'frentes.gerir',     grupo: 'Plataforma', rotulo: 'Gerenciar frentes',             descricao: 'Criar e editar frentes do protagonismo (SIV, Cine Club, ...).' },
        { chave: 'comissoes.gerir',   grupo: 'Plataforma', rotulo: 'Gerenciar comitês',           descricao: 'Criar comitês e nomear coordenadores.' },
        { chave: 'funcoes.gerir',     grupo: 'Plataforma', rotulo: 'Gerenciar funções do painel',   descricao: 'Cadastrar perfis de acesso e as suas permissões.' },
        { chave: 'usuarios.gerir',    grupo: 'Plataforma', rotulo: 'Gerenciar coordenadores',       descricao: 'Adicionar coordenadores e atribuir funções.' },
        { chave: 'membros.gerir',     grupo: 'Comissao',   rotulo: 'Gerenciar membros',             descricao: 'Cadastrar os alunos membros do comitê.' },
        { chave: 'postagens.criar',   grupo: 'Conteudo',   rotulo: 'Criar postagens',           descricao: 'Escrever comunicados para membros ou para o público.' },
        { chave: 'postagens.publicar',grupo: 'Conteudo',   rotulo: 'Liberar postagens',         descricao: 'Aprovar / liberar postagens no portal público.' },
        { chave: 'mensagens.enviar',  grupo: 'Comunicação',rotulo: 'Enviar mensagens',          descricao: 'Comunicar com a propria comitê.' },
        { chave: 'mensagens.geral',   grupo: 'Comunicação',rotulo: 'Comunicado geral',          descricao: 'Enviar mensagens para todos os comitês de uma frente ou para a plataforma inteira.' },
        { chave: 'calendario.gerir',  grupo: 'Agenda',     rotulo: 'Gerenciar calendário',          descricao: 'Criar e editar eventos da agenda.' },
        { chave: 'debate.presidir',   grupo: 'Debate',     rotulo: 'Presidir a mesa',           descricao: 'Conduzir a sessão: chamada, lista de oradores, cronometro e moções.' },
        { chave: 'delegacoes.gerir',  grupo: 'Debate',     rotulo: 'Gerenciar delegações',          descricao: 'Alocar paises as delegações e acompanhar os DPOs.' },
        { chave: 'inscricoes.gerir',  grupo: 'Inscrições', rotulo: 'Gerenciar inscrições',          descricao: 'Receber, aceitar e alocar as inscrições dos participantes.' },
        { chave: 'financeiro.gerir',  grupo: 'Inscrições', rotulo: 'Gerenciar pagamentos',          descricao: 'Registrar pagamentos das inscrições e ver os totais.' },
        { chave: 'relatorios.ver',    grupo: 'Gestao',     rotulo: 'Ver relatórios',            descricao: 'Acompanhar indicadores e produção dos comitês.' },
        { chave: 'auditoria.ver',     grupo: 'Gestao',     rotulo: 'Ver registro de atividade',  descricao: 'Consultar o histórico de ações na plataforma.' }
    ];

    var COLECOES = ['frentes', 'comissoes', 'funcoes', 'usuarios', 'membros', 'postagens', 'mensagens', 'eventos', 'auditoria',
                    'delegacoes', 'sessoes', 'discursos', 'mocoes', 'inscricoes', 'pagamentos'];

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

    /* Com a nuvem ligada, a "base" é o espelho sincronizado do Firestore. */
    function modoNuvem() {
        return !!(global.Nuvem && global.Nuvem.ligada());
    }

    function base() {
        if (modoNuvem()) { return global.Nuvem.espelho(); }
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
        // Garante que colecoes novas não rebentam bases antigas.
        COLECOES.forEach(function (nome) {
            if (!Array.isArray(cache[nome])) { cache[nome] = []; }
        });
        return cache;
    }

    /* Os dados deste navegador, mesmo quando a nuvem está ligada.
       Serve para o envio inicial para o Firestore. */
    function baseLocal() {
        try {
            var bruto = global.localStorage.getItem(CHAVE_DB);
            if (bruto) { return JSON.parse(bruto); }
        } catch (e) { /* sem acesso ao armazenamento */ }
        return cache || dadosIniciais();
    }

    function gravar() {
        if (!modoNuvem()) {
            try {
                global.localStorage.setItem(CHAVE_DB, JSON.stringify(cache));
            } catch (e) {
                console.warn('Não foi possível salvar os dados localmente:', e);
            }
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
        if (modoNuvem()) { global.Nuvem.escrever(colecao, novo.id, novo); }
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
                if (modoNuvem()) { global.Nuvem.escrever(colecao, id, lista[i]); }
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
        if (modoNuvem()) { global.Nuvem.apagar(colecao, id); }
        gravar();
        return db[colecao].length < antes;
    }

    /* --------------------------------------------------------------------- */
    /* Registro de atividade (auditoria)                                       */
    /* --------------------------------------------------------------------- */
    function registar(acao, detalhe, usuarioId) {
        var autor = usuarioId;
        if (!autor && global.Auth && typeof global.Auth.usuarioAtual === 'function') {
            var u = global.Auth.usuarioAtual();
            autor = u ? u.id : null;
        }
        var db = base();
        var registo = {
            id: uid('log'),
            quando: agora(),
            usuarioId: autor || null,
            acao: acao,
            detalhe: detalhe || ''
        };
        db.auditoria.unshift(registo);
        if (modoNuvem()) { global.Nuvem.escrever('auditoria', registo.id, registo); }
        // Mantem o registro com um tamanho razoavel no browser.
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
            if (!Array.isArray(dados[nome])) { throw new Error('Arquivo invalido: falta a coleccao "' + nome + '".'); }
        });
        cache = dados;
        gravar();
    }

    /* --------------------------------------------------------------------- */
    /* Dados de demonstração                                                  */
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
                descricao: 'Simulação das Nacoes Unidas da escola: comitês, delegações, imprensa e cerimonial.',
                responsavel: 'Coordenação do Protagonismo', ativo: true, criadoEm: agora()
            },
            {
                id: cine, nome: 'Cine Club', sigla: 'CINE', cor: 'amber', icone: 'clapperboard',
                descricao: 'Sessões de cinema comentadas, curadoria de filmes e rodas de debate.',
                responsavel: 'Coordenação do Protagonismo', ativo: true, criadoEm: agora()
            }
        ];

        var comissoes = [
            { id: 'com_secretariado', frenteId: siv, nome: 'Secretariado-Geral', sigla: 'SEC', descricao: 'Coordena os trabalhos, regimento e resolucao final.', coordenadorId: 'usu_helena', ativo: true, criadoEm: agora() },
            { id: 'com_seguranca',    frenteId: siv, nome: 'Conselho de Segurança', sigla: 'CS', descricao: 'Comitê de crise e negociacao entre delegações.', coordenadorId: 'usu_helena', ativo: true, criadoEm: agora() },
            { id: 'com_assembleia',   frenteId: siv, nome: 'Assembleia Geral', sigla: 'AG', descricao: 'Debate tematico aberto a todas as delegações.', coordenadorId: null, ativo: true, criadoEm: agora() },
            { id: 'com_imprensa',     frenteId: siv, nome: 'Imprensa e Comunicação', sigla: 'IMP', descricao: 'Cobertura do evento, jornal do SIV e redes sociais.', coordenadorId: 'usu_bruno', ativo: true, criadoEm: agora() },
            { id: 'com_logistica',    frenteId: siv, nome: 'Logística e Cerimonial', sigla: 'LOG', descricao: 'Espacos, credenciais, som, protocolo e abertura.', coordenadorId: 'usu_marta', ativo: true, criadoEm: agora() },
            { id: 'com_curadoria',    frenteId: cine, nome: 'Curadoria', sigla: 'CUR', descricao: 'Escolha os filmes e prepara as fichas tecnicas.', coordenadorId: 'usu_rafa', ativo: true, criadoEm: agora() },
            { id: 'com_exibicao',     frenteId: cine, nome: 'Produção e Exibição', sigla: 'EXI', descricao: 'Equipamento, sala, legendas e sessão.', coordenadorId: null, ativo: true, criadoEm: agora() }
        ];

        var funcoes = [
            {
                id: 'fun_supra', nome: 'Supra Admin', sistema: true, escopo: 'global',
                descricao: 'Coordenação geral do Protagonismo. Ve toda a plataforma.',
                permissoes: PERMISSOES.map(function (p) { return p.chave; }), criadoEm: agora()
            },
            {
                id: 'fun_coord', nome: 'Coordenador de Comitê', sistema: true, escopo: 'comissao',
                descricao: 'Administra a seu comitê: membros, postagens, mensagens e agenda.',
                permissoes: ['membros.gerir', 'postagens.criar', 'mensagens.enviar', 'calendario.gerir', 'relatorios.ver'],
                criadoEm: agora()
            },
            {
                id: 'fun_imprensa', nome: 'Coordenador de Imprensa', sistema: false, escopo: 'comissao',
                descricao: 'Alem do painel normal, pode liberar postagens diretamente no portal público.',
                permissoes: ['membros.gerir', 'postagens.criar', 'postagens.publicar', 'mensagens.enviar', 'calendario.gerir', 'relatorios.ver'],
                criadoEm: agora()
            },
            {
                id: 'fun_mesa', nome: 'Mesa de Comitê (presidência)', sistema: false, escopo: 'comissao',
                descricao: 'Preside as sessões do SiV: chamada, lista de oradores, cronometro, moções e delegações.',
                permissoes: ['debate.presidir', 'delegacoes.gerir', 'membros.gerir', 'postagens.criar',
                             'mensagens.enviar', 'calendario.gerir', 'relatorios.ver'],
                criadoEm: agora()
            },
            {
                id: 'fun_apoio', nome: 'Apoio de Comitê', sistema: false, escopo: 'comissao',
                descricao: 'Perfil reduzido: escreve postagens e consulta a agenda, sem gerenciar membros.',
                permissoes: ['postagens.criar', 'mensagens.enviar'],
                criadoEm: agora()
            }
        ];

        var usuarios = [
            {
                id: 'usu_supra', nome: 'Coordenação do Protagonismo', email: 'supra@escola.pt', senha: 'supra123',
                perfil: 'supra', funcaoId: 'fun_supra', frenteIds: [], comissaoIds: [], cargo: 'Supra Admin',
                ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_helena', nome: 'Helena Rocha', email: 'helena@escola.pt', senha: 'siv123',
                perfil: 'admin', funcaoId: 'fun_mesa', frenteIds: [], comissaoIds: ['com_secretariado', 'com_seguranca'],
                cargo: 'Secretária-Geral e mesa do Conselho de Segurança', ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_bruno', nome: 'Bruno Alves', email: 'bruno@escola.pt', senha: 'siv123',
                perfil: 'admin', funcaoId: 'fun_imprensa', frenteIds: [], comissaoIds: ['com_imprensa'],
                cargo: 'Coordenador de Imprensa', ativo: true, criadoEm: agora(), ultimoAcesso: null
            },
            {
                id: 'usu_marta', nome: 'Marta Nogueira', email: 'marta@escola.pt', senha: 'siv123',
                perfil: 'admin', funcaoId: 'fun_coord', frenteIds: [], comissaoIds: ['com_logistica'],
                cargo: 'Coordenadora de Logística', ativo: true, criadoEm: agora(), ultimoAcesso: null
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
            { id: uid('mem'), comissaoId: 'com_seguranca', nome: 'Inês Carvalho', turma: '9.º B', papel: 'Delegada', email: 'ines.c@aluno.pt', status: 'ativo', criadoEm: agora() },
            { id: uid('mem'), comissaoId: 'com_curadoria', nome: 'Pedro Antunes', turma: '8.º C', papel: 'Pesquisa', email: 'pedro.a@aluno.pt', status: 'ativo', criadoEm: agora() }
        ];

        var postagens = [
            {
                id: uid('pos'), titulo: 'Abertura das inscrições para o SIV 2026',
                resumo: 'As delegações já podem inscrever-se nos comitês do Simulado da ONU da escola.',
                conteudo: 'Estao abertas as inscrições para o SIV 2026. Cada aluno pode escolher ate dois comitês de preferencia. As vagas do Conselho de Segurança sao limitadas e a selecao tem em conta a participacao nas formacoes preparatorias.\n\nAs inscrições decorrem na biblioteca, durante os intervalos, ate ao final do mes.',
                autorId: 'usu_bruno', frenteId: siv, comissaoId: 'com_imprensa',
                visibilidade: 'publico', status: 'aprovado', destaque: true,
                tags: ['inscricoes', 'siv'], criadoEm: agora(), publicadoEm: agora()
            },
            {
                id: uid('pos'), titulo: 'Guia de trajes e protocolo do cerimonial',
                resumo: 'Como se apresentar na sessão de abertura do SIV.',
                conteudo: 'O comitê de Logística e Cerimonial preparou o guia de traje formal para a sessão de abertura. Delegados devem apresentar-se com traje social e o cracha de identificação entregue na receccao.',
                autorId: 'usu_marta', frenteId: siv, comissaoId: 'com_logistica',
                visibilidade: 'interno', status: 'aprovado', destaque: false,
                tags: ['cerimonial'], criadoEm: agora(), publicadoEm: agora()
            },
            {
                id: uid('pos'), titulo: 'Cine Club: sessão sobre cinema e memoria',
                resumo: 'A próxima sessão do Cine Club discute memoria historica atraves do cinema.',
                conteudo: 'A curadoria selecionou um filme que aborda memoria historica e identidade. A sessão termina com uma roda de conversa mediada pelos alunos do 9.º ano.',
                autorId: 'usu_rafa', frenteId: cine, comissaoId: 'com_curadoria',
                visibilidade: 'publico', status: 'pendente', destaque: false,
                tags: ['cineclub', 'sessao'], criadoEm: agora(), publicadoEm: null
            }
        ];

        var mensagens = [
            {
                id: uid('msg'), assunto: 'Reuniao geral de coordenadores',
                corpo: 'Todos os coordenadores de comitê devem comparecer a reuniao geral de alinhamento do SIV, na sala 12, para fecharmos o cronograma do evento.',
                autorId: 'usu_supra', alcance: 'geral', frenteId: null, comissaoId: null,
                prioridade: 'alta', criadoEm: agora(), lidasPor: []
            },
            {
                id: uid('msg'), assunto: 'Cobertura fotografica da abertura',
                corpo: 'A equipe de imprensa precisa de dois fotografos para a sessão de abertura. Quem puder, responda na reuniao de quinta.',
                autorId: 'usu_supra', alcance: 'frente', frenteId: siv, comissaoId: null,
                prioridade: 'normal', criadoEm: agora(), lidasPor: []
            }
        ];

        var eventos = [
            { id: uid('evt'), titulo: 'Formação: como redigir uma resolucao', data: dataRelativa(3), hora: '14:30', local: 'Biblioteca', frenteId: siv, comissaoId: 'com_secretariado', tipo: 'formacao', publico: true, descricao: 'Oficina preparatoria para delegados.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Reuniao do comitê de Imprensa', data: dataRelativa(5), hora: '13:00', local: 'Sala 12', frenteId: siv, comissaoId: 'com_imprensa', tipo: 'reuniao', publico: false, descricao: 'Fecho do jornal do SIV.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Sessão de abertura do SIV', data: dataRelativa(12), hora: '09:00', local: 'Auditorio', frenteId: siv, comissaoId: null, tipo: 'evento', publico: true, descricao: 'Cerimonia de abertura com todas as delegações.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Cine Club — sessão de cinema e memoria', data: dataRelativa(8), hora: '15:00', local: 'Auditorio', frenteId: cine, comissaoId: 'com_curadoria', tipo: 'evento', publico: true, descricao: 'Exibição seguida de debate.', criadoEm: agora() },
            { id: uid('evt'), titulo: 'Entregue das credenciais', data: dataRelativa(11), hora: '10:00', local: 'Atrio', frenteId: siv, comissaoId: 'com_logistica', tipo: 'prazo', publico: false, descricao: 'Distribuicao de crachas por delegação.', criadoEm: agora() }
        ];

        /* ----------------------------------------------------------------
           SiV — Simulação Viva: delegações, sessão de debate e inscrições
           ---------------------------------------------------------------- */
        function delegacao(id, comissaoId, pais, bandeira, delegado, turma, presenca, dpo) {
            return {
                id: id, comissaoId: comissaoId, pais: pais, bandeira: bandeira,
                delegado: delegado, turma: turma, presenca: presenca, dpo: dpo,
                inscricaoId: null, criadoEm: agora()
            };
        }

        var delegacoes = [
            delegacao('del_bra', 'com_seguranca', 'Brasil', '\uD83C\uDDE7\uD83C\uDDF7', 'Lucas Andrade', '9.º A', 'votante', 'entregue'),
            delegacao('del_eua', 'com_seguranca', 'Estados Unidos', '\uD83C\uDDFA\uD83C\uDDF8', 'Beatriz Nogueira', '9.º B', 'votante', 'entregue'),
            delegacao('del_chn', 'com_seguranca', 'China', '\uD83C\uDDE8\uD83C\uDDF3', 'Enzo Tanaka', '9.º A', 'votante', 'entregue'),
            delegacao('del_rus', 'com_seguranca', 'Rússia', '\uD83C\uDDF7\uD83C\uDDFA', 'Mariana Lopes', '9.º C', 'votante', 'pendente'),
            delegacao('del_fra', 'com_seguranca', 'França', '\uD83C\uDDEB\uD83C\uDDF7', 'Gabriel Moreira', '8.º A', 'presente', 'entregue'),
            delegacao('del_gbr', 'com_seguranca', 'Reino Unido', '\uD83C\uDDEC\uD83C\uDDE7', 'Helena Vilar', '9.º B', 'presente', 'pendente'),
            delegacao('del_jpn', 'com_seguranca', 'Japão', '\uD83C\uDDEF\uD83C\uDDF5', 'Rafaela Souza', '8.º B', 'presente', 'entregue'),
            delegacao('del_egy', 'com_seguranca', 'Egito', '\uD83C\uDDEA\uD83C\uDDEC', 'Caio Bernardes', '9.º A', 'ausente', 'pendente'),
            delegacao('del_zaf', 'com_seguranca', 'África do Sul', '\uD83C\uDDFF\uD83C\uDDE6', 'Lara Figueiredo', '8.º C', 'presente', 'entregue'),
            delegacao('del_ind', 'com_seguranca', 'Índia', '\uD83C\uDDEE\uD83C\uDDF3', 'Vítor Hugo Dias', '9.º C', 'ausente', 'pendente'),

            delegacao('del_prt', 'com_assembleia', 'Portugal', '\uD83C\uDDF5\uD83C\uDDF9', 'Matilde Correia', '8.º A', 'votante', 'entregue'),
            delegacao('del_arg', 'com_assembleia', 'Argentina', '\uD83C\uDDE6\uD83C\uDDF7', 'Thiago Ramos', '8.º B', 'votante', 'entregue'),
            delegacao('del_mex', 'com_assembleia', 'México', '\uD83C\uDDF2\uD83C\uDDFD', 'Sofia Guerra', '9.º A', 'presente', 'pendente'),
            delegacao('del_can', 'com_assembleia', 'Canada', '\uD83C\uDDE8\uD83C\uDDE6', 'Nuno Barreto', '8.º C', 'presente', 'entregue'),
            delegacao('del_nga', 'com_assembleia', 'Nigéria', '\uD83C\uDDF3\uD83C\uDDEC', 'Alice Monteiro', '9.º B', 'presente', 'pendente'),
            delegacao('del_aus', 'com_assembleia', 'Austrália', '\uD83C\uDDE6\uD83C\uDDFA', 'Pedro Cavalcanti', '8.º A', 'ausente', 'pendente')
        ];

        var sessaoCS = {
            id: 'ses_cs', comissaoId: 'com_seguranca', aberta: true,
            modo: 'lista', topico: 'Crise hídrica e segurança regional',
            tempoOrador: 90, tempoTotal: 0,
            oradorAtual: 'del_bra', fila: ['del_chn', 'del_eua', 'del_jpn'],
            cronometro: { correndo: false, inicio: null, acumulado: 0 },
            abertaEm: agora(), encerradaEm: null, criadoEm: agora()
        };

        var discursos = [
            { id: uid('dis'), comissaoId: 'com_seguranca', sessaoId: 'ses_cs', delegacaoId: 'del_eua', segundos: 88, quando: agora() },
            { id: uid('dis'), comissaoId: 'com_seguranca', sessaoId: 'ses_cs', delegacaoId: 'del_rus', segundos: 90, quando: agora() },
            { id: uid('dis'), comissaoId: 'com_seguranca', sessaoId: 'ses_cs', delegacaoId: 'del_bra', segundos: 76, quando: agora() },
            { id: uid('dis'), comissaoId: 'com_seguranca', sessaoId: 'ses_cs', delegacaoId: 'del_fra', segundos: 61, quando: agora() },
            { id: uid('dis'), comissaoId: 'com_seguranca', sessaoId: 'ses_cs', delegacaoId: 'del_eua', segundos: 90, quando: agora() }
        ];

        var mocoes = [
            {
                id: uid('moc'), comissaoId: 'com_seguranca', tipo: 'moderado',
                descricao: 'Caucus moderado sobre o acesso a água potável',
                proponenteId: 'del_bra', tempoTotal: 600, tempoOrador: 60,
                votos: { favor: 7, contra: 1, abstencao: 1 },
                estado: 'aprovada', quando: agora(), criadoEm: agora()
            },
            {
                id: uid('moc'), comissaoId: 'com_seguranca', tipo: 'simples',
                descricao: 'Caucus não moderado para redigir o documento de trabalho',
                proponenteId: 'del_chn', tempoTotal: 480, tempoOrador: 0,
                votos: { favor: 0, contra: 0, abstencao: 0 },
                estado: 'proposta', quando: agora(), criadoEm: agora()
            }
        ];

        var inscricoes = [
            {
                id: 'ins_1', nome: 'Clara Benevides', email: 'clara.b@aluno.pt', turma: '9.º A',
                frenteId: siv, comissaoId: 'com_seguranca', paisPreferido: 'Alemanha', tipo: 'delegado',
                status: 'recebida', delegacaoId: null, criadoEm: agora()
            },
            {
                id: 'ins_2', nome: 'Henrique Vasques', email: 'henrique.v@aluno.pt', turma: '8.º B',
                frenteId: siv, comissaoId: 'com_assembleia', paisPreferido: 'Itália', tipo: 'delegado',
                status: 'recebida', delegacaoId: null, criadoEm: agora()
            },
            {
                id: 'ins_3', nome: 'Lucas Andrade', email: 'lucas.a@aluno.pt', turma: '9.º A',
                frenteId: siv, comissaoId: 'com_seguranca', paisPreferido: 'Brasil', tipo: 'delegado',
                status: 'alocada', delegacaoId: 'del_bra', criadoEm: agora()
            },
            {
                id: 'ins_4', nome: 'Joana Pires', email: 'joana.p@aluno.pt', turma: '7.º B',
                frenteId: siv, comissaoId: 'com_imprensa', paisPreferido: '', tipo: 'imprensa',
                status: 'aceite', delegacaoId: null, criadoEm: agora()
            }
        ];

        var pagamentos = [
            { id: uid('pag'), inscricaoId: 'ins_3', nome: 'Lucas Andrade', descricao: 'Inscrição de delegado', valor: 5, estado: 'pago', metodo: 'Secretaria', data: agora(), criadoEm: agora() },
            { id: uid('pag'), inscricaoId: 'ins_4', nome: 'Joana Pires', descricao: 'Inscrição de imprensa', valor: 5, estado: 'pendente', metodo: '', data: null, criadoEm: agora() },
            { id: uid('pag'), inscricaoId: 'ins_1', nome: 'Clara Benevides', descricao: 'Inscrição de delegado', valor: 5, estado: 'isento', metodo: 'Bolsa', data: agora(), criadoEm: agora() }
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
            delegacoes: delegacoes,
            sessoes: [sessaoCS],
            discursos: discursos,
            mocoes: mocoes,
            inscricoes: inscricoes,
            pagamentos: pagamentos,
            auditoria: [
                { id: uid('log'), quando: agora(), usuarioId: 'usu_supra', acao: 'Plataforma iniciada', detalhe: 'Dados de demonstração carregados.' }
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
        modoNuvem: modoNuvem,
        baseLocal: baseLocal,
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
