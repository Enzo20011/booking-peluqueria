(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dur = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + ' h ' + r + ' min' : h + ' h') : r + ' min'; };
  const pesos = (n) => '$' + Number(n).toLocaleString('es-AR');
  const aviso = (t) => window.avisoPanel && window.avisoPanel(t);
  const wa = (tel, msg) => 'https://wa.me/' + String(tel || '').replace(/[^\d]/g, '') + '?text=' + encodeURIComponent(msg);
  const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const hoy = new Date();
  const hoyK = Store.clave(hoy);
  const SERV = () => Store.itemsTodos();

  /* ---------- Agenda (sale de los turnos reales) ---------- */
  const PX = 1.3;
  let diaAg = 0;
  let diasAg = [];

  function pintarAgenda() {
    diasAg = [];
    const habiles = Store.diasAtencion();
    for (let k = 0; k < 21 && diasAg.length < 7; k++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k);
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      if (Store.diaAbierto(Store.clave(d)) || k === 0) diasAg.push(d);
    }
    if (diaAg >= diasAg.length) diaAg = 0;
    $('#ag-dias').innerHTML = diasAg.map((d, i) => {
      const cant = Store.dia(Store.clave(d)).length;
      return '<button class="chip" type="button" data-ag="' + i + '" aria-pressed="' + (i === diaAg) + '">' +
        (i === 0 ? 'Hoy' : DIAS_C[d.getDay()] + ' ' + d.getDate()) + (cant ? ' (' + cant + ')' : '') + '</button>';
    }).join('');
    const ev = Store.dia(Store.clave(diasAg[diaAg]));
    const lista = ev.slice().sort((a, b) => a.ini - b.ini);
    const g = $('#grilla');
    g.className = 'lista-agenda';
    g.style.height = '';
    g.innerHTML = lista.length ? lista.map((e) => {
      const total = Store.total(e.seg);
      return '<button type="button" class="turno-ag" data-turno-id="' + e.id + '">' +
        '<span class="ta-hora">' + hhmm(e.ini) + '</span>' +
        '<span class="ta-info"><b>' + esc(e.nom) + '</b>' + (Store.esNuevo(e) ? '<em class="ta-nueva">Nueva</em>' : '') +
        '<small>' + esc(e.serv) + ' · hasta las ' + hhmm(e.ini + total) + '</small></span>' +
        '<span class="ta-mas" aria-hidden="true">›</span></button>';
    }).join('') : '<p class="ta-vacio">No hay turnos este día.</p>';
  }

  $('#ag-dias').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ag]');
    if (!b) return;
    diaAg = Number(b.dataset.ag);
    pintarAgenda();
  });

  // Detalle de un turno con todas las acciones (desde la Agenda o desde "Hoy")
  function abrirTurno(id) {
    const t = Store.todos().find((x) => x.id === id);
    if (!t) return;
    const total = Store.total(t.seg);
    const nombres = [t.serv].concat((t.adicionales || []).map((a) => a.serv)).join(' + ');
    $('#td-nom').textContent = t.nom;
    $('#td-det').textContent = fechaCorta(t.fecha) + ' · ' + nombres + (t.largo ? ' · Pelo ' + t.largo : '') + ' · ' + hhmm(t.ini) + ' a ' + hhmm(t.ini + total) + (t.nota ? ' — Nota: «' + t.nota + '»' : '');
    let acc = '';
    if (t.tel) acc += '<a class="btn chico" target="_blank" rel="noopener" href="' + wa(t.tel, 'Hola ' + t.nom.split(' ')[0] + ', te escribo de Estudio Demo por tu turno de las ' + hhmm(t.ini) + '.') + '">Escribirle por WhatsApp</a>';
    if (t.fecha === hoyK) acc += '<button class="btn suave chico" type="button" data-tarde="' + t.id + '">Llegó tarde: pasarla al primer hueco</button>';
    acc += '<button class="btn suave chico" type="button" data-mover="' + t.id + '">Mover a otro día u horario</button>';
    acc += '<button class="btn suave chico" type="button" data-cambiar-serv="' + t.id + '">Cambiar el servicio</button>';
    acc += '<button class="btn suave chico" type="button" data-sumar="' + t.id + '">+ Sumar otro servicio a este turno</button>';
    acc += '<button class="btn suave chico" type="button" data-novino="' + t.id + '">No vino</button>';
    acc += '<button class="btn suave chico" type="button" data-cancelar="' + t.id + '" style="color:var(--aviso)">Cancelar turno y liberar horario</button>';
    $('#td-acciones').innerHTML = acc;
    $('#d-turno-det').showModal();
  }
  window.abrirTurno = abrirTurno;
  $('#grilla').addEventListener('click', (e) => {
    const b = e.target.closest('[data-turno-id]');
    if (b) abrirTurno(b.dataset.turnoId);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-turno-op]');
    if (b) abrirTurno(b.dataset.turnoOp);
  });
  const refrescar = () => { window.refrescarHoy && window.refrescarHoy(); pintarAgenda(); };
  const waAviso = (t, msg) => t.tel ? '<a class="btn" target="_blank" rel="noopener" style="width:100%;margin-top:12px" href="' + wa(t.tel, msg) + '">Avisarle por WhatsApp</a>' : '';

  /* ---- No vino ---- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-novino]');
    if (!b) return;
    const t = Store.todos().find((x) => x.id === b.dataset.novino);
    if (!t) return;
    Store.update(t.id, { estado: 'cancelado', noVino: true });
    $('#d-turno-det').close();
    refrescar();
    aviso('Anotado: ' + t.nom.split(' ')[0] + ' no vino. El horario quedó libre.');
  });

  /* ---- Llegó tarde: pasarla al primer hueco de hoy ---- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tarde]');
    if (!b) return;
    const t = Store.todos().find((x) => x.id === b.dataset.tarde);
    if (!t) return;
    const total = Store.total(t.seg);
    let nuevo = null;
    for (let m = Math.ceil(Math.max(Store.ahora(), t.ini) / 5) * 5; m <= 1200; m += 5) {
      if (Store.dentroHorario(t.fecha, m, total) && Store.libre(t.fecha, m, t.seg, t.id).libre) { nuevo = m; break; }
    }
    if (nuevo === null) { aviso('Hoy no queda un hueco para ella. Movela a otro día.'); return; }
    Store.update(t.id, { ini: nuevo });
    $('#d-turno-det').close();
    refrescar();
    aviso(t.nom.split(' ')[0] + ' pasó a las ' + hhmm(nuevo) + '.');
  });

  /* ---- Mover a otro día u horario ---- */
  const dMv = $('#d-mover');
  let mvId = null;
  function horasLibres(t, fk) {
    const total = Store.total(t.seg);
    const out = [];
    Store.tramosFecha(fk).forEach((tr) => {
      for (let m = tr[0]; m + total <= tr[1]; m += 30) {
        if (fk === hoyK && m < Store.ahora()) continue;
        if (Store.libre(fk, m, t.seg, t.id).libre) out.push(m);
      }
    });
    return out;
  }
  function actualizarHorasMover() {
    const t = Store.todos().find((x) => x.id === mvId);
    const hs = horasLibres(t, $('#mv-fecha').value);
    $('#mv-hora').innerHTML = hs.length ? hs.map((m) => '<option value="' + m + '">' + hhmm(m) + '</option>').join('') : '<option value="">Sin horarios libres ese día</option>';
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mover]');
    if (!b) return;
    mvId = b.dataset.mover;
    const t = Store.todos().find((x) => x.id === mvId);
    if (!t) return;
    $('#d-turno-det').close();
    $('#mv-form').hidden = false; $('#mv-res').hidden = true; $('#mv-error').textContent = '';
    $('#mv-titulo').textContent = 'Mover a ' + t.nom;
    const fechas = [];
    for (let k = 0; k < 40 && fechas.length < 14; k++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k);
      if (Store.diaAbierto(Store.clave(d))) fechas.push(d);
    }
    $('#mv-fecha').innerHTML = fechas.map((d) => { const fk = Store.clave(d); return '<option value="' + fk + '"' + (fk === t.fecha ? ' selected' : '') + '>' + (fk === hoyK ? 'Hoy' : DIAS_C[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1)) + '</option>'; }).join('');
    // Primer hueco libre (que no sea el mismo horario): un solo toque
    let rapido = null;
    for (const d of fechas) {
      const fk = Store.clave(d);
      const m = horasLibres(t, fk).find((x) => !(fk === t.fecha && x === t.ini));
      if (m !== undefined) { rapido = { fk, m, d }; break; }
    }
    const br = $('#mv-rapido');
    br.hidden = !rapido;
    if (rapido) { br.textContent = 'Primer horario libre: ' + (rapido.fk === hoyK ? 'hoy' : DIAS_C[rapido.d.getDay()] + ' ' + rapido.d.getDate() + '/' + (rapido.d.getMonth() + 1)) + ' a las ' + hhmm(rapido.m); br.dataset.fk = rapido.fk; br.dataset.m = rapido.m; }
    actualizarHorasMover();
    dMv.showModal();
  });
  function hacerMover(fk, m) {
    const t = Store.todos().find((x) => x.id === mvId);
    Store.update(t.id, { fecha: fk, ini: m });
    refrescar();
    const d = fk.split('-');
    $('#mv-form').hidden = true;
    const res = $('#mv-res');
    res.hidden = false;
    res.innerHTML = '<h3 style="font-size:1.6rem">Listo, lo moví</h3><p class="ayuda" style="color:var(--tinta-2);font-size:1.1rem;margin-top:6px">' + esc(t.nom) + ' ahora está el ' + Number(d[2]) + '/' + Number(d[1]) + ' a las ' + hhmm(m) + '.</p>' +
      waAviso(t, 'Hola ' + t.nom.split(' ')[0] + ', tuve que cambiarte el turno: ahora es el ' + Number(d[2]) + '/' + Number(d[1]) + ' a las ' + hhmm(m) + ' en Estudio Demo. ¿Te sirve? Gracias.') +
      '<div class="botones" style="margin-top:12px"><button class="btn suave" type="button" id="mv-cerrar">Listo</button></div>';
    $('#mv-cerrar').addEventListener('click', () => dMv.close());
  }
  $('#mv-fecha').addEventListener('change', actualizarHorasMover);
  $('#mv-rapido').addEventListener('click', (e) => hacerMover(e.currentTarget.dataset.fk, Number(e.currentTarget.dataset.m)));
  $('#mv-ok').addEventListener('click', () => {
    const m = $('#mv-hora').value;
    if (!m) { $('#mv-error').textContent = 'Elegí un día con horario libre.'; return; }
    hacerMover($('#mv-fecha').value, Number(m));
  });

  /* ---- Cambiar el servicio ---- */
  const dCs = $('#d-cs');
  let csId = null, csLargo = 'medio';
  function itemCs() { const id = $('#cs-serv').value; return id === 'consulta' ? window.CONSULTA : SERV().find((x) => x.id === id); }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cambiar-serv]');
    if (!b) return;
    csId = b.dataset.cambiarServ;
    const t = Store.todos().find((x) => x.id === csId);
    if (!t) return;
    $('#d-turno-det').close();
    $('#cs-titulo').textContent = 'Cambiar el servicio de ' + t.nom.split(' ')[0];
    $('#cs-error').textContent = '';
    csLargo = t.largo || 'medio';
    $('#cs-serv').innerHTML = SERV().map((s) => '<option value="' + s.id + '"' + (s.id === t.servId ? ' selected' : '') + '>' + esc(s.nombre) + '</option>').join('') + '<option value="consulta"' + (t.servId === 'consulta' ? ' selected' : '') + '>A definir en la peluquería</option>';
    document.querySelectorAll('#cs-largo .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.csl === csLargo)));
    $('#cs-largo-wrap').hidden = !(itemCs() && itemCs().largo);
    dCs.showModal();
  });
  $('#cs-serv').addEventListener('change', () => { $('#cs-largo-wrap').hidden = !(itemCs() && itemCs().largo); });
  $('#cs-largo').addEventListener('click', (e) => {
    const b = e.target.closest('[data-csl]');
    if (!b) return;
    csLargo = b.dataset.csl;
    document.querySelectorAll('#cs-largo .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
  });
  $('#cs-ok').addEventListener('click', () => {
    const t = Store.todos().find((x) => x.id === csId);
    const it = itemCs();
    if (!t || !it) return;
    if ((t.adicionales || []).length) { $('#cs-error').textContent = 'Ya tiene servicios sumados. Cancelá este turno y cargalo de nuevo.'; return; }
    const largo = it.largo ? csLargo : undefined;
    const seg = Store.segmentos(it, largo || 'medio');
    if (!Store.libre(t.fecha, t.ini, seg, t.id).libre) { $('#cs-error').textContent = 'Ese servicio no entra en ese horario. Primero movela a otro horario.'; return; }
    Store.update(t.id, { serv: it.nombre, servId: it.id, largo, seg });
    dCs.close();
    refrescar();
    if (typeof pintarClientas === 'function') pintarClientas();
    aviso('Servicio cambiado: ' + it.nombre + '.');
  });


  // Agendar turno manualmente desde el panel (#btn-agendar-panel)
  const dAg = $('#d-agendar');
  let agLargo = 'medio';

  function actualizarSlotsAgendar() {
    const servId = $('#ag-serv').value;
    const it = servId === 'consulta' ? window.CONSULTA : SERV().find((x) => x.id === servId) || SERV()[0];
    if (!it) return;
    $('#ag-largo-wrap').hidden = !it.largo;
    const fk = $('#ag-fecha').value;
    const seg = Store.segmentos(it, it.largo ? agLargo : 'medio');
    const total = Store.total(seg);
    const esHoy = fk === hoyK;
    const opts = [];
    Store.tramosFecha(fk).forEach((tr) => {
      for (let m = tr[0]; m + total <= tr[1]; m += 30) {
        if (esHoy && m < Store.ahora() - 30) continue;
        if (Store.libre(fk, m, seg).libre) opts.push('<option value="' + m + '">' + hhmm(m) + ' (termina ' + hhmm(m + total) + ')</option>');
      }
    });
    $('#ag-hora').innerHTML = opts.length ? opts.join('') : '<option value="">Sin horarios libres ese día</option>';
  }

  const btnAgPanel = $('#btn-agendar-panel');
  if (btnAgPanel && dAg) {
    btnAgPanel.addEventListener('click', () => {
      $('#ag-nom').value = '';
      $('#ag-tel').value = '';
      $('#ag-error').textContent = '';
      agLargo = 'medio';
      document.querySelectorAll('#ag-largo .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.agl === 'medio')));
      $('#ag-serv').innerHTML = SERV().map((s) => '<option value="' + s.id + '">' + esc(s.nombre) + '</option>').join('') + '<option value="consulta">A definir en la peluquería</option>';
      const habiles = Store.diasAtencion();
      const fechas = [];
      for (let k = 0; k < 21 && fechas.length < 12; k++) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k);
        const dow = d.getDay() === 0 ? 7 : d.getDay();
        if (Store.diaAbierto(Store.clave(d)) || k === 0) fechas.push(d);
      }
      const selFecha = diasAg[diaAg] ? Store.clave(diasAg[diaAg]) : hoyK;
      $('#ag-fecha').innerHTML = fechas.map((d) => {
        const fk = Store.clave(d);
        return '<option value="' + fk + '"' + (fk === selFecha ? ' selected' : '') + '>' + (fk === hoyK ? 'Hoy (' + d.getDate() + ')' : DIAS_C[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1)) + '</option>';
      }).join('');
      actualizarSlotsAgendar();
      dAg.showModal();
    });
    $('#ag-serv').addEventListener('change', actualizarSlotsAgendar);
    $('#ag-fecha').addEventListener('change', actualizarSlotsAgendar);
    $('#ag-largo').addEventListener('click', (e) => {
      const b = e.target.closest('[data-agl]');
      if (!b) return;
      agLargo = b.dataset.agl;
      document.querySelectorAll('#ag-largo .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      actualizarSlotsAgendar();
    });
    $('#ag-guardar').addEventListener('click', () => {
      const nom = $('#ag-nom').value.trim();
      const horaVal = $('#ag-hora').value;
      if (nom.length < 2) { $('#ag-error').textContent = 'Escribí el nombre de la clienta.'; $('#ag-nom').focus(); return; }
      if (!horaVal) { $('#ag-error').textContent = 'Elegí un día con horario disponible.'; return; }
      const servId = $('#ag-serv').value;
      const it = servId === 'consulta' ? window.CONSULTA : SERV().find((x) => x.id === servId);
      const fk = $('#ag-fecha').value;
      const ini = Number(horaVal);
      const seg = Store.segmentos(it, it.largo ? agLargo : 'medio');
      Store.add({
        fecha: fk, ini, nom, tel: $('#ag-tel').value.trim(),
        serv: it.nombre, servId: it.id, largo: it.largo ? agLargo : undefined,
        seg, origen: 'panel'
      });
      dAg.close();
      window.refrescarHoy && window.refrescarHoy();
      aviso('Turno agendado: ' + nom + ' a las ' + hhmm(ini) + '.');
    });
  }

  /* ---------- Clientas (salen de los turnos; las fichas se guardan) ---------- */
  let selCl = null;
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fechaCorta = (f) => { const [y, m, d] = f.split('-').map(Number); return d + ' ' + MES[m - 1]; };

  function clientas() {
    const mapa = {};
    Store.todos().filter((t) => t.estado !== 'cancelado' && !t.oculta && t.nom && t.nom !== 'Sin nombre').forEach((t) => {
      const c = mapa[t.nom] || (mapa[t.nom] = { n: t.nom, turnos: [] });
      c.turnos.push(t);
    });
    return Object.values(mapa).map((c) => {
      c.turnos.sort((a, b) => (a.fecha + hhmm(a.ini)).localeCompare(b.fecha + hhmm(b.ini)));
      const prox = c.turnos.find((t) => t.fecha >= hoyK);
      const ult = c.turnos.slice().reverse().find((t) => t.fecha <= hoyK);
      c.etiqueta = prox ? (prox.fecha === hoyK ? 'Hoy a las ' + hhmm(prox.ini) : 'Próximo turno: ' + fechaCorta(prox.fecha)) : 'Último turno: ' + fechaCorta(ult.fecha);
      const ref = ult || prox;
      c.pelo = [ref.largo ? 'Pelo ' + ref.largo : '', ref.pelo && ref.pelo !== 'sin dato' && ref.pelo !== 'previo' ? ref.pelo : ref.pelo === 'previo' ? 'Con tintura o decoloración previa' : ''].filter(Boolean).join(', ');
      c.tel = (c.turnos.find((t) => t.tel) || {}).tel || '';
      return c;
    }).sort((a, b) => a.n.localeCompare(b.n, 'es'));
  }

  function pintarClientas() {
    const todas = clientas();
    const q = $('#cl-buscar').value.trim().toLowerCase();
    const lista = todas.filter((c) => c.n.toLowerCase().includes(q));
    if (selCl === null || !todas.find((c) => c.n === selCl)) selCl = todas.length ? todas[0].n : null;
    $('#cl-lista').innerHTML = lista.length
      ? lista.map((c) => '<button class="fila-cl" type="button" data-cl="' + esc(c.n) + '" aria-pressed="' + (c.n === selCl) + '"><b>' + esc(c.n) + '</b><span>' + esc(c.etiqueta) + ' · ' + c.turnos.length + (c.turnos.length === 1 ? ' visita' : ' visitas') + '</span></button>').join('')
      : '<p class="vacio">No hay clientas con ese nombre.</p>';
    const c = todas.find((x) => x.n === selCl);
    if (!c) { $('#cl-ficha').innerHTML = '<p class="vacio">Todavía no hay clientas.</p>'; return; }
    const ficha = Store.fichas()[c.n] || { formulas: [], notas: '' };
    const histHtml = c.turnos.slice().reverse().slice(0, 6).map((t) =>
      '<li class="hist-it"><span><b>' + fechaCorta(t.fecha) + ' (' + hhmm(t.ini) + '):</b> ' + esc([t.serv].concat((t.adicionales || []).map((a) => a.serv)).join(' + ')) + '</span><button class="btn chico suave" type="button" data-cambiar-serv="' + t.id + '">Editar</button></li>'
    ).join('');
    $('#cl-ficha').innerHTML =
      '<header><h2>' + esc(c.n) + '</h2><small>' + esc(c.pelo || 'Clienta del salón') + '</small></header>' +
      '<div style="padding:12px 18px 18px">' +
      '<div class="campo" style="margin-top:0"><label for="cl-notas">Notas</label><input id="cl-notas" value="' + esc(ficha.notas) + '" placeholder="Lo que te sirve recordar"></div>' +
      '<h3 style="font-family:var(--sans);font-weight:700;font-size:1.1rem;margin-top:18px">Historial de turnos</h3>' +
      '<ul class="formulas">' + histHtml + '</ul>' +
      '<h3 style="font-family:var(--sans);font-weight:700;font-size:1.1rem;margin-top:18px">Fórmulas de color</h3>' +
      (ficha.formulas.length ? '<ul class="formulas">' + ficha.formulas.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '<p style="color:var(--tinta-2);margin-top:6px">Todavía no tiene fórmulas cargadas.</p>') +
      '<div class="campo"><label for="cl-nueva">Agregar fórmula</label><input id="cl-nueva" placeholder="Qué se usó y cuánto tiempo"></div>' +
      '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn chico" id="cl-guardar" type="button">Guardar fórmula</button>' +
      '<button class="btn suave chico" type="button" data-cl-editar="' + esc(c.n) + '">Editar nombre o número</button>' +
      '<button class="btn suave chico" type="button" data-cl-borrar="' + esc(c.n) + '" style="color:var(--aviso)">Borrar clienta</button>' +
      (c.tel ? '<a class="btn suave chico" target="_blank" rel="noopener" href="https://wa.me/' + String(c.tel).replace(/[^\d]/g, '') + '?text=' + encodeURIComponent('Hola ' + c.n.split(' ')[0] + ', te escribo de Estudio Demo.') + '">Escribirle por WhatsApp</a>' : '') + '</div>' +
      '</div>';
  }
  $('#cl-buscar').addEventListener('input', pintarClientas);
  /* ---------- Editar o borrar una clienta ---------- */
  const dClE = $('#d-cl-editar'), dClB = $('#d-cl-borrar');
  let clEdit = null, clBorrar = null;
  document.addEventListener('click', (e) => {
    const be = e.target.closest('[data-cl-editar]');
    if (be) {
      clEdit = be.dataset.clEditar;
      const c = clientas().find((x) => x.n === clEdit);
      $('#cle-nom').value = clEdit;
      $('#cle-tel').value = c ? c.tel : '';
      $('#cle-error').textContent = '';
      dClE.showModal();
      return;
    }
    const bb = e.target.closest('[data-cl-borrar]');
    if (bb) {
      clBorrar = bb.dataset.clBorrar;
      const n = Store.proximosDe(clBorrar);
      $('#clb-titulo').textContent = 'Borrar a ' + clBorrar;
      $('#clb-txt').textContent = 'Se borra su ficha y deja de aparecer en la lista.' + (n ? ' Tiene ' + n + (n === 1 ? ' turno próximo, que se cancela y libera el horario.' : ' turnos próximos, que se cancelan y liberan el horario.') : '') + ' Lo que ya se cobró no cambia.';
      dClB.showModal();
    }
  });
  $('#cle-ok').addEventListener('click', () => {
    const nom = $('#cle-nom').value.trim();
    if (nom.length < 2) { $('#cle-error').textContent = 'Escribí el nombre.'; return; }
    const n2 = Store.editarClienta(clEdit, nom, $('#cle-tel').value);
    selCl = n2;
    dClE.close();
    pintarClientas();
    refrescar();
    aviso('Datos de ' + n2.split(' ')[0] + ' actualizados.');
  });
  $('#clb-ok').addEventListener('click', () => {
    const futuros = Store.borrarClienta(clBorrar);
    const nom = clBorrar;
    selCl = null;
    dClB.close();
    pintarClientas();
    refrescar();
    aviso(nom + ' se borró' + (futuros ? ' y se liberaron ' + futuros + (futuros === 1 ? ' turno.' : ' turnos.') : '.'));
  });

  $('#v-clientas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl]');
    if (b) { selCl = b.dataset.cl; pintarClientas(); return; }
    if (e.target.closest('#cl-guardar')) {
      const t = $('#cl-nueva').value.trim();
      if (!t) { $('#cl-nueva').focus(); return; }
      const ficha = Store.fichas()[selCl] || { formulas: [], notas: '' };
      const d = new Date();
      const f = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
      Store.guardarFicha(selCl, { formulas: [f + ': ' + t].concat(ficha.formulas) });
      pintarClientas();
      aviso('Fórmula guardada.');
    }
  });
  $('#v-clientas').addEventListener('change', (e) => {
    if (e.target.id === 'cl-notas' && selCl) { Store.guardarFicha(selCl, { notas: e.target.value }); aviso('Nota guardada.'); }
  });

  /* ---------- Caja (se arma sola con lo que se cobra) ---------- */
  const MEDIOS = ['Efectivo', 'Transferencia', 'QR', 'Tarjeta'];
  let cajaFechaK = hoyK;

  function pintarCaja() {
    const fechasSet = new Set([hoyK]);
    Store.todos().forEach((t) => { if (t.estado !== 'cancelado' && t.fecha) fechasSet.add(t.fecha); });
    const listaFechas = [...fechasSet].sort();
    if (!listaFechas.includes(cajaFechaK)) cajaFechaK = hoyK;

    const cDias = $('#caja-dias');
    if (cDias) {
      cDias.innerHTML = listaFechas.map((fk) =>
        '<button class="chip" type="button" data-cajaf="' + fk + '" aria-pressed="' + (fk === cajaFechaK) + '">' +
        (fk === hoyK ? 'Hoy' : fechaCorta(fk)) + '</button>'
      ).join('');
    }
    const titDia = $('#caja-dia-tit');
    if (titDia) titDia.textContent = cajaFechaK === hoyK ? 'Hoy' : 'Día ' + fechaCorta(cajaFechaK);

    const dia = Store.caja(cajaFechaK);
    const hechos = dia.filter((x) => x.terminado && !x.anulado);
    const total = hechos.reduce((a, x) => a + x.monto, 0);
    const previsto = dia.filter((x) => !x.anulado).reduce((a, x) => a + x.monto, 0);
    const sinPrecio = dia.filter((x) => x.sinPrecio && !x.anulado).length;
    $('#caja-total').innerHTML = '<span>Cobrado ' + (cajaFechaK === hoyK ? 'hasta ahora' : 'en el día') + '</span><b>' + pesos(total) + '</b>' +
      '<span style="margin-top:6px">Previsto para todo el día: ' + pesos(previsto) + ' (' + dia.length + (dia.length === 1 ? ' turno' : ' turnos') + ')</span>' +
      (sinPrecio ? '<span class="falta-precio">A ' + sinPrecio + (sinPrecio === 1 ? ' turno le falta el precio.' : ' turnos les falta el precio.') + ' Cargalos en Ajustes o tocá "Cambiar".</span>' : '');
    const por = MEDIOS.map((m) => hechos.filter((x) => x.medio === m).reduce((a, x) => a + x.monto, 0));
    const mayor = Math.max(1, ...por);
    const hayMedios = hechos.some((x) => MEDIOS.includes(x.medio));
    $('#caja-barras').hidden = !hayMedios;
    $('#caja-barras').innerHTML = MEDIOS.map((m, i) =>
      '<div class="barra"><span>' + m + '</span><div class="pista"><i style="--w:' + Math.round((por[i] / mayor) * 100) + '%"></i></div><b>' + pesos(por[i]) + '</b></div>'
    ).join('');
    $('#caja-mov').innerHTML = dia.length
      ? dia.map((x) =>
        '<div class="fila"><div class="hora-f">' + hhmm(x.fin) + '</div><div class="dato"><b>' + esc(x.nom) +
        (x.anulado ? '<span class="etiqueta pend">No se cobró</span>' : x.pagado ? '<span class="etiqueta verde">Cobrado</span>' : x.terminado ? '<span class="etiqueta">Por cobrar</span>' : '<span class="etiqueta">Falta</span>') +
        '</b><span>' + esc(x.lineas.map((l) => l.n + (l.p ? ' ' + pesos(l.p) : ' (sin precio)')).join(' + ')) + (x.descuento ? ' · descuento ' + pesos(x.descuento) : '') + (x.anulado ? ' · sin cobro' : (MEDIOS.includes(x.medio) ? ' · ' + x.medio : '')) + '</span></div>' +
        '<div class="acciones"><b>' + (x.faltaPrecio && !x.anulado ? pesos(x.monto) + ' + falta precio' : pesos(x.monto)) + '</b>' +
        '<button class="btn chico suave" type="button" data-cambiar="' + x.id + '">Cambiar</button></div></div>'
      ).join('')
      : '<p class="vacio">No hay turnos en esta fecha.</p>';
    pintarResumenCaja();
    if (typeof pintarResumenWa === 'function') pintarResumenWa();
  }

  /* ---------- Resumen de ganancias: hoy, semana, mes ---------- */
  let rcPer = 'hoy';
  const DOW_L = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const sumDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  function rangoPeriodo(per, ref) {
    const h0 = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    if (per === 'hoy') return { desde: h0, hasta: h0 };
    if (per === 'semana') { const dow = h0.getDay() === 0 ? 7 : h0.getDay(); return { desde: sumDias(h0, 1 - dow), hasta: h0 }; }
    return { desde: new Date(h0.getFullYear(), h0.getMonth(), 1), hasta: h0 };
  }
  function previoPeriodo(per, r) {
    const n = Math.round((r.hasta - r.desde) / 864e5);
    if (per === 'hoy') return { desde: sumDias(r.desde, -7), hasta: sumDias(r.hasta, -7), txt: 'el mismo día de la semana pasada' };
    if (per === 'semana') { const d = sumDias(r.desde, -7); return { desde: d, hasta: sumDias(d, n), txt: 'la semana pasada a esta altura' }; }
    const d = new Date(r.desde.getFullYear(), r.desde.getMonth() - 1, 1);
    return { desde: d, hasta: sumDias(d, n), txt: 'el mes pasado a esta altura' };
  }
  function datosRango(desde, hasta) {
    const dias = []; let total = 0, cant = 0, previsto = 0; const serv = {}; const medios = {};
    for (let d = desde; d <= hasta; d = sumDias(d, 1)) {
      const items = Store.caja(Store.clave(d));
      let t = 0;
      items.forEach((x) => {
        if (x.anulado) return;
        previsto += x.monto;
        if (x.terminado) {
          t += x.monto; cant++;
          const n = x.servicios.length || 1;
          x.servicios.forEach((nm) => { serv[nm] = (serv[nm] || 0) + x.monto / n; });
          medios[x.medio] = (medios[x.medio] || 0) + x.monto;
        }
      });
      total += t;
      dias.push({ d, t, n: items.filter((x) => !x.anulado).length });
    }
    return { dias, total, cant, previsto, serv, medios };
  }
  function pintarResumenCaja() {
    const box = $('#rc'); if (!box) return;
    box.querySelectorAll('[data-per]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.per === rcPer)));
    const r = rangoPeriodo(rcPer, hoy), pv = previoPeriodo(rcPer, r);
    const a = datosRango(r.desde, r.hasta), b = datosRango(pv.desde, pv.hasta);
    const nombre = { hoy: 'Cobrado hoy', semana: 'Cobrado en la semana', mes: 'Cobrado este mes' }[rcPer];
    let cmp = '';
    if (b.total > 0) {
      const dif = a.total - b.total, pct = Math.round((dif / b.total) * 100);
      cmp = '<span class="rc-cmp ' + (dif >= 0 ? 'sube' : 'baja') + '">' + (dif >= 0 ? '▲ ' : '▼ ') + pesos(Math.abs(dif)) + ' (' + (dif >= 0 ? '+' : '−') + Math.abs(pct) + '%)</span> <small>comparado con ' + pv.txt + '</small>';
    } else if (a.total > 0) cmp = '<small>Todavía no hay con qué comparar.</small>';
    $('#rc-grande').innerHTML = '<span>' + nombre + '</span><b>' + pesos(a.total) + '</b><div>' + cmp + '</div>';
    const prom = a.cant ? Math.round(a.total / a.cant) : 0;
    $('#rc-kpis').innerHTML =
      '<div><b>' + a.cant + '</b><span>' + (a.cant === 1 ? 'turno cobrado' : 'turnos cobrados') + '</span></div>' +
      '<div><b>' + pesos(prom) + '</b><span>por turno, en promedio</span></div>' +
      '<div><b>' + pesos(Math.max(0, a.previsto - a.total)) + '</b><span>falta cobrar de lo agendado</span></div>';
    const conDatos = a.dias.filter((x) => x.t > 0);
    const mejor = conDatos.length ? conDatos.reduce((m, x) => (x.t > m.t ? x : m)) : null;
    if (rcPer === 'hoy') { $('#rc-dias-t').textContent = MEDIOS.some((m) => a.medios[m]) ? 'Cómo te pagaron' : ''; }
    else { $('#rc-dias-t').innerHTML = 'Día por día' + (mejor ? ' <small>· Tu mejor día: ' + DOW_L[mejor.d.getDay()] + ' ' + mejor.d.getDate() + ' (' + pesos(mejor.t) + ')</small>' : ''); }
    if (rcPer === 'hoy' && !MEDIOS.some((m) => a.medios[m])) {
      $('#rc-dias-t').textContent = '';
      $('#rc-dias').className = 'rc-medios';
      $('#rc-dias').innerHTML = '';
    } else if (rcPer === 'hoy') {
      const mx = Math.max(1, ...MEDIOS.map((m) => a.medios[m] || 0));
      $('#rc-dias').className = 'rc-medios';
      $('#rc-dias').innerHTML = MEDIOS.map((m) => '<div class="barra"><span>' + m + '</span><div class="pista"><i style="--w:' + Math.round(((a.medios[m] || 0) / mx) * 100) + '%"></i></div><b>' + pesos(a.medios[m] || 0) + '</b></div>').join('');
    } else {
      const mx = Math.max(1, ...a.dias.map((x) => x.t));
      $('#rc-dias').className = 'rc-dias';
      $('#rc-dias').innerHTML = a.dias.map((x) => '<div class="rc-col' + (mejor && x.d === mejor.d ? ' mejor' : '') + '" title="' + pesos(x.t) + '"><i style="height:' + Math.max(3, Math.round((x.t / mx) * 100)) + '%"></i><span>' + (rcPer === 'semana' ? DOW_L[x.d.getDay()] : x.d.getDate()) + '</span></div>').join('');
    }
    const top = Object.entries(a.serv).sort((x, y) => y[1] - x[1]).slice(0, 5);
    const mxs = top.length ? top[0][1] : 1;
    $('#rc-serv').innerHTML = top.length ? top.map(([n, v]) => '<div class="barra"><span>' + esc(n) + '</span><div class="pista"><i style="--w:' + Math.round((v / mxs) * 100) + '%"></i></div><b>' + pesos(Math.round(v)) + '</b></div>').join('') : '<p class="vacio">Cuando cobres turnos vas a ver acá cuáles te rinden más.</p>';
  }
  const rcPerEl = $('#rc-per');
  if (rcPerEl) rcPerEl.addEventListener('click', (e) => { const b = e.target.closest('[data-per]'); if (!b) return; rcPer = b.dataset.per; pintarResumenCaja(); });

  const cDiasEl = $('#caja-dias');
  if (cDiasEl) {
    cDiasEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cajaf]');
      if (!b) return;
      cajaFechaK = b.dataset.cajaf;
      pintarCaja();
    });
  }

  const btnCopCaja = $('#btn-copiar-caja');
  if (btnCopCaja) {
    btnCopCaja.addEventListener('click', () => {
      const dia = Store.caja(cajaFechaK);
      const hechos = dia.filter((x) => x.terminado && !x.anulado);
      const total = hechos.reduce((a, x) => a + x.monto, 0);
      const lineas = [
        'Cierre de Caja — Estudio Demo (' + (cajaFechaK === hoyK ? 'Hoy ' + fechaCorta(hoyK) : fechaCorta(cajaFechaK)) + ')',
        'Total cobrado: ' + pesos(total),
        ''
      ];
      MEDIOS.forEach((m) => {
        const sub = hechos.filter((x) => x.medio === m).reduce((a, x) => a + x.monto, 0);
        if (sub > 0) lineas.push('• ' + m + ': ' + pesos(sub));
      });
      lineas.push('');
      dia.forEach((x) => {
        lineas.push('- ' + hhmm(x.fin) + ' ' + x.nom + ' (' + x.servicios.join(' + ') + '): ' + (x.anulado ? 'No se cobró' : x.sinPrecio ? 'Sin precio' : pesos(x.monto) + ' [' + x.medio + ']'));
      });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lineas.join('\n')).then(() => aviso('Resumen de caja copiado al portapapeles.'));
      } else {
        aviso('Total del día: ' + pesos(total));
      }
    });
  }

  /* Cobrar: cada servicio con su precio, se puede corregir, agregar otra cosa y hacer descuento */
  const dc = $('#d-cambiar');
  let cbId = null, cbMedio = null, cbFecha = null;
  const num = (t) => Number(String(t == null ? '' : t).replace(/[^\d]/g, '')) || 0;
  const filaCb = (n, p) => '<div class="cb-lin"><input class="cb-n" value="' + esc(n || '') + '" aria-label="Qué se hizo" placeholder="Qué se hizo">' +
    '<input class="cb-p" inputmode="numeric" value="' + (p ? p : '') + '" placeholder="Precio" aria-label="Precio"><button class="cb-x" type="button" aria-label="Quitar">×</button></div>';
  function totalCb() {
    const suma = [...document.querySelectorAll('#cb-lineas .cb-p')].reduce((a, i) => a + num(i.value), 0);
    const t = Math.max(0, suma - num($('#cb-desc').value));
    $('#cb-total').textContent = pesos(t);
    return t;
  }
  function abrirCobro(id, fechaK) {
    const x = Store.caja(fechaK || hoyK).find((y) => y.id === id);
    if (!x) return;
    cbId = id; cbFecha = fechaK || hoyK;
    $('#cb-titulo').textContent = 'Cobrar a ' + x.nom;
    $('#cb-lineas').innerHTML = x.lineas.map((l) => filaCb(l.n, l.p)).join('');
    $('#cb-desc').value = x.descuento || '';
    cbMedio = MEDIOS.includes(x.medio) ? x.medio : null;
    document.querySelectorAll('#cb-medios .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.m === cbMedio)));
    totalCb();
    dc.showModal();
  }
  window.abrirCobro = abrirCobro;
  $('#caja-mov').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cambiar]');
    if (b) abrirCobro(b.dataset.cambiar, cajaFechaK);
  });
  $('#cb-lineas').addEventListener('input', totalCb);
  $('#cb-desc').addEventListener('input', totalCb);
  $('#cb-lineas').addEventListener('click', (e) => {
    const b = e.target.closest('.cb-x');
    if (b) { b.closest('.cb-lin').remove(); totalCb(); }
  });
  $('#cb-add').addEventListener('click', () => {
    $('#cb-lineas').insertAdjacentHTML('beforeend', filaCb('', ''));
    const n = document.querySelectorAll('#cb-lineas .cb-n'); n[n.length - 1].focus();
  });
  $('#cb-medios').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    cbMedio = cbMedio === b.dataset.m ? null : b.dataset.m;
    document.querySelectorAll('#cb-medios .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.m === cbMedio)));
  });
  function despuesCobro(msg) {
    dc.close();
    pintarCaja();
    window.refrescarHoy && window.refrescarHoy();
    aviso(msg);
  }
  $('#cb-ok').addEventListener('click', () => {
    const lin = [...document.querySelectorAll('#cb-lineas .cb-lin')].map((r) => ({
      n: r.querySelector('.cb-n').value.trim() || 'Otro',
      p: r.querySelector('.cb-p').value.trim() === '' ? null : num(r.querySelector('.cb-p').value),
    })).filter((l) => l.n || l.p);
    if (lin.some((l) => l.p === null)) { aviso('Falta poner el precio de alguna línea.'); return; }
    const desc = num($('#cb-desc').value);
    const monto = Math.max(0, lin.reduce((a, l) => a + l.p, 0) - desc);
    Store.ajustarCobro(cbId, { lin, desc, monto, medio: cbMedio || 'Sin especificar', anulado: false, pagado: true });
    despuesCobro('Cobro de ' + pesos(monto) + ' guardado.');
  });
  $('#cb-no').addEventListener('click', () => {
    Store.ajustarCobro(cbId, { anulado: true });
    despuesCobro('Anotado: no se cobró.');
  });

  /* Forma de pago habitual (la caja la usa para todos los turnos) */
  function pintarMedioHabitual() {
    const m = Store.medioHabitual();
    $('#aj-medio').innerHTML = MEDIOS.map((x) => '<button class="chip" type="button" data-m="' + x + '" aria-pressed="' + (x === m) + '">' + x + '</button>').join('');
  }
  $('#aj-medio').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    Store.setMedioHabitual(b.dataset.m);
    pintarMedioHabitual();
    pintarCaja();
    aviso('Guardado.');
  });

  /* ---------- Ajustes (se guardan y se ven solos en la página) ---------- */
  function pintarServicios() {
    const aj = Store.ajustes();
    const ocultos = Store.ocultos();
    $('#aj-serv').innerHTML = SERV().map((s) => {
      const t = Store.tiempos(s, 'medio');
      const p = aj[s.id] && aj[s.id].precio ? aj[s.id].precio : '';
      const oculto = ocultos.includes(s.id);
      return '<div class="fila-serv' + (oculto ? ' oculto' : '') + '" data-id="' + s.id + '"><input class="nom" value="' + esc(s.nombre) + '" aria-label="Servicio" readonly>' +
        '<label class="cap"><small>Dura (min)</small><input data-c="min" inputmode="numeric" value="' + t.min + '"></label>' +
        '<label class="cap"><small>Espera (min)</small><input data-c="esp" inputmode="numeric" value="' + t.esp + '"></label>' +
        '<label class="cap"><small>Precio ($)</small><input data-c="precio" inputmode="numeric" value="' + p + '" placeholder="A cargar"></label></div>' +
        '<div class="serv-acciones">' + (oculto ? '<span class="etiqueta pend">Oculto en la página</span>' : '') +
        '<button class="btn suave chico" type="button" data-vis="' + s.id + '">' + (oculto ? 'Volver a mostrar' : 'Quitar de la página') + '</button>' +
        (s.propio ? '<button class="btn suave chico" type="button" data-borrar="' + s.id + '">Borrar</button>' : '') + '</div>';
    }).join('');
    $('#aj-foto-serv').innerHTML = SERV().map((s) => '<option value="' + s.id + '">' + esc(s.nombre) + '</option>').join('');
    const filEl = $('#aj-foto-filtro');
    if (filEl) {
      const valActual = filEl.value || 'todos';
      filEl.innerHTML = '<option value="todos">Todos los trabajos visibles (' + Store.galeria().length + ')</option>' +
        '<option value="subidas">Subidas desde el panel (' + Store.fotosSubidas().length + ')</option>' +
        SERV().map((s) => '<option value="' + s.id + '">' + esc(s.nombre) + '</option>').join('');
      filEl.value = valActual;
    }
  }
  $('#aj-serv').addEventListener('click', (e) => {
    const v = e.target.closest('[data-vis]');
    const d = e.target.closest('[data-borrar]');
    if (v) {
      const id = v.dataset.vis;
      if (Store.ocultos().includes(id)) { Store.servicioMostrar(id); aviso('Vuelve a verse en la página.'); } else { Store.servicioOcultar(id); aviso('Ya no se ve en la página. Lo podés volver a mostrar.'); }
      pintarServicios();
    }
    if (d) { Store.servicioBorrar(d.dataset.borrar); aviso('Servicio borrado.'); pintarServicios(); }
  });

  /* Agregar un servicio nuevo: aparece solo en la lista y en el turnero de la página */
  const dns = $('#d-nuevo-serv');
  const sino = (id) => document.querySelector('#' + id + ' [aria-pressed="true"]').dataset.v === 'si';
  $('#aj-nuevo-serv').addEventListener('click', () => {
    ['ns-nombre', 'ns-detalle', 'ns-min', 'ns-esp', 'ns-precio'].forEach((i) => { $('#' + i).value = ''; });
    $('#ns-esp').value = '0';
    $('#ns-grupo').innerHTML = Store.catalogoTodo().map((g) => '<option value="' + esc(g.nombre) + '">' + esc(g.nombre) + '</option>').join('') + '<option value="Otros">Otros</option>';
    ['ns-largo', 'ns-pelo', 'ns-color'].forEach((id) => { const si = id !== 'ns-color'; document.querySelectorAll('#' + id + ' .chip').forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.v === 'si') === si))); });
    $('#ns-error').textContent = '';
    dns.showModal();
    setTimeout(() => $('#ns-nombre').focus(), 50);
  });
  ['ns-largo', 'ns-pelo', 'ns-color'].forEach((id) => $('#' + id).addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    document.querySelectorAll('#' + id + ' .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
  }));
  $('#ns-ok').addEventListener('click', () => {
    const nombre = $('#ns-nombre').value.trim();
    const min = Number($('#ns-min').value.replace(/[^\d]/g, ''));
    if (nombre.length < 2) { $('#ns-error').textContent = 'Escribí el nombre del servicio.'; $('#ns-nombre').focus(); return; }
    if (!min || min < 10) { $('#ns-error').textContent = 'Escribí cuántos minutos dura, por ejemplo 90.'; $('#ns-min').focus(); return; }
    Store.servicioNuevo({
      nombre, detalle: $('#ns-detalle').value.trim(), grupo: $('#ns-grupo').value,
      largo: sino('ns-largo'), pelo: sino('ns-pelo'), color: sino('ns-color'),
      min, esp: Number($('#ns-esp').value.replace(/[^\d]/g, '')) || 0, precio: Number($('#ns-precio').value.replace(/[^\d]/g, '')) || 0,
    });
    dns.close();
    pintarServicios();
    aviso('Servicio agregado. Ya se puede reservar en la página.');
  });
  $('#aj-serv').addEventListener('change', (e) => {
    const i = e.target.closest('input[data-c]');
    if (!i) return;
    const id = i.closest('.fila-serv').dataset.id;
    const v = Number(i.value.replace(/[^\d]/g, ''));
    Store.guardarServicio(id, { [i.dataset.c]: v });
    i.value = v || '';
    aviso('Guardado. La página ya usa este dato.');
  });

  /* Días de atención y margen de sin turno conectados de verdad a Store */
  const DIAS_AT = [['lun', 1], ['mar', 2], ['mié', 3], ['jue', 4], ['vie', 5], ['sáb', 6], ['dom', 7]];
  function pintarDiasAtencion() {
    const activos = Store.diasAtencion();
    $('#aj-dias').innerHTML = DIAS_AT.map(([n, num]) =>
      '<button class="chip" type="button" data-dia-at="' + num + '" aria-pressed="' + activos.includes(num) + '">' + n + '</button>'
    ).join('');
    const selM = $('#aj-margen');
    if (selM) selM.value = Store.margenSinTurno();
  }
  $('#aj-dias').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia-at]');
    if (!b) return;
    const num = Number(b.dataset.diaAt);
    const act = Store.diasAtencion();
    const nuevo = act.includes(num) ? act.filter((x) => x !== num) : act.concat([num]).sort();
    if (!nuevo.length) { aviso('Tiene que quedar al menos un día de atención activo.'); return; }
    Store.setDiasAtencion(nuevo);
    pintarDiasAtencion();
    pintarAgenda();
    aviso('Días de atención actualizados en la página y la agenda.');
  });
  const selMargen = $('#aj-margen');
  if (selMargen) {
    selMargen.addEventListener('change', () => {
      Store.setMargenSinTurno(selMargen.value);
      aviso('Preferencia guardada.');
    });
  }

  /* Fotos: paginadas y con filtro para no sobrecargar el navegador con las 697 publicaciones */
  let limiteFotosAj = 18;
  function reducir(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const W = 540, H = 675;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const k = Math.max(W / img.width, H / img.height);
        const w = img.width * k, h = img.height * k;
        c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => rej(new Error('No se pudo leer la foto.'));
      img.src = url;
    });
  }
  function pintarFotos() {
    const todas = Store.galeria();
    const ocultas = Store.ocultasIds();
    const btnRest = $('#aj-restaurar-fotos');
    if (btnRest) {
      btnRest.hidden = ocultas.length === 0;
      btnRest.textContent = 'Restaurar ' + ocultas.length + (ocultas.length === 1 ? ' trabajo oculto' : ' trabajos ocultos');
    }
    const cuentaEl = $('#aj-fotos-cuenta');
    if (cuentaEl) cuentaEl.textContent = todas.length + ' visibles en la página';

    const filtro = ($('#aj-foto-filtro') && $('#aj-foto-filtro').value) || 'todos';
    const filtrada = filtro === 'todos'
      ? todas
      : filtro === 'subidas'
        ? Store.fotosSubidas()
        : todas.filter((x) => (x.servIds || [x.servId]).includes(filtro));

    const vis = filtrada.slice(0, limiteFotosAj);
    $('#aj-fotos').innerHTML = vis.length ? vis.map((x) => {
      const s = SERV().find((y) => y.id === x.servId);
      const nom = x.titulo || (s ? s.nombre : x.servId);
      const tUrl = String(x.url || '').startsWith('img/trabajos/') ? x.url.replace('img/trabajos/', 'img/thumbs/') : x.url;
      return '<figure class="foto-subida"><img src="' + tUrl + '" loading="lazy" alt="Foto de ' + esc(nom) + '"><figcaption>' + esc(nom) +
        '</figcaption><button class="btn suave chico" type="button" data-quitar="' + x.id + '">Ocultar</button></figure>';
    }).join('') : '<p class="vacio" style="padding:12px 0 0">No hay fotos en este filtro.</p>';

    const masWrap = $('#aj-fotos-mas-wrap');
    const btnMas = $('#aj-fotos-mas');
    if (masWrap && btnMas) {
      const rest = filtrada.length - vis.length;
      masWrap.hidden = rest <= 0;
      if (rest > 0) btnMas.textContent = 'Ver ' + Math.min(24, rest) + ' fotos más (' + rest + ' restantes)';
    }
  }
  const filFotosEl = $('#aj-foto-filtro');
  if (filFotosEl) {
    filFotosEl.addEventListener('change', () => {
      limiteFotosAj = 18;
      pintarFotos();
    });
  }
  const btnFotosMas = $('#aj-fotos-mas');
  if (btnFotosMas) {
    btnFotosMas.addEventListener('click', () => {
      limiteFotosAj += 24;
      pintarFotos();
    });
  }
  const btnRestFotos = $('#aj-restaurar-fotos');
  if (btnRestFotos) {
    btnRestFotos.addEventListener('click', () => {
      Store.restaurarTodasFotos();
      pintarServicios();
      pintarFotos();
      aviso('Se restauraron todos los trabajos ocultos.');
    });
  }
  $('#aj-foto-in').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const urls = [];
      for (const f of files) {
        const d = await reducir(f);
        urls.push(window.NUBE && window.NUBE.subirFoto ? await window.NUBE.subirFoto(d) : d);
      }
      const servId = $('#aj-foto-serv').value;
      const servIt = SERV().find((s) => s.id === servId);
      const titulo = ($('#aj-foto-tit') && $('#aj-foto-tit').value.trim()) || (servIt ? servIt.nombre : 'Trabajo en salón');
      const texto = ($('#aj-foto-txt') && $('#aj-foto-txt').value.trim()) || '';
      const ig = ($('#aj-foto-ig') && $('#aj-foto-ig').value.trim()) || '';
      const ok = Store.agregarFoto(servId, urls[0], {
        titulo,
        texto,
        ig: ig || undefined,
        fotos: urls
      });
      if (!ok) {
        aviso('No hay más lugar para fotos en este navegador.');
      } else {
        if ($('#aj-foto-tit')) $('#aj-foto-tit').value = '';
        if ($('#aj-foto-txt')) $('#aj-foto-txt').value = '';
        if ($('#aj-foto-ig')) $('#aj-foto-ig').value = '';
        aviso('Trabajo publicado (' + urls.length + (urls.length === 1 ? ' foto' : ' fotos') + '). Ya se ve primero en toda la página.');
      }
    } catch (err) { aviso(err.message); }
    e.target.value = '';
    pintarServicios();
    pintarFotos();
  });
  $('#aj-fotos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-quitar]');
    if (b) {
      Store.quitarFoto(b.dataset.quitar);
      pintarServicios();
      pintarFotos();
      aviso('Trabajo ocultado de la página.');
    }
  });

  /* Instagram, WhatsApp y datos del local: se ven solos en la página */
  function pintarMarcaAj() {
    const m = Store.marca();
    if ($('#mk-wa')) $('#mk-wa').value = m.whatsapp || '';
    $('#mk-insta').value = m.instagram || '';
    $('#mk-dir').value = m.direccion || '';
    $('#mk-coord').value = m.coordenadas || '';
    $('#mk-hor').value = m.horario || '';
    const estPared = $('#estado-pared');
    if (estPared) {
      const lat = Store.ultimoLatido();
      const activa = lat && (Date.now() - lat < 60000);
      estPared.textContent = activa ? '● Encendida ahora' : 'Apagada o cerrada';
      estPared.style.color = activa ? 'var(--ok)' : 'var(--tinta-2)';
    }
  }
  [['#mk-wa', 'whatsapp'], ['#mk-insta', 'instagram'], ['#mk-dir', 'direccion'], ['#mk-coord', 'coordenadas'], ['#mk-hor', 'horario']].forEach(([sel, campo]) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const v = campo === 'instagram'
        ? e.target.value.replace(/[@\s]/g, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '')
        : campo === 'coordenadas'
          ? e.target.value.replace(/[()\s]/g, '')
          : campo === 'whatsapp'
            ? e.target.value.replace(/[^\d]/g, '')
            : e.target.value.trim();
      e.target.value = v;
      Store.guardarMarca({ [campo]: v });
      aviso('Guardado. Ya se ve en la página.');
    });
  });

  /* QR y alias */
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const verQr = (src) => { $('#qr-vista').innerHTML = src ? '<img src="' + src + '" alt="Tu QR de cobro">' : 'Sin QR'; };
  verQr(leer('qrla profesional'));
  $('#alias').value = leer('aliasla profesional') || '';
  $('#alias').addEventListener('input', () => guardar('aliasla profesional', $('#alias').value));
  $('#qr-in').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { guardar('qrla profesional', r.result); verQr(r.result); };
    r.readAsDataURL(f);
  });

  /* Tiempo extra según el pelo */
  const EXTRAS = [['enrulado', 'Pelo enrulado', 'Se suma a cualquier servicio'], ['previo', 'Con tintura o decoloración previa', 'Solo servicios de color'], ['mucho', 'Mucho pelo', 'Se suma a cualquier servicio']];
  function pintarExtras() {
    const e = Store.extrasMin();
    $('#aj-extras').innerHTML = EXTRAS.map(([id, nombre, nota]) =>
      '<div class="extra-fila"><div><b>' + nombre + '</b><span>' + nota + '</span></div><label class="cap"><small>Suma (min)</small><input data-x="' + id + '" inputmode="numeric" value="' + e[id] + '"></label></div>'
    ).join('');
  }
  $('#aj-extras').addEventListener('change', (ev) => {
    const i = ev.target.closest('input[data-x]');
    if (!i) return;
    const v = Math.max(0, Number(i.value.replace(/[^\d]/g, '')) || 0);
    Store.guardarExtras({ [i.dataset.x]: v });
    i.value = v;
    aviso('Guardado. La página ya suma estos minutos.');
  });

  /* Sugerencias: cuando varios atrasos apuntan al mismo servicio, se propone subir su duración */
  function pintarSugerencias() {
    const s = Store.sugerencias();
    $('#b-sugerencias').hidden = s.length === 0;
    $('#sugerencias').innerHTML = s.map((x) => {
      const it = SERV().find((y) => y.id === x.servId);
      return '<div class="sugerencia"><p><b>' + esc(it ? it.nombre : x.servId) + '</b> te hizo llegar tarde ' + x.n + ' veces, en promedio ' + x.prom + ' minutos. ¿Subimos la duración en ' + x.prom + ' minutos?</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn chico" type="button" data-aplicar="' + x.servId + '">Sí, subirla</button><button class="btn suave chico" type="button" data-descartar="' + x.servId + '">No, dejarla</button></div></div>';
    }).join('');
  }
  $('#sugerencias').addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-aplicar]');
    const d = ev.target.closest('[data-descartar]');
    if (a) { Store.aplicarSugerencia(a.dataset.aplicar, SERV().find((y) => y.id === a.dataset.aplicar)); pintarServicios(); aviso('Listo. La página ya usa la duración nueva.'); }
    if (d) { Store.descartarSugerencia(d.dataset.descartar); aviso('Está bien, la dejamos como estaba.'); }
    pintarSugerencias();
  });

  window.refrescarVistas = function () {
    pintarSugerencias();
    pintarAgenda();
    pintarClientas();
    pintarCaja();
    pintarMarcaAj();
  };
  pintarServicios();
  pintarDiasAtencion();
  pintarMarcaAj();

  /* ---------- Días libres, feriados y horarios especiales ---------- */
  const FERIADOS = [['2026-12-08', 'Inmaculada Concepción'], ['2026-12-25', 'Navidad'], ['2027-01-01', 'Año Nuevo']];
  const fechaLarga = (f) => { const p = f.split('-').map(Number); const d = new Date(p[0], p[1] - 1, p[2]); return DIAS_C[d.getDay()] + ' ' + p[2] + '/' + p[1]; };
  function pintarBloqueos() {
    if (!$('#bq-lista')) return;
    const bl = Store.bloqueos().filter((b) => b.hasta >= hoyK).sort((x, y) => x.desde.localeCompare(y.desde));
    $('#bq-lista').innerHTML = bl.length ? bl.map((b) =>
      '<div class="fila"><div class="dato"><b>' + (b.desde === b.hasta ? fechaLarga(b.desde) : fechaLarga(b.desde) + ' al ' + fechaLarga(b.hasta)) + '</b><span>' + esc(b.motivo || 'Cerrado') + '</span></div>' +
      '<div class="acciones"><button class="btn chico suave" type="button" data-reabrir="' + b.id + '">Reabrir</button></div></div>').join('') : '<p class="vacio">No hay días cerrados.</p>';
    const cerradas = new Set(bl.map((b) => b.desde));
    $('#bq-feriados').innerHTML = FERIADOS.filter((f) => f[0] >= hoyK && !cerradas.has(f[0])).map((f) =>
      '<button class="chip" type="button" data-feriado="' + f[0] + '">' + fechaLarga(f[0]) + ' · ' + f[1] + '</button>').join('') || '<span class="vacio">No hay feriados para cerrar.</span>';
    const es = Store.especiales();
    const ks = Object.keys(es).filter((k) => k >= hoyK).sort();
    $('#es-lista').innerHTML = ks.length ? ks.map((k) =>
      '<div class="fila"><div class="dato"><b>' + fechaLarga(k) + '</b><span>' + es[k].map((t) => hhmm(t[0]) + ' a ' + hhmm(t[1])).join(' y ') + '</span></div>' +
      '<div class="acciones"><button class="btn chico suave" type="button" data-quitar-esp="' + k + '">Quitar</button></div></div>').join('') : '';
  }
  function mostrarAfectados(desde, hasta, motivo) {
    const ts = Store.turnosEnRango(desde, hasta);
    const box = $('#bq-afectados');
    if (!ts.length) { box.innerHTML = '<p class="vacio" style="margin-top:10px">No había turnos en esos días.</p>'; return; }
    box.innerHTML = '<p style="font-weight:700;margin-top:14px">Había ' + ts.length + (ts.length === 1 ? ' turno' : ' turnos') + ' en esos días. Avisales con un toque:</p>' + ts.map((t) =>
      '<div class="fila"><div class="hora-f">' + fechaLarga(t.fecha) + '</div><div class="dato"><b>' + esc(t.nom) + '</b><span>' + hhmm(t.ini) + ' · ' + esc(t.serv) + '</span></div><div class="acciones">' +
      (t.tel ? '<a class="btn chico" target="_blank" rel="noopener" href="' + wa(t.tel, 'Hola ' + t.nom.split(' ')[0] + ', no voy a poder atender el ' + fechaLarga(t.fecha) + (motivo ? ' (' + motivo.toLowerCase() + ')' : '') + '. ¿Te paso a otro día? Perdón por el cambio. Estudio Demo.') + '">Avisar</a>' : '') +
      '<button class="btn chico suave" type="button" data-turno-op="' + t.id + '">Mover</button></div></div>').join('');
  }
  $('#bq-ok').addEventListener('click', () => {
    const d = $('#bq-desde').value, h = $('#bq-hasta').value || d;
    if (!d) { $('#bq-error').textContent = 'Elegí desde qué día.'; return; }
    if (h < d) { $('#bq-error').textContent = 'El último día no puede ser antes del primero.'; return; }
    $('#bq-error').textContent = '';
    const motivo = $('#bq-motivo').value;
    Store.bloquear(d, h, motivo);
    pintarBloqueos(); mostrarAfectados(d, h, motivo); refrescar();
    aviso('Listo: esos días ya no se pueden reservar.');
  });
  $('#bq-feriados').addEventListener('click', (e) => {
    const b = e.target.closest('[data-feriado]');
    if (!b) return;
    Store.bloquear(b.dataset.feriado, b.dataset.feriado, 'Feriado');
    pintarBloqueos(); mostrarAfectados(b.dataset.feriado, b.dataset.feriado, 'Feriado'); refrescar();
    aviso('Feriado cerrado.');
  });
  $('#bq-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-reabrir]');
    if (!b) return;
    Store.desbloquear(b.dataset.reabrir);
    pintarBloqueos(); refrescar();
    aviso('Esos días vuelven a estar disponibles.');
  });
  $('#es-ok').addEventListener('click', () => {
    const d = $('#es-dia').value;
    const min = (hhmmStr) => { const p = String(hhmmStr).split(':').map(Number); return p[0] * 60 + (p[1] || 0); };
    const a = min($('#es-desde').value), b = min($('#es-hasta').value);
    if (!d) { $('#es-error').textContent = 'Elegí el día.'; return; }
    if (!(b > a)) { $('#es-error').textContent = 'La hora de cierre tiene que ser después de la de apertura.'; return; }
    $('#es-error').textContent = '';
    Store.setEspecial(d, [[a, b]]);
    pintarBloqueos(); refrescar();
    aviso('Ese día se atiende de ' + hhmm(a) + ' a ' + hhmm(b) + '.');
  });
  $('#es-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-quitar-esp]');
    if (!b) return;
    Store.setEspecial(b.dataset.quitarEsp, null);
    pintarBloqueos(); refrescar();
  });
  pintarBloqueos();

  /* ---------- Resumen por WhatsApp: lo de hoy, lo de mañana y lo cobrado ---------- */
  const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function resumenTexto() {
    const hoyD = new Date();
    const f0 = Store.clave(hoyD);
    const ahora = Store.ahora();
    const del = (f) => Store.dia(f);
    const hoyT = del(f0);
    const hechos = Store.caja(f0).filter((x) => x.terminado && !x.anulado);
    const cobrado = hechos.reduce((a, x) => a + x.monto, 0);
    const previsto = Store.caja(f0).filter((x) => !x.anulado).reduce((a, x) => a + x.monto, 0);
    const lineas = ['Estudio Demo, resumen de ' + DIAS_L[hoyD.getDay()] + ' ' + hoyD.getDate() + '/' + (hoyD.getMonth() + 1), ''];
    if (hoyT.length) {
      const atendidas = hoyT.filter((t) => t.ini + Store.total(t.seg) <= ahora).length;
      lineas.push('HOY: ' + hoyT.length + (hoyT.length === 1 ? ' turno' : ' turnos') + ' (' + atendidas + (atendidas === 1 ? ' ya atendido' : ' ya atendidos') + ').');
      lineas.push('Cobrado: ' + pesos(cobrado) + (previsto > cobrado ? ' de ' + pesos(previsto) + ' agendado' : '') + '.');
    } else {
      lineas.push('HOY: sin turnos.');
    }
    let k = 1, fm = null, dm = null;
    for (; k <= 7; k++) { dm = Store.sumar(hoyD, k); fm = Store.clave(dm); if (del(fm).length) break; fm = null; }
    lineas.push('');
    if (fm) {
      const ts = del(fm);
      lineas.push((k === 1 ? 'MAÑANA' : DIAS_L[dm.getDay()].toUpperCase() + ' ' + dm.getDate()) + ': ' + ts.length + (ts.length === 1 ? ' turno' : ' turnos') + '.');
      ts.slice(0, 5).forEach((t) => lineas.push('- ' + hhmm(t.ini) + ' ' + t.nom + ' (' + t.serv + ')'));
      if (ts.length > 5) lineas.push('- y ' + (ts.length - 5) + ' más');
    } else {
      lineas.push('Los próximos días no hay turnos cargados.');
    }
    const nuevas = Store.todos().filter((t) => t.origen === 'web' && Store.esNuevo(t) && t.estado !== 'cancelado');
    if (nuevas.length) { lineas.push(''); lineas.push('Reservas nuevas desde la página: ' + nuevas.length + '.'); }
    return lineas.join('\n');
  }
  function pintarResumenWa() {
    const box = $('#rs-vista'); if (!box) return;
    box.textContent = resumenTexto();
    const t = Store.privado().resumenTel;
    if (t && $('#rs-tel') && document.activeElement !== $('#rs-tel')) $('#rs-tel').value = t;
  }
  if ($('#rs-enviar')) {
    $('#rs-tel').addEventListener('change', () => { Store.setPrivado({ resumenTel: $('#rs-tel').value.trim() }); });
    $('#rs-enviar').addEventListener('click', () => {
      const tel = $('#rs-tel').value.replace(/[^\d]/g, '');
      if (tel.length < 8) { $('#rs-error').textContent = 'Poné tu WhatsApp con la característica (sin 0 ni 15).'; $('#rs-tel').focus(); return; }
      $('#rs-error').textContent = '';
      Store.setPrivado({ resumenTel: $('#rs-tel').value.trim() });
      const num = tel.startsWith('54') ? tel : '54' + (tel.startsWith('9') ? '' : '9') + tel;
      window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(resumenTexto()), '_blank', 'noopener');
    });
    pintarResumenWa();
  }
  pintarExtras();
  pintarMedioHabitual();
  pintarFotos();
  window.refrescarVistas();
})();
