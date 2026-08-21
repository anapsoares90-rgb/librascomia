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
                '<div class="flex flex-wrap gap-x-4 gap-y-2 mb-4">' +
                    UI.etiqueta(t.rotulo, t.cor, { forte: true }) +
                    UI.etiqueta(Dados.nomeFrente(evento.frenteId), Dados.corFrente(evento.frenteId)) +
                    UI.etiqueta(Dados.nomeComissao(evento.comissaoId), 'slate') +
                    UI.etiqueta(evento.publico ? 'Publico' : 'Interno', evento.publico ? 'emerald' : 'slate') +
                '</div>' +
                (evento.local ? '<p class="texto-medio" style="margin-bottom:.6rem">' + UI.icone('map-pin', 14) + ' ' + UI.esc(evento.local) + '</p>' : '') +
                '<p class="corpo-texto">' + UI.nl2br(evento.descricao || 'Sem descricao.') + '</p>',
            rodape:
                (pode ? '<button type="button" class="btn btn--perigo" id="ev-eliminar">Eliminar</button>' +
                        '<button type="button" class="btn" id="ev-editar">Editar</button>' : '') +
                '<button type="button" data-fechar="1" class="btn btn--principal">Fechar</button>',
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

        var html = '<div class="calendario">' +
            '<div class="calendario__cabeca">' + UI.DIAS.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
            '<div class="calendario__grelha">';

        for (var i = 0; i < comecaEm; i++) { html += '<div class="dia dia--fora"></div>'; }

        for (var dia = 1; dia <= diasNoMes; dia++) {
            var data = iso(estado.ano, estado.mes, dia);
            var doDia = eventos.filter(function (e) { return e.data === data; });
            html += '<div class="dia' + (data === hojeIso ? ' dia--hoje' : '') + (pode ? ' dia--clicavel' : '') + '"' +
                    (pode ? ' data-dia="' + data + '"' : '') + '>' +
                '<span class="dia__numero">' + dia + '</span>' +
                doDia.slice(0, 3).map(function (e) {
                    return '<button class="evento-chip ' + UI.tom(Dados.tipoEvento(e.tipo).cor) + '" data-evento="' + e.id + '" title="' + UI.esc(e.titulo) + '">' +
                           (e.hora ? UI.esc(e.hora) + ' ' : '') + UI.esc(e.titulo) + '</button>';
                }).join('') +
                (doDia.length > 3 ? '<p class="dia__mais">+' + (doDia.length - 3) + ' mais</p>' : '') +
            '</div>';
        }

        var resto = (comecaEm + diasNoMes) % 7;
        if (resto) { for (var j = resto; j < 7; j++) { html += '<div class="dia dia--fora"></div>'; } }

        return html + '</div></div>';
    }

    function listaLateral() {
        var eventos = eventosDoMes();
        if (!eventos.length) { return UI.vazio('Sem eventos neste mes.', 'calendar-off'); }
        return '<ul class="lista">' + eventos.map(function (e) {
            var t = Dados.tipoEvento(e.tipo);
            return '<li><button class="w-full text-left flex gap-3" data-evento="' + e.id + '">' +
                UI.dataBloco(e.data) +
                '<div class="min-w-0">' +
                    '<p class="truncate" style="font-size:.8125rem;font-weight:500">' + UI.esc(e.titulo) + '</p>' +
                    '<p class="nota truncate">' + UI.esc(e.hora || '') + (e.local ? ' · ' + UI.esc(e.local) : '') + '</p>' +
                    '<div style="margin-top:.25rem">' + UI.etiqueta(t.rotulo, t.cor) + '</div>' +
                '</div>' +
            '</button></li>';
        }).join('') + '</ul>';
    }

    global.Views = global.Views || {};
    global.Views.calendario = {
        titulo: 'Calendario',
        formulario: formulario,
        render: function () {
            var pode = Auth.pode('calendario.gerir');
            var html = UI.cabecalho('Agenda', 'Calendario do Protagonismo',
                'Reunioes, formacoes, prazos e sessoes de todas as frentes, num so calendario.',
                (pode ? '<button class="btn btn--principal" data-acao="novo">' + UI.icone('calendar-plus', 15) + ' Novo evento</button>' : ''));

            html += '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
                '<div class="flex items-center gap-1.5">' +
                    '<button class="btn btn--icone" data-nav="-1">' + UI.icone('chevron-left', 15) + '</button>' +
                    '<h3 class="serifa" style="font-size:1.05rem;min-width:11rem;text-align:center">' + UI.MESES[estado.mes] + ' ' + estado.ano + '</h3>' +
                    '<button class="btn btn--icone" data-nav="1">' + UI.icone('chevron-right', 15) + '</button>' +
                    '<button class="filtro" data-nav="0" style="margin-left:.35rem">Hoje</button>' +
                '</div>' +
                '<select id="f-frente" class="campo" style="max-width:16rem">' +
                    '<option value="">Todas as frentes</option>' +
                    Dados.opcoesFrentes().map(function (o) {
                        return '<option value="' + o.valor + '"' + (estado.frenteId === o.valor ? ' selected' : '') + '>' + UI.esc(o.rotulo) + '</option>';
                    }).join('') +
                '</select>' +
            '</div>';

            html += '<div class="grid grid-cols-1 xl:grid-cols-4 gap-4">' +
                '<div class="xl:col-span-3">' + grelha() +
                    '<div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">' + Object.keys(Dados.TIPOS_EVENTO).map(function (k) {
                        return UI.etiqueta(Dados.TIPOS_EVENTO[k].rotulo, Dados.TIPOS_EVENTO[k].cor);
                    }).join('') + '</div>' +
                '</div>' +
                '<div>' + UI.painel('Eventos de ' + UI.MESES[estado.mes],
                    '<div class="max-h-[34rem] overflow-y-auto custom-scrollbar custom-scrollbar--claro">' + listaLateral() + '</div>') + '</div>' +
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
