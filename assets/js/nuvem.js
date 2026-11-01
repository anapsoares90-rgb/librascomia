/* =========================================================================
   Nuvem — ponte entre o painel e o Firebase (Firestore + Authentication)
   -------------------------------------------------------------------------
   O painel inteiro lê os dados de forma síncrona (Store.listar(...) devolve
   logo um array). O Firestore é assíncrono. Em vez de reescrever as telas
   todas, esta camada mantém um ESPELHO em memória, igual ao formato local,
   alimentado por onSnapshot: a leitura continua instantânea e, quando alguém
   noutro computador muda alguma coisa, o espelho atualiza-se e a tela
   redesenha sozinha.

   Escritas: vão para o Firestore e, ao mesmo tempo, para o espelho (para a
   interface responder na hora). Se a escrita falhar, avisa e desfaz.
   ========================================================================= */
(function (global) {
    'use strict';

    var COLECOES = ['frentes', 'comissoes', 'funcoes', 'usuarios', 'membros', 'postagens',
                    'mensagens', 'eventos', 'auditoria', 'delegacoes', 'sessoes', 'discursos',
                    'mocoes', 'inscricoes', 'pagamentos'];

    /* Sem login, o visitante só pode ler isto (ver firestore.rules). */
    var PUBLICAS = {
        frentes: null,
        comissoes: null,
        postagens: [['visibilidade', '==', 'publico'], ['status', '==', 'aprovado']],
        eventos: [['publico', '==', true]]
    };

    var estado = 'local';          // local | ligando | ligada | erro
    var ultimoErro = null;
    var app = null, bd = null, autenticacao = null;
    var espelho = null;
    var assinaturas = [];
    var aoMudar = null;            // callback para redesenhar
    var redesenhar = null;

    function configurado() {
        return !!(global.CONFIG && global.CONFIG.usarNuvem && global.CONFIG.firebase &&
                  global.CONFIG.firebase.projectId);
    }

    function sdkPresente() {
        return typeof global.firebase !== 'undefined' &&
               typeof global.firebase.initializeApp === 'function';
    }

    function disponivel() {
        return configurado() && sdkPresente();
    }

    function ligada() {
        return estado === 'ligada' && !!espelho;
    }

    function situacao() {
        return { estado: estado, erro: ultimoErro, projeto: configurado() ? global.CONFIG.firebase.projectId : null };
    }

    /* --------------------------------------------------------------------- */
    function iniciar() {
        if (app || !disponivel()) { return !!app; }
        try {
            app = global.firebase.initializeApp(global.CONFIG.firebase);
            bd = global.firebase.firestore();
            autenticacao = global.firebase.auth();
            return true;
        } catch (e) {
            estado = 'erro';
            ultimoErro = e && e.message ? e.message : String(e);
            console.warn('Firebase não iniciou:', e);
            return false;
        }
    }

    function espelhoVazio() {
        var db = { versao: 1 };
        COLECOES.forEach(function (c) { db[c] = []; });
        return db;
    }

    /* Agenda um redesenho: várias mensagens seguidas do Firestore dão só um. */
    function avisar() {
        if (redesenhar) { return; }
        redesenhar = setTimeout(function () {
            redesenhar = null;
            if (typeof aoMudar === 'function') { aoMudar(); }
        }, 120);
    }

    function pararAssinaturas() {
        assinaturas.forEach(function (parar) {
            try { parar(); } catch (e) { /* já parada */ }
        });
        assinaturas = [];
    }

    /* Ouve as coleções em tempo real. `publicas` limita ao que o visitante vê. */
    function sincronizar(somentePublicas, aoFicarPronta) {
        if (!iniciar()) {
            if (aoFicarPronta) { aoFicarPronta(false); }
            return;
        }
        pararAssinaturas();
        espelho = espelhoVazio();
        estado = 'ligando';

        var alvos = somentePublicas ? Object.keys(PUBLICAS) : COLECOES;
        var porChegar = alvos.length;
        var jaAvisou = false;

        /* Se o Firestore não responder (rede em baixo, regras a recusar),
           não deixamos a interface à espera para sempre. */
        var desistir = setTimeout(function () {
            if (jaAvisou) { return; }
            jaAvisou = true;
            porChegar = 0;
            estado = 'erro';
            ultimoErro = ultimoErro || 'O Firestore não respondeu a tempo.';
            pararAssinaturas();
            if (aoFicarPronta) { aoFicarPronta(false); }
        }, 10000);

        alvos.forEach(function (colecao) {
            var consulta = bd.collection(colecao);
            var filtros = somentePublicas ? PUBLICAS[colecao] : null;
            if (filtros) {
                filtros.forEach(function (f) { consulta = consulta.where(f[0], f[1], f[2]); });
            }

            var parar = consulta.onSnapshot(function (resultado) {
                var itens = [];
                resultado.forEach(function (doc) {
                    var dados = doc.data() || {};
                    dados.id = doc.id;
                    itens.push(dados);
                });
                espelho[colecao] = itens;

                if (porChegar > 0) {
                    porChegar -= 1;
                    if (porChegar === 0 && !jaAvisou) {
                        jaAvisou = true;
                        clearTimeout(desistir);
                        estado = 'ligada';
                        if (aoFicarPronta) { aoFicarPronta(true); }
                    }
                } else {
                    avisar();
                }
            }, function (erro) {
                estado = 'erro';
                ultimoErro = erro && erro.message ? erro.message : String(erro);
                console.warn('Firestore (' + colecao + '):', erro);
                if (porChegar > 0) {
                    porChegar = 0;
                    if (!jaAvisou) {
                        jaAvisou = true;
                        clearTimeout(desistir);
                        if (aoFicarPronta) { aoFicarPronta(false); }
                    }
                }
            });
            assinaturas.push(parar);
        });
    }

    /* --------------------------------------------------------------------- */
    /* Escritas                                                               */
    /* --------------------------------------------------------------------- */
    function limpar(dados) {
        var copia = {};
        Object.keys(dados).forEach(function (k) {
            if (k !== 'id' && dados[k] !== undefined) { copia[k] = dados[k]; }
        });
        return copia;
    }

    function escrever(colecao, id, dados) {
        if (!ligada()) { return Promise.resolve(); }
        return bd.collection(colecao).doc(id).set(limpar(dados), { merge: true })
            .catch(function (erro) {
                console.warn('Não foi possível gravar em ' + colecao + ':', erro);
                if (global.UI) { UI.toast('Não foi possível salvar na nuvem: ' + (erro.code || erro.message), 'erro'); }
            });
    }

    function apagar(colecao, id) {
        if (!ligada()) { return Promise.resolve(); }
        return bd.collection(colecao).doc(id).delete()
            .catch(function (erro) {
                console.warn('Não foi possível apagar de ' + colecao + ':', erro);
                if (global.UI) { UI.toast('Não foi possível excluir na nuvem: ' + (erro.code || erro.message), 'erro'); }
            });
    }

    /* --------------------------------------------------------------------- */
    /* Autenticação                                                           */
    /* --------------------------------------------------------------------- */
    function entrar(email, senha, pronto) {
        if (!iniciar()) {
            pronto({ ok: false, erro: 'A ligação ao Firebase não está disponível.' });
            return;
        }
        autenticacao.signInWithEmailAndPassword(email, senha)
            .then(function (credencial) {
                var uid = credencial.user.uid;
                return bd.collection('papeis').doc(uid).get().then(function (doc) {
                    if (!doc.exists) {
                        return autenticacao.signOut().then(function () {
                            pronto({
                                ok: false,
                                erro: 'Esta conta ainda não tem papel atribuído. A coordenação precisa criar o documento papeis/' + uid + ' no Firebase.'
                            });
                        });
                    }
                    var papel = doc.data() || {};
                    pronto({ ok: true, uid: uid, email: credencial.user.email, perfil: papel.perfil || 'admin', usuarioId: papel.usuarioId || null });
                });
            })
            .catch(function (erro) {
                var mensagens = {
                    'auth/invalid-email': 'E-mail inválido.',
                    'auth/user-not-found': 'Não existe conta com esse e-mail.',
                    'auth/wrong-password': 'Senha incorreta.',
                    'auth/invalid-credential': 'E-mail ou senha incorretos.',
                    'auth/too-many-requests': 'Muitas tentativas. Tente de novo daqui a pouco.',
                    'auth/network-request-failed': 'Sem ligação à internet.'
                };
                pronto({
                    ok: false,
                    erro: mensagens[erro.code] || ('Não foi possível entrar: ' + erro.message),
                    rede: erro.code === 'auth/network-request-failed' || erro.code === 'unavailable'
                });
            });
    }

    function sair() {
        if (autenticacao) {
            autenticacao.signOut().catch(function () { /* já estava fora */ });
        }
        pararAssinaturas();
        estado = 'local';
    }

    function usuarioAuth() {
        return autenticacao ? autenticacao.currentUser : null;
    }

    /* --------------------------------------------------------------------- */
    /* Envio dos dados locais para o Firestore (primeira carga)               */
    /* --------------------------------------------------------------------- */
    function enviarTudo(dadosLocais, pronto) {
        if (!iniciar()) { pronto({ ok: false, erro: 'Firebase indisponível.' }); return; }
        var lotes = [];
        var lote = bd.batch();
        var contador = 0;
        var total = 0;

        COLECOES.forEach(function (colecao) {
            (dadosLocais[colecao] || []).forEach(function (item) {
                lote.set(bd.collection(colecao).doc(item.id), limpar(item), { merge: true });
                contador += 1;
                total += 1;
                if (contador === 400) { lotes.push(lote); lote = bd.batch(); contador = 0; }
            });
        });
        if (contador > 0) { lotes.push(lote); }

        var i = 0;
        function proximo() {
            if (i >= lotes.length) { pronto({ ok: true, total: total }); return; }
            lotes[i].commit().then(function () { i += 1; proximo(); })
                .catch(function (erro) { pronto({ ok: false, erro: erro.message, enviados: i * 400 }); });
        }
        proximo();
    }

    /* --------------------------------------------------------------------- */
    global.Nuvem = {
        COLECOES: COLECOES,
        configurado: configurado,
        sdkPresente: sdkPresente,
        disponivel: disponivel,
        ligada: ligada,
        situacao: situacao,
        iniciar: iniciar,
        sincronizar: sincronizar,
        espelho: function () { return espelho; },
        escrever: escrever,
        apagar: apagar,
        entrar: entrar,
        sair: sair,
        usuarioAuth: usuarioAuth,
        enviarTudo: enviarTudo,
        aoMudar: function (fn) { aoMudar = fn; }
    };
})(window);
