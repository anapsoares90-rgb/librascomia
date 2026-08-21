/* ============================== Calendario ============================= */
(function (global) {
    'use strict';

    var hoje = new Date();
    var estado = { ano: hoje.getFullYear(), mes: hoje.getMonth(), frenteId: '' };

    function iso(ano, mes, dia) {
        return ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
    }

    function eventosDoMes() {
        var prefixo = estado.ano + '-' + String(estado.mes + 1).padStart(2, '0');
        return Dados.eventosVisiveis().filter(function (e) {
            if (estado.frenteId && e.frenteId !== estado.frenteId) { return false; }
            return (e.data || '').indexOf(prefixo) === 0;
        });
    }

    function formulario(evento, dataSugerida) {
        var edicao = !!evento;
        var frentes = Dados.opcoesFrentes();
        if (!frentes.length) { UI.toast('Sem frentes disponiveis.', 'aviso'); return; }
        var eu = Auth.usuarioAtual();

        UI.formulario({
            titulo: edicao ? 'Editar evento' : 'Novo evento na agenda',
            subtitulo: 'Reunioes, formacoes, prazos e sessoes das frentes do Protagonismo.',
            largura: 'max-w-2xl',
            botao: edicao ? 'Guardar evento' : 'Agendar',
            campos: [
                { nome: 'titulo', rotulo: 'Titulo do evento', tipo: 'text', valor: edicao ? evento.titulo : '', obrigatorio: true },
                { nome: 'data', rotulo: 'Data', tipo: 'date', largura: 'metade', obrigatorio: true, valor: edicao ? evento.data : (dataSugerida || UI.dataHoje()) },
                { nome: 'hora', rotulo: 'Hora', tipo: 'time', largura: 'metade', valor: edicao ? evento.hora : '' },
                { nome: 'local', rotulo: 'Local', tipo: 'text', largura: 'metade', valor: edicao ? evento.local : '', placeholder: 'Ex.: Auditorio' },
                {
                    nome: 'tipo', rotulo: 'Tipo', tipo: 'select', largura: 'metade', valor: edicao ? evento.tipo : 'reuniao',
                    opcoes: Object.keys(Dados.TIPOS_EVENTO).map(function (k) { return { valor: k, rotulo: Dados.TIPOS_EVENTO[k].rotulo }; })
                },
                {
                    nome: 'frenteId', rotulo: 'Frente', tipo: 'select', largura: 'metade', obrigatorio: true,
                    valor: edicao ? evento.frenteId : (eu && eu.frenteIds && eu.frenteIds[0] ? eu.frenteIds[0] : frentes[0].valor),
                    opcoes: frentes
                },
                {
                    nome: 'comissaoId', rotulo: 'Comissao', tipo: 'select', largura: 'metade',
                    valor: edicao ? (evento.comissaoId || '') : (eu && eu.comissaoIds && eu.comissaoIds[0] ? eu.comissaoIds[0] : ''),
                    opcoes: Dados.opcoesComissoes(null, '— toda a frente —')
                },
                { nome: 'descricao', rotulo: 'Descricao', tipo: 'textarea', linhas: 3, valor: edicao ? evento.descricao : '' },
                { nome: 'publico', rotulo: 'Mostrar no calendario publico', tipo: 'checkbox', valor: edicao ? evento.publico : false, ajuda: 'Eventos publicos aparecem no portal da escola.' }
            ],
            aoGuardar: function (d) {
                d.comissaoId = d.comissaoId || null;
                if (edicao) {
                    Store.atualizar('eventos', evento.id, d);
                    Store.registar('Evento atualizado', d.titulo + ' (' + UI.dataCurta(d.data) + ')');
                    UI.toast('Evento atualizado.', 'sucesso');
                } else {
                    Store.inserir('eventos', d);
                    Store.registar('Evento agendado', d.titulo + ' (' + UI.dataCurta(d.data) + ')');
                    UI.toast('Evento agendado.', 'sucesso');
                }
                App.recarregar();
            }
        });
    }

    function ver(evento) {
        var t = Dados.tipoEvento(evento.tipo);
        var pode = Auth.pode('calendario.gerir') && (Auth.ehSupra() || !evento.comissaoId || Auth.veComissao(evento.comissaoId));
        UI.modal({
            titulo: evento.titulo,
            subtitulo: UI.dataLonga(evento.data) + (evento.hora ? ' · ' + evento.hora : ''),
            largura: 'max-w-lg',
            corpo:
                '<div class="flex flex-wrap gap-1.5 mb-4">' +
                    UI.chip(t.rotulo, t.cor, 'tag') +
                    UI.chip(Dados.nomeFrente(evento.frenteId), Dados.corFrente(evento.frenteId), 'layers') +
                    UI.chip(Dados.nomeComissao(evento.comissaoId), 'slate', 'users-round') +
                    (evento.publico ? UI.chip('Publico', 'emerald', 'globe') : UI.chip('Interno', 'slate', 'lock')) +
                '</div>' +
                (evento.local ? '<p class="text-sm text-slate-300 mb-2 flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4 text-slate-500"></i>' + UI.esc(evento.local) + '</p>' : '') +
                '<p class="text-sm text-slate-300 leading-relaxed">' + UI.nl2br(evento.descricao || 'Sem descricao.') + '</p>',
            rodape:
                (pode ? '<button type="button" class="btn-perigo" id="ev-eliminar">Eliminar</button>' +
                        '<button type="button" class="btn-secundario" id="ev-editar">Editar</button>' : '') +
                '<button type="button" data-fechar="1" class="btn-primario">Fechar</button>',
            aoAbrir: function (raiz) {
                var e1 = raiz.querySelector('#ev-editar');
                if (e1) { e1.addEventListener('click', function () { UI.fecharModal(); formulario(evento); }); }
                var e2 = raiz.querySelector('#ev-eliminar');
                if (e2) {
                    e2.addEventListener('click', function () {
                        UI.fecharModal();
                        UI.confirmar({
                            titulo: 'Eliminar evento',
                            mensagem: 'Queres remover "' + evento.titulo + '" da agenda?',
                            aoConfirmar: function () {
                                Store.remover('eventos', evento.id);
                                Store.registar('Evento eliminado', evento.titulo);
                                UI.toast('Evento removido.', 'sucesso');
                                App.recarregar();
                            }
                        });
                    });
                }
            }
        });
    }

    function grelha() {
        var primeiro = new Date(estado.ano, estado.mes, 1);
        var diasNoMes = new Date(estado.ano, estado.mes + 1, 0).getDate();
        var comecaEm = primeiro.getDay();
        var eventos = eventosDoMes();
        var hojeIso = UI.dataHoje();
        var pode = Auth.pode('calendario.gerir');

        var html = '<div class="grid grid-cols-7 gap-px bg-slate-700 border border-slate-700 rounded-2xl overflow-hidden">';
        UI.DIAS.forEach(function (d) {
            html += '<div class="bg-slate-800 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">' + d + '</div>';
        });

        for (var i = 0; i < comecaEm; i++) {
            html += '<div class="bg-slate-900/60 min-h-[92px]"></div>';
        }

        for (var dia = 1; dia <= diasNoMes; dia++) {
            var data = iso(estado.ano, estado.mes, dia);
            var doDia = eventos.filter(function (e) { return e.data === data; });
            var ehHoje = data === hojeIso;
            html += '<div class="bg-slate-850 min-h-[92px] p-1.5 group relative ' + (pode ? 'cursor-pointer hover:bg-slate-800' : '') + '" ' +
                    (pode ? 'data-dia="' + data + '"' : '') + '>' +
                '<div class="flex items-center justify-between mb-1">' +
                    '<span class="text-xs font-bold ' + (ehHoje ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400') + '">' + dia + '</span>' +
                    (pode ? '<i data-lucide="plus" class="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"></i>' : '') +
                '</div>' +
                '<div class="space-y-1">' +
                doDia.slice(0, 3).map(function (e) {
                    var c = UI.cor(Dados.tipoEvento(e.tipo).cor);
                    return '<button class="w-full text-left ' + c.solido + '/80 hover:' + c.solido + ' text-white text-[10px] leading-tight px-1.5 py-1 rounded truncate transition-all" ' +
                           'data-evento="' + e.id + '" title="' + UI.esc(e.titulo) + '">' +
                           (e.hora ? UI.esc(e.hora) + ' ' : '') + UI.esc(e.titulo) + '</button>';
                }).join('') +
                (doDia.length > 3 ? '<p class="text-[10px] text-slate-500 pl-1">+' + (doDia.length - 3) + ' mais</p>' : '') +
                '</div></div>';
        }

        var resto = (comecaEm + diasNoMes) % 7;
        if (resto) {
            for (var j = resto; j < 7; j++) { html += '<div class="bg-slate-900/60 min-h-[92px]"></div>'; }
        }
        html += '</div>';
        return html;
    }

    function listaLateral() {
        var eventos = eventosDoMes();
        if (!eventos.length) { return UI.vazio('Sem eventos neste mes.', 'calendar-off'); }
        return '<ul class="space-y-2">' + eventos.map(function (e) {
            var t = Dados.tipoEvento(e.tipo);
            return '<li><button class="w-full text-left bg-slate-800/60 border border-slate-700 hover:border-indigo-500/50 rounded-xl px-3 py-2.5 transition-all" data-evento="' + e.id + '">' +
                '<div class="flex items-center gap-2 mb-1">' +
                    '<span class="w-2 h-2 rounded-full ' + UI.cor(t.cor).ponto + '"></span>' +
                    '<span class="text-xs font-bold text-white">' + UI.dataCurta(e.data) + (e.hora ? ' · ' + UI.esc(e.hora) : '') + '</span>' +
                '</div>' +
                '<p class="text-sm text-slate-200 truncate">' + UI.esc(e.titulo) + '</p>' +
                '<p class="text-[11px] text-slate-500 truncate">' + UI.esc(Dados.nomeComissao(e.comissaoId)) + (e.local ? ' · ' + UI.esc(e.local) : '') + '</p>' +
            '</button></li>';
        }).join('') + '</ul>';
    }

    global.Views = global.Views || {};
    global.Views.calendario = {
        titulo: 'Calendario',
        formulario: formulario,
        render: function () {
            var pode = Auth.pode('calendario.gerir');
            var html = UI.cabecalho('Calendario do Protagonismo',
                'Agenda integrada de todas as frentes: reunioes, formacoes, prazos e sessoes.',
                (pode ? '<button class="btn-primario" data-acao="novo"><i data-lucide="calendar-plus" class="w-4 h-4"></i> Novo evento</button>' : ''));

            html += '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
                '<div class="flex items-center gap-2">' +
                    '<button class="btn-icone" data-nav="-1"><i data-lucide="chevron-left" class="w-4 h-4 pointer-events-none"></i></button>' +
                    '<h3 class="text-lg font-bold text-white min-w-[190px] text-center">' + UI.MESES[estado.mes] + ' ' + estado.ano + '</h3>' +
                    '<button class="btn-icone" data-nav="1"><i data-lucide="chevron-right" class="w-4 h-4 pointer-events-none"></i></button>' +
                    '<button class="btn-filtro ml-1" data-nav="0">Hoje</button>' +
                '</div>' +
                '<select id="f-frente" class="campo max-w-xs">' +
                    '<option value="">Todas as frentes</option>' +
                    Dados.opcoesFrentes().map(function (o) {
                        return '<option value="' + o.valor + '"' + (estado.frenteId === o.valor ? ' selected' : '') + '>' + UI.esc(o.rotulo) + '</option>';
                    }).join('') +
                '</select>' +
            '</div>';

            html += '<div class="grid grid-cols-1 xl:grid-cols-4 gap-5">' +
                '<div class="xl:col-span-3">' + grelha() +
                    '<div class="flex flex-wrap gap-3 mt-4">' + Object.keys(Dados.TIPOS_EVENTO).map(function (k) {
                        return '<span class="flex items-center gap-1.5 text-[11px] text-slate-400">' +
                               '<span class="w-2.5 h-2.5 rounded-full ' + UI.cor(Dados.TIPOS_EVENTO[k].cor).ponto + '"></span>' +
                               Dados.TIPOS_EVENTO[k].rotulo + '</span>';
                    }).join('') + '</div>' +
                '</div>' +
                '<div>' + UI.cartao(
                    '<div class="px-4 py-3 border-b border-slate-700"><h3 class="font-bold text-sm text-white">Eventos de ' + UI.MESES[estado.mes] + '</h3></div>' +
                    '<div class="p-4 max-h-[560px] overflow-y-auto custom-scrollbar">' + listaLateral() + '</div>') +
                '</div>' +
            '</div>';

            return html;
        },
        ligar: function (raiz) {
            var b = raiz.querySelector('[data-acao="novo"]');
            if (b) { b.addEventListener('click', function () { formulario(null); }); }

            raiz.querySelectorAll('[data-nav]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var passo = parseInt(el.getAttribute('data-nav'), 10);
                    if (passo === 0) {
                        var d = new Date();
                        estado.ano = d.getFullYear(); estado.mes = d.getMonth();
                    } else {
                        estado.mes += passo;
                        if (estado.mes < 0) { estado.mes = 11; estado.ano--; }
                        if (estado.mes > 11) { estado.mes = 0; estado.ano++; }
                    }
                    App.recarregar();
                });
            });

            var f = raiz.querySelector('#f-frente');
            if (f) { f.addEventListener('change', function () { estado.frenteId = f.value; App.recarregar(); }); }

            raiz.querySelectorAll('[data-evento]').forEach(function (el) {
                el.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    ver(Store.encontrar('eventos', el.getAttribute('data-evento')));
                });
            });

            raiz.querySelectorAll('[data-dia]').forEach(function (el) {
                el.addEventListener('click', function () { formulario(null, el.getAttribute('data-dia')); });
            });
        }
    };
})(window);
