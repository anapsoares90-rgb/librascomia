/* =========================================================================
   UI — pecas de interface reutilizadas pelas vistas.
   O aspeto vive em app.css; aqui so montamos a marcacao com nomes de classe.
   ========================================================================= */
(function (global) {
    'use strict';

    var MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var TONS = ['indigo', 'amber', 'emerald', 'sky', 'rose', 'violet', 'slate'];

    /* Cada frente/estado tem um "tom": uma classe que define --tom em CSS. */
    function tom(nome) {
        return 'tom-' + (TONS.indexOf(nome) !== -1 ? nome : 'slate');
    }

    /* --------------------------------------------------------------------- */
    function esc(texto) {
        if (texto === null || texto === undefined) { return ''; }
        return String(texto)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function nl2br(texto) {
        return esc(texto).replace(/\n/g, '<br>');
    }

    function icone(nome, tamanho) {
        return '<i data-lucide="' + esc(nome) + '" style="width:' + (tamanho || 16) + 'px;height:' + (tamanho || 16) + 'px" class="shrink-0"></i>';
    }

    function icones() {
        if (global.lucide && typeof global.lucide.createIcons === 'function') {
            global.lucide.createIcons();
        }
    }

    /* ------------------------------------------------------------- Datas -- */
    function dataHoje() {
        return new Date().toISOString().slice(0, 10);
    }

    function paraData(iso) {
        if (!iso) { return null; }
        var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
        return isNaN(d.getTime()) ? null : d;
    }

    function dataCurta(iso) {
        var d = paraData(iso);
        if (!d) { return '—'; }
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }

    function dataLonga(iso) {
        var d = paraData(iso);
        if (!d) { return '—'; }
        return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    }

    function dataHora(iso) {
        var d = paraData(iso);
        if (!d) { return '—'; }
        return dataCurta(iso) + ', ' + String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
    }

    function haQuanto(iso) {
        var d = paraData(iso);
        if (!d) { return '—'; }
        var min = Math.floor((Date.now() - d.getTime()) / 60000);
        if (min < 1) { return 'agora mesmo'; }
        if (min < 60) { return 'ha ' + min + ' min'; }
        var h = Math.floor(min / 60);
        if (h < 24) { return 'ha ' + h + 'h'; }
        var dias = Math.floor(h / 24);
        if (dias === 1) { return 'ontem'; }
        if (dias < 30) { return 'ha ' + dias + ' dias'; }
        return dataCurta(iso);
    }

    /* ------------------------------------------------------------ Toasts -- */
    function toast(mensagem, tipo) {
        var caixa = document.getElementById('toast-root');
        if (!caixa) { return; }
        var icones_ = { sucesso: 'check', erro: 'x', aviso: 'alert-triangle', info: 'arrow-right' };
        var el = document.createElement('div');
        el.className = 'toast' + (tipo && tipo !== 'sucesso' && tipo !== 'info' ? ' toast--' + tipo : '');
        el.innerHTML = icone(icones_[tipo] || 'check', 14) + '<span>' + esc(mensagem) + '</span>';
        caixa.appendChild(el);
        icones();
        setTimeout(function () {
            el.style.opacity = '0';
            el.style.transform = 'translateY(6px)';
            setTimeout(function () { el.remove(); }, 280);
        }, 3000);
    }

    /* ------------------------------------------------------------- Modais - */
    function fecharModal() {
        var raiz = document.getElementById('modal-root');
        if (!raiz) { return; }
        raiz.innerHTML = '';
        raiz.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function modal(opcoes) {
        var raiz = document.getElementById('modal-root');
        if (!raiz) { return; }
        raiz.innerHTML =
            '<div class="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">' +
                '<div class="modal-fundo" data-fechar="1"></div>' +
                '<div class="modal-caixa w-full ' + (opcoes.largura || 'max-w-lg') + ' my-8">' +
                    '<div class="modal-cabeca">' +
                        '<div>' +
                            '<h3 class="serifa" style="font-size:1.1rem;line-height:1.3">' + esc(opcoes.titulo || '') + '</h3>' +
                            (opcoes.subtitulo ? '<p class="nota" style="margin-top:.2rem">' + esc(opcoes.subtitulo) + '</p>' : '') +
                        '</div>' +
                        '<button type="button" data-fechar="1" class="btn btn--nu" aria-label="Fechar">' + icone('x', 16) + '</button>' +
                    '</div>' +
                    '<div class="modal-corpo">' + (opcoes.corpo || '') + '</div>' +
                    (opcoes.rodape ? '<div class="modal-rodape">' + opcoes.rodape + '</div>' : '') +
                '</div>' +
            '</div>';
        raiz.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        raiz.querySelectorAll('[data-fechar]').forEach(function (b) { b.addEventListener('click', fecharModal); });
        icones();
        if (typeof opcoes.aoAbrir === 'function') { opcoes.aoAbrir(raiz); }
    }

    function confirmar(opcoes) {
        modal({
            titulo: opcoes.titulo || 'Confirmar',
            largura: 'max-w-md',
            corpo: '<p class="texto-medio">' + esc(opcoes.mensagem || '') + '</p>',
            rodape:
                '<button type="button" data-fechar="1" class="btn">Cancelar</button>' +
                '<button type="button" id="btn-confirmar" class="btn btn--perigo">' + esc(opcoes.confirmar || 'Eliminar') + '</button>',
            aoAbrir: function (raiz) {
                raiz.querySelector('#btn-confirmar').addEventListener('click', function () {
                    fecharModal();
                    if (typeof opcoes.aoConfirmar === 'function') { opcoes.aoConfirmar(); }
                });
            }
        });
    }

    /* -------------------------------------------------------- Formularios - */
    function campoHTML(c) {
        var id = 'campo-' + c.nome;
        var req = c.obrigatorio ? ' required' : '';
        var html = '<div class="' + (c.largura === 'metade' ? 'sm:col-span-1' : 'sm:col-span-2') + '">';

        if (c.tipo !== 'checkbox') {
            html += '<label for="' + id + '" class="rotulo">' + esc(c.rotulo) + (c.obrigatorio ? ' *' : '') + '</label>';
        }

        switch (c.tipo) {
            case 'textarea':
                html += '<textarea id="' + id + '" name="' + c.nome + '" rows="' + (c.linhas || 4) + '"' + req +
                        ' placeholder="' + esc(c.placeholder || '') + '" class="campo">' + esc(c.valor || '') + '</textarea>';
                break;
            case 'select':
                html += '<select id="' + id + '" name="' + c.nome + '"' + req + ' class="campo">' +
                    (c.opcoes || []).map(function (o) {
                        return '<option value="' + esc(o.valor) + '"' + (String(o.valor) === String(c.valor) ? ' selected' : '') + '>' + esc(o.rotulo) + '</option>';
                    }).join('') + '</select>';
                break;
            case 'checkbox':
                html += '<label class="escolha">' +
                        '<input type="checkbox" id="' + id + '" name="' + c.nome + '"' + (c.valor ? ' checked' : '') + '>' +
                        '<span><span class="escolha__titulo">' + esc(c.rotulo) + '</span>' +
                        (c.ajuda ? '<span class="escolha__nota">' + esc(c.ajuda) + '</span>' : '') + '</span></label>';
                break;
            case 'checkboxes':
                html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">' +
                    (c.opcoes || []).map(function (o) {
                        return '<label class="escolha">' +
                            '<input type="checkbox" name="' + c.nome + '" value="' + esc(o.valor) + '"' +
                            ((c.valor || []).indexOf(o.valor) !== -1 ? ' checked' : '') + '>' +
                            '<span><span class="escolha__titulo">' + esc(o.rotulo) + '</span>' +
                            (o.ajuda ? '<span class="escolha__nota">' + esc(o.ajuda) + '</span>' : '') + '</span></label>';
                    }).join('') + '</div>';
                break;
            default:
                html += '<input type="' + (c.tipo || 'text') + '" id="' + id + '" name="' + c.nome + '"' + req +
                        ' value="' + esc(c.valor === undefined || c.valor === null ? '' : c.valor) + '"' +
                        ' placeholder="' + esc(c.placeholder || '') + '" class="campo">';
        }

        if (c.ajuda && c.tipo !== 'checkbox') {
            html += '<p class="nota" style="margin-top:.35rem">' + esc(c.ajuda) + '</p>';
        }
        return html + '</div>';
    }

    function formulario(opcoes) {
        var campos = opcoes.campos || [];
        modal({
            titulo: opcoes.titulo,
            subtitulo: opcoes.subtitulo,
            largura: opcoes.largura || 'max-w-2xl',
            corpo: '<form id="form-modal" class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">' +
                   campos.map(campoHTML).join('') +
                   (opcoes.nota ? '<p class="sm:col-span-2 nota">' + esc(opcoes.nota) + '</p>' : '') +
                   '</form>',
            rodape:
                '<button type="button" data-fechar="1" class="btn">Cancelar</button>' +
                '<button type="button" id="btn-guardar" class="btn btn--principal">' + esc(opcoes.botao || 'Guardar') + '</button>',
            aoAbrir: function (raiz) {
                var form = raiz.querySelector('#form-modal');
                function submeter() {
                    if (!form.reportValidity()) { return; }
                    var dados = {};
                    campos.forEach(function (c) {
                        if (c.tipo === 'checkboxes') {
                            dados[c.nome] = Array.prototype.slice
                                .call(form.querySelectorAll('input[name="' + c.nome + '"]:checked'))
                                .map(function (i) { return i.value; });
                        } else if (c.tipo === 'checkbox') {
                            var cb = form.querySelector('#campo-' + c.nome);
                            dados[c.nome] = !!(cb && cb.checked);
                        } else {
                            var el = form.querySelector('[name="' + c.nome + '"]');
                            dados[c.nome] = el ? el.value.trim() : '';
                        }
                    });
                    var erro = typeof opcoes.validar === 'function' ? opcoes.validar(dados) : null;
                    if (erro) { toast(erro, 'erro'); return; }
                    fecharModal();
                    opcoes.aoGuardar(dados);
                }
                raiz.querySelector('#btn-guardar').addEventListener('click', submeter);
                form.addEventListener('submit', function (e) { e.preventDefault(); submeter(); });
                var primeiro = form.querySelector('input, textarea, select');
                if (primeiro) { primeiro.focus(); }
            }
        });
    }

    /* --------------------------------------------------------- Estruturas - */
    function cabecalho(sobrancelha, titulo, subtitulo, acoes) {
        return '<header class="pagina-cabeca">' +
                    '<div>' +
                        (sobrancelha ? '<p class="sobrancelha">' + esc(sobrancelha) + '</p>' : '') +
                        '<h2 class="titulo-pagina" style="margin-top:.35rem">' + esc(titulo) + '</h2>' +
                        (subtitulo ? '<p class="subtitulo">' + esc(subtitulo) + '</p>' : '') +
                    '</div>' +
                    (acoes ? '<div class="pagina-cabeca__acoes">' + acoes + '</div>' : '') +
                '</header>';
    }

    function painel(titulo, corpo, opcoes) {
        opcoes = opcoes || {};
        return '<section class="painel ' + (opcoes.classe || '') + '">' +
                    (titulo
                        ? '<div class="painel__cabeca">' +
                            '<h3 class="titulo-painel">' + esc(titulo) + '</h3>' +
                            (opcoes.acao || '') +
                          '</div>'
                        : '') +
                    '<div class="' + (opcoes.semPadding ? '' : 'painel__corpo') + '">' + corpo + '</div>' +
                '</section>';
    }

    function metricas(itens) {
        return '<div class="metricas">' + itens.map(function (m) {
            return '<div class="metrica ' + tom(m.tom || 'slate') + '">' +
                        '<p class="sobrancelha">' + esc(m.rotulo) + '</p>' +
                        '<p class="metrica__valor" data-contar="' + esc(m.valor) + '">' + esc(m.valor) + '</p>' +
                        (m.nota ? '<p class="metrica__nota">' + esc(m.nota) + '</p>' : '') +
                    '</div>';
        }).join('') + '</div>';
    }

    /* Anima os numeros das metricas ao entrar na vista. */
    function animarNumeros(raiz) {
        if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
        raiz.querySelectorAll('[data-contar]').forEach(function (el) {
            var alvo = parseInt(el.getAttribute('data-contar'), 10);
            if (isNaN(alvo) || alvo === 0) { return; }
            var inicio = performance.now();
            var duracao = Math.min(140 + alvo * 22, 700);
            function passo(agora) {
                var t = Math.min((agora - inicio) / duracao, 1);
                el.textContent = Math.round(alvo * (1 - Math.pow(1 - t, 3)));
                if (t < 1) { requestAnimationFrame(passo); }
            }
            el.textContent = '0';
            requestAnimationFrame(passo);
        });
    }

    function etiqueta(texto, tomNome, opcoes) {
        opcoes = opcoes || {};
        var classes = 'etiqueta ' + tom(tomNome);
        if (opcoes.forte) { classes += ' etiqueta--forte'; }
        if (opcoes.contorno) { classes += ' etiqueta--contorno'; }
        if (opcoes.semPonto) { classes += ' etiqueta--sem-ponto'; }
        return '<span class="' + classes + '">' + esc(texto) + '</span>';
    }

    function pastilha(texto, tomNome) {
        return '<span class="pastilha ' + tom(tomNome) + '">' + esc(texto) + '</span>';
    }

    function vazio(mensagem, icone_) {
        return '<div class="vazio">' +
                    '<div class="vazio__icone">' + icone(icone_ || 'inbox', 22) + '</div>' +
                    '<p>' + esc(mensagem) + '</p>' +
                '</div>';
    }

    function barra(rotulo, valor, maximo, tomNome) {
        var pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
        return '<div class="barra ' + tom(tomNome) + '">' +
                    '<div class="barra__topo">' +
                        '<span class="barra__nome">' + esc(rotulo) + '</span>' +
                        '<span class="barra__valor">' + valor + '</span>' +
                    '</div>' +
                    '<div class="barra__trilho"><div class="barra__preenchimento" style="width:' + pct + '%"></div></div>' +
                '</div>';
    }

    function iniciais(nome) {
        var partes = String(nome || '?').trim().split(/\s+/);
        return ((partes[0] || '')[0] || '?').toUpperCase() +
               (partes.length > 1 ? (partes[partes.length - 1][0] || '').toUpperCase() : '');
    }

    function avatar(nome, tomNome, tamanho) {
        return '<span class="avatar ' + tom(tomNome) + (tamanho ? ' avatar--' + tamanho : '') + '">' + esc(iniciais(nome)) + '</span>';
    }

    function dataBloco(iso) {
        var d = paraData(iso);
        if (!d) { return ''; }
        return '<div class="data-bloco">' +
                    '<div class="data-bloco__mes">' + MESES[d.getMonth()].slice(0, 3) + '</div>' +
                    '<div class="data-bloco__dia">' + d.getDate() + '</div>' +
                '</div>';
    }

    function aviso(texto, tomNome, icone_) {
        return '<div class="aviso ' + tom(tomNome || 'amber') + '">' + icone(icone_ || 'alert-triangle', 16) + '<div>' + texto + '</div></div>';
    }

    /* ------------------------------------------------- Guardar ficheiros -- */
    /* No navegador normal descarrega logo; dentro do visualizador de
       artefactos da claude.ai pede autorizacao ao visitante. */
    function descarregarDireto(nome, conteudo, tipo) {
        var blob = new Blob([conteudo], { type: tipo });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function guardarFicheiro(nome, conteudo, tipo) {
        var claude = global.claude;
        if (!claude || typeof claude.use !== 'function') {
            descarregarDireto(nome, conteudo, tipo);
            toast('Ficheiro descarregado.', 'sucesso');
            return;
        }
        claude.use('downloads').then(function (downloads) {
            if (!downloads) {
                descarregarDireto(nome, conteudo, tipo);
                toast('Ficheiro descarregado.', 'sucesso');
                return;
            }
            downloads.save({ filename: nome, data: conteudo })
                .then(function () { toast('Ficheiro guardado.', 'sucesso'); })
                .catch(function (erro) {
                    var codigo = erro && erro.code;
                    if (codigo === 'declined') { return; }
                    if (codigo === 'extension_not_enabled' || codigo === 'rejected_extension') {
                        downloads.save({ filename: nome.replace(/\.[^.]+$/, '') + '.txt', data: conteudo })
                            .then(function () { toast('Ficheiro guardado.', 'sucesso'); })
                            .catch(function () { toast('Nao foi possivel guardar o ficheiro aqui.', 'erro'); });
                        return;
                    }
                    toast('Nao foi possivel guardar o ficheiro aqui.', 'erro');
                });
        });
    }

    /* --------------------------------------------------------------------- */
    global.UI = {
        MESES: MESES, DIAS: DIAS, TONS: TONS, tom: tom,
        esc: esc, nl2br: nl2br, icone: icone, icones: icones,
        dataHoje: dataHoje, dataCurta: dataCurta, dataLonga: dataLonga, dataHora: dataHora, haQuanto: haQuanto,
        toast: toast, modal: modal, fecharModal: fecharModal, confirmar: confirmar, formulario: formulario,
        cabecalho: cabecalho, painel: painel, metricas: metricas, animarNumeros: animarNumeros,
        etiqueta: etiqueta, pastilha: pastilha, vazio: vazio, barra: barra,
        avatar: avatar, iniciais: iniciais, dataBloco: dataBloco, aviso: aviso,
        guardarFicheiro: guardarFicheiro
    };
})(window);
