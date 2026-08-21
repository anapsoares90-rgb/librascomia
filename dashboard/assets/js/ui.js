/* =========================================================================
   UI — componentes reutilizaveis (toasts, modais, formularios, cartoes)
   ========================================================================= */
(function (global) {
    'use strict';

    var MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

    var CORES = {
        indigo:  { chip: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',   solido: 'bg-indigo-600',  ponto: 'bg-indigo-400' },
        amber:   { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30',      solido: 'bg-amber-600',   ponto: 'bg-amber-400' },
        emerald: { chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',solido: 'bg-emerald-600', ponto: 'bg-emerald-400' },
        sky:     { chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30',            solido: 'bg-sky-600',     ponto: 'bg-sky-400' },
        rose:    { chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30',         solido: 'bg-rose-600',    ponto: 'bg-rose-400' },
        violet:  { chip: 'bg-violet-500/15 text-violet-300 border-violet-500/30',   solido: 'bg-violet-600',  ponto: 'bg-violet-400' },
        slate:   { chip: 'bg-slate-500/15 text-slate-300 border-slate-500/30',      solido: 'bg-slate-600',   ponto: 'bg-slate-400' }
    };

    function cor(nome) { return CORES[nome] || CORES.slate; }

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

    function icones() {
        if (global.lucide && typeof global.lucide.createIcons === 'function') {
            global.lucide.createIcons();
        }
    }

    /* --------------------------------------------------------------------- */
    /* Datas                                                                  */
    /* --------------------------------------------------------------------- */
    function dataHoje() {
        return new Date().toISOString().slice(0, 10);
    }

    function dataCurta(iso) {
        if (!iso) { return '—'; }
        var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
        if (isNaN(d.getTime())) { return '—'; }
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }

    function dataLonga(iso) {
        if (!iso) { return '—'; }
        var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
        if (isNaN(d.getTime())) { return '—'; }
        return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    }

    function dataHora(iso) {
        if (!iso) { return '—'; }
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return '—'; }
        return dataCurta(iso) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function haQuanto(iso) {
        if (!iso) { return '—'; }
        var diff = Date.now() - new Date(iso).getTime();
        var min = Math.floor(diff / 60000);
        if (min < 1) { return 'agora mesmo'; }
        if (min < 60) { return 'ha ' + min + ' min'; }
        var h = Math.floor(min / 60);
        if (h < 24) { return 'ha ' + h + 'h'; }
        var d = Math.floor(h / 24);
        if (d < 30) { return 'ha ' + d + (d === 1 ? ' dia' : ' dias'); }
        return dataCurta(iso);
    }

    /* --------------------------------------------------------------------- */
    /* Toast                                                                  */
    /* --------------------------------------------------------------------- */
    function toast(mensagem, tipo) {
        var caixa = document.getElementById('toast-root');
        if (!caixa) { return; }
        var estilos = {
            sucesso: 'bg-emerald-600 border-emerald-400',
            erro: 'bg-rose-600 border-rose-400',
            aviso: 'bg-amber-600 border-amber-400',
            info: 'bg-indigo-600 border-indigo-400'
        };
        var icone = { sucesso: 'check-circle-2', erro: 'alert-circle', aviso: 'alert-triangle', info: 'info' };
        var el = document.createElement('div');
        el.className = 'flex items-center gap-3 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-2xl border-l-4 ' +
            (estilos[tipo] || estilos.info) + ' animate-slide-in';
        el.innerHTML = '<i data-lucide="' + (icone[tipo] || 'info') + '" class="w-4 h-4 shrink-0"></i><span>' + esc(mensagem) + '</span>';
        caixa.appendChild(el);
        icones();
        setTimeout(function () {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(function () { el.remove(); }, 300);
        }, 3200);
    }

    /* --------------------------------------------------------------------- */
    /* Modal                                                                  */
    /* --------------------------------------------------------------------- */
    function fecharModal() {
        var raiz = document.getElementById('modal-root');
        if (raiz) { raiz.innerHTML = ''; raiz.classList.add('hidden'); }
    }

    function modal(opcoes) {
        var raiz = document.getElementById('modal-root');
        if (!raiz) { return; }
        var largura = opcoes.largura || 'max-w-lg';
        raiz.innerHTML =
            '<div class="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">' +
                '<div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" data-fechar="1"></div>' +
                '<div class="relative w-full ' + largura + ' bg-slate-850 border border-slate-700 rounded-2xl shadow-2xl my-8 animate-pop">' +
                    '<div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-700">' +
                        '<div>' +
                            '<h3 class="text-base font-bold text-white">' + esc(opcoes.titulo || '') + '</h3>' +
                            (opcoes.subtitulo ? '<p class="text-xs text-slate-400 mt-0.5">' + esc(opcoes.subtitulo) + '</p>' : '') +
                        '</div>' +
                        '<button type="button" data-fechar="1" class="text-slate-400 hover:text-white transition-all p-1 rounded-lg hover:bg-slate-700">' +
                            '<i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div id="modal-corpo" class="px-5 py-4">' + (opcoes.corpo || '') + '</div>' +
                    (opcoes.rodape ? '<div class="px-5 py-4 border-t border-slate-700 flex justify-end gap-2">' + opcoes.rodape + '</div>' : '') +
                '</div>' +
            '</div>';
        raiz.classList.remove('hidden');
        raiz.querySelectorAll('[data-fechar]').forEach(function (b) {
            b.addEventListener('click', fecharModal);
        });
        icones();
        if (typeof opcoes.aoAbrir === 'function') { opcoes.aoAbrir(raiz); }
    }

    function confirmar(opcoes) {
        modal({
            titulo: opcoes.titulo || 'Confirmar',
            largura: 'max-w-md',
            corpo: '<p class="text-sm text-slate-300 leading-relaxed">' + esc(opcoes.mensagem || '') + '</p>',
            rodape:
                '<button type="button" data-fechar="1" class="btn-secundario">Cancelar</button>' +
                '<button type="button" id="btn-confirmar" class="btn-perigo">' + esc(opcoes.confirmar || 'Eliminar') + '</button>',
            aoAbrir: function (raiz) {
                raiz.querySelector('#btn-confirmar').addEventListener('click', function () {
                    fecharModal();
                    if (typeof opcoes.aoConfirmar === 'function') { opcoes.aoConfirmar(); }
                });
            }
        });
    }

    /* --------------------------------------------------------------------- */
    /* Formularios dentro de modal                                            */
    /* campos: { nome, rotulo, tipo, valor, opcoes, obrigatorio, ajuda, ... }  */
    /* tipos: text | email | password | textarea | select | date | time |      */
    /*        number | checkbox | checkboxes | radios                          */
    /* --------------------------------------------------------------------- */
    function campoHTML(c) {
        var id = 'campo-' + c.nome;
        var req = c.obrigatorio ? ' required' : '';
        var html = '<div class="' + (c.largura === 'metade' ? 'sm:col-span-1' : 'sm:col-span-2') + '">';

        if (c.tipo !== 'checkbox') {
            html += '<label for="' + id + '" class="rotulo">' + esc(c.rotulo) +
                    (c.obrigatorio ? ' <span class="text-rose-400">*</span>' : '') + '</label>';
        }

        switch (c.tipo) {
            case 'textarea':
                html += '<textarea id="' + id + '" name="' + c.nome + '" rows="' + (c.linhas || 4) + '"' + req +
                        ' placeholder="' + esc(c.placeholder || '') + '" class="campo">' + esc(c.valor || '') + '</textarea>';
                break;
            case 'select':
                html += '<select id="' + id + '" name="' + c.nome + '"' + req + ' class="campo">';
                (c.opcoes || []).forEach(function (o) {
                    var selecionado = String(o.valor) === String(c.valor) ? ' selected' : '';
                    html += '<option value="' + esc(o.valor) + '"' + selecionado + '>' + esc(o.rotulo) + '</option>';
                });
                html += '</select>';
                break;
            case 'checkbox':
                html += '<label class="flex items-start gap-3 cursor-pointer bg-slate-800/60 border border-slate-700 rounded-xl p-3 hover:border-slate-600 transition-all">' +
                        '<input type="checkbox" id="' + id + '" name="' + c.nome + '"' + (c.valor ? ' checked' : '') +
                        ' class="mt-0.5 w-4 h-4 accent-indigo-500">' +
                        '<span><span class="text-sm text-slate-200 font-medium">' + esc(c.rotulo) + '</span>' +
                        (c.ajuda ? '<span class="block text-xs text-slate-400 mt-0.5">' + esc(c.ajuda) + '</span>' : '') +
                        '</span></label>';
                break;
            case 'checkboxes':
                html += '<div class="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">';
                (c.opcoes || []).forEach(function (o) {
                    var marcado = (c.valor || []).indexOf(o.valor) !== -1 ? ' checked' : '';
                    html += '<label class="flex items-start gap-3 cursor-pointer bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 hover:border-indigo-500/40 transition-all">' +
                            '<input type="checkbox" name="' + c.nome + '" value="' + esc(o.valor) + '"' + marcado +
                            ' class="mt-0.5 w-4 h-4 accent-indigo-500">' +
                            '<span><span class="text-sm text-slate-200">' + esc(o.rotulo) + '</span>' +
                            (o.ajuda ? '<span class="block text-[11px] text-slate-400">' + esc(o.ajuda) + '</span>' : '') +
                            '</span></label>';
                });
                html += '</div>';
                break;
            default:
                html += '<input type="' + (c.tipo || 'text') + '" id="' + id + '" name="' + c.nome + '"' + req +
                        ' value="' + esc(c.valor === undefined || c.valor === null ? '' : c.valor) + '"' +
                        ' placeholder="' + esc(c.placeholder || '') + '" class="campo">';
        }

        if (c.ajuda && c.tipo !== 'checkbox') {
            html += '<p class="text-[11px] text-slate-400 mt-1">' + esc(c.ajuda) + '</p>';
        }
        html += '</div>';
        return html;
    }

    function formulario(opcoes) {
        var campos = opcoes.campos || [];
        var corpo = '<form id="form-modal" class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            campos.map(campoHTML).join('') +
            (opcoes.nota ? '<div class="sm:col-span-2 text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 flex gap-2"><i data-lucide="info" class="w-4 h-4 shrink-0 text-indigo-400"></i><span>' + esc(opcoes.nota) + '</span></div>' : '') +
            '</form>';

        modal({
            titulo: opcoes.titulo,
            subtitulo: opcoes.subtitulo,
            largura: opcoes.largura || 'max-w-2xl',
            corpo: corpo,
            rodape:
                '<button type="button" data-fechar="1" class="btn-secundario">Cancelar</button>' +
                '<button type="button" id="btn-guardar" class="btn-primario">' + esc(opcoes.botao || 'Guardar') + '</button>',
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

    /* --------------------------------------------------------------------- */
    /* Blocos de apresentacao                                                 */
    /* --------------------------------------------------------------------- */
    function cabecalho(titulo, subtitulo, acoes) {
        return '<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">' +
                    '<div>' +
                        '<h2 class="text-2xl font-bold text-white tracking-tight">' + esc(titulo) + '</h2>' +
                        '<p class="text-sm text-slate-400 mt-1">' + esc(subtitulo || '') + '</p>' +
                    '</div>' +
                    '<div class="flex flex-wrap items-center gap-2">' + (acoes || '') + '</div>' +
                '</div>';
    }

    function vazio(mensagem, icone) {
        return '<div class="text-center py-14 px-6">' +
                    '<div class="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">' +
                        '<i data-lucide="' + (icone || 'inbox') + '" class="w-6 h-6 text-slate-500"></i>' +
                    '</div>' +
                    '<p class="text-sm text-slate-400 max-w-sm mx-auto">' + esc(mensagem) + '</p>' +
                '</div>';
    }

    function cartao(conteudo, classes) {
        return '<div class="bg-slate-850 border border-slate-700 rounded-2xl ' + (classes || '') + '">' + conteudo + '</div>';
    }

    function chip(texto, corNome, icone) {
        return '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ' +
               cor(corNome).chip + '">' +
               (icone ? '<i data-lucide="' + icone + '" class="w-3 h-3"></i>' : '') + esc(texto) + '</span>';
    }

    function estatistica(rotulo, valor, icone, corNome, extra) {
        var c = cor(corNome);
        return '<div class="bg-slate-850 border border-slate-700 rounded-2xl p-4 hover:border-slate-600 transition-all">' +
                    '<div class="flex items-start justify-between gap-3">' +
                        '<div class="min-w-0">' +
                            '<p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold truncate">' + esc(rotulo) + '</p>' +
                            '<p class="text-3xl font-bold text-white mt-1 leading-none">' + esc(valor) + '</p>' +
                            (extra ? '<p class="text-xs text-slate-400 mt-2">' + esc(extra) + '</p>' : '') +
                        '</div>' +
                        '<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + c.chip.split(' ')[0] + ' border ' + c.chip.split(' ')[2] + '">' +
                            '<i data-lucide="' + icone + '" class="w-5 h-5 ' + c.chip.split(' ')[1] + '"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>';
    }

    function barra(rotulo, valor, maximo, corNome) {
        var pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
        return '<div class="mb-3 last:mb-0">' +
                    '<div class="flex justify-between text-xs mb-1.5">' +
                        '<span class="text-slate-300 truncate pr-2">' + esc(rotulo) + '</span>' +
                        '<span class="text-slate-400 font-semibold shrink-0">' + valor + '</span>' +
                    '</div>' +
                    '<div class="h-2 bg-slate-800 rounded-full overflow-hidden">' +
                        '<div class="h-full rounded-full ' + cor(corNome).solido + ' transition-all" style="width:' + pct + '%"></div>' +
                    '</div>' +
                '</div>';
    }

    function iniciais(nome) {
        var partes = String(nome || '?').trim().split(/\s+/);
        return ((partes[0] || '')[0] || '?').toUpperCase() + (partes.length > 1 ? (partes[partes.length - 1][0] || '').toUpperCase() : '');
    }

    function avatar(nome, corNome, tamanho) {
        var t = tamanho || 'w-9 h-9 text-xs';
        return '<div class="' + t + ' rounded-full ' + cor(corNome).solido + ' text-white font-bold flex items-center justify-center shrink-0">' +
               esc(iniciais(nome)) + '</div>';
    }

    /* --------------------------------------------------------------------- */
    global.UI = {
        MESES: MESES, DIAS: DIAS, CORES: CORES, cor: cor,
        esc: esc, nl2br: nl2br, icones: icones,
        dataHoje: dataHoje, dataCurta: dataCurta, dataLonga: dataLonga, dataHora: dataHora, haQuanto: haQuanto,
        toast: toast, modal: modal, fecharModal: fecharModal, confirmar: confirmar, formulario: formulario,
        cabecalho: cabecalho, vazio: vazio, cartao: cartao, chip: chip,
        estatistica: estatistica, barra: barra, avatar: avatar, iniciais: iniciais
    };
})(window);
