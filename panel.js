(function () {
  const I = window.ICONO;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dur = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + ' h ' + r + ' min' : h + ' h') : r + ' min'; };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  const hoyK = Store.clave(hoy);
  $('#fecha').textContent = DIAS[hoy.getDay()][0].toUpperCase() + DIAS[hoy.getDay()].slice(1) + ' ' + hoy.getDate() + ' de ' + MESES[hoy.getMonth()];
  $('#ico-mas').innerHTML = I.mas;

  /* ---------- Secciones ---------- */
  const SECC = [['hoy', 'Hoy'], ['caja', 'Mis ganancias'], ['mas', 'Más']];
  const ICO_NAV = { hoy: I.hoy, caja: I.caja, mas: I.ajustes };
  const pintarNav = (el) => {
    el.insertAdjacentHTML('beforeend', SECC.map(([k, n]) =>
      '<button class="pestana" data-k="' + k + '"' + (k === 'hoy' ? ' aria-current="page"' : '') + '>' + ICO_NAV[k] + '<span>' + n + '</span></button>'
    ).join(''));
  };
  pintarNav($('#lateral'));
  pintarNav($('#barra'));
  const irA = (k, resalta) => {
    document.querySelectorAll('.vista').forEach((v) => (v.hidden = v.id !== 'v-' + k));
    document.querySelectorAll('.pestana').forEach((p) => p.setAttribute('aria-current', p.dataset.k === (resalta || k) ? 'page' : 'false'));
    window.scrollTo(0, 0);
  };
  ['agenda', 'clientas', 'ajustes'].forEach((k) => {
    const v = document.getElementById('v-' + k);
    if (v) v.insertAdjacentHTML('afterbegin', '<button class="volver-mas" type="button" data-ir="mas">‹ Volver</button>');
  });
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-ir]');
    if (r) { const k = r.dataset.ir; return irA(k, 'mas'); }
    const b = e.target.closest('.pestana');
    if (!b) return;
    irA(b.dataset.k);
  });

  /* ---------- Aviso breve ---------- */
  let tt;
  function aviso(t) {
    const el = $('#toast');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(tt);
    tt = setTimeout(() => (el.hidden = true), 3200);
  }
  window.avisoPanel = aviso;
  const wa = (tel, msg) => 'https://wa.me/' + String(tel || '').replace(/[^\d]/g, '') + '?text=' + encodeURIComponent(msg);
  const desc = (t) => t.serv + (t.largo ? ', pelo ' + t.largo : '') + (t.nota ? ' — «' + t.nota + '»' : '');

  /* ---------- Siguiente y el resto del día (salen solos de la agenda) ---------- */
  const restantes = () => Store.dia(hoyK).filter((t) => t.ini > Store.ahora());
  let conocidos = new Set(Store.todos().map((t) => t.id));

  function pintarSiguiente() {
    const lista = restantes();
    const s = lista[0];
    $('#sig').innerHTML = s
      ? '<div class="siguiente"><div class="hora-grande-p">' + hhmm(s.ini) + '</div><div style="flex:1;min-width:0"><div class="quien">' + esc(s.nom) +
        (Store.esNuevo(s) ? '<span class="etiqueta">Nueva</span>' : '') + (s.origen === 'sin_turno' ? '<span class="etiqueta verde">Sin turno</span>' : '') +
        '</div><div class="que">' + esc(desc(s)) + '</div>' +
        '<div class="acc-sig">' +
        (s.tel ? '<a class="btn chico suave" target="_blank" rel="noopener" href="' + wa(s.tel, 'Hola ' + s.nom.split(' ')[0] + ', te esperamos hoy a las ' + hhmm(s.ini) + ' en Estudio Demo.') + '">WhatsApp</a>' : '') +
        '<button class="btn chico suave" type="button" data-sumar="' + s.id + '">+ Sumar</button>' +
        '<button class="btn chico suave" type="button" data-turno-op="' + s.id + '">Más opciones</button>' +
        '<button class="btn chico suave" type="button" data-cancelar="' + s.id + '">Cancelar</button>' +
        '</div></div></div>'
      : '<p class="vacio">No hay más turnos para hoy.</p>';
    const resto = lista.slice(1);
    $('#cuenta').textContent = resto.length + (resto.length === 1 ? ' turno' : ' turnos');
    $('#filas').innerHTML = resto.length ? resto.map((t) =>
      '<div class="fila"><div class="hora-f">' + hhmm(t.ini) + '</div><div class="dato"><b>' + esc(t.nom) +
      (Store.esNuevo(t) ? '<span class="etiqueta">Nueva</span>' : '') + (t.origen === 'sin_turno' ? '<span class="etiqueta verde">Sin turno</span>' : '') +
      '</b><span>' + esc(desc(t)) + '</span></div>' +
      '<div class="acciones">' +
      (t.tel ? '<a class="btn chico suave" target="_blank" rel="noopener" href="' + wa(t.tel, 'Hola ' + t.nom.split(' ')[0] + ', te esperamos hoy a las ' + hhmm(t.ini) + ' en Estudio Demo.') + '">WhatsApp</a>' : '') +
      '<button class="btn chico suave" type="button" data-turno-op="' + t.id + '">Más opciones</button>' +
      '</div></div>'
    ).join('') : '<p class="vacio">No hay más turnos después del siguiente.</p>';
  }

  /* ---------- Para avisar (opcional; la clienta ya se llevó la alarma en su calendario) ---------- */
  function pintarManana() {
    let f = null, d = null, k;
    for (k = 1; k <= 7; k++) {
      const dd = Store.sumar(hoy, k);
      const ff = Store.clave(dd);
      if (Store.dia(ff).length) { f = ff; d = dd; break; }
    }
    const cont = $('#manana');
    if (!f) { $('#manana-n').textContent = ''; cont.innerHTML = '<p class="vacio">No hay turnos en los próximos días para avisar.</p>'; return; }
    const cuando = k === 1 ? 'mañana' : 'el ' + DIAS[d.getDay()] + ' ' + d.getDate();
    $('#manana-t').textContent = 'Para avisar ' + cuando;
    $('#manana-n').textContent = Store.dia(f).length + (Store.dia(f).length === 1 ? ' turno' : ' turnos');
    cont.innerHTML = Store.dia(f).map((t) =>
      '<div class="fila"><div class="hora-f">' + hhmm(t.ini) + '</div><div class="dato"><b>' + esc(t.nom) + '</b><span>' + esc(t.serv) + '</span></div>' +
      '<div class="acciones"><a class="btn chico suave" target="_blank" rel="noopener" href="' +
      wa(t.tel, 'Hola ' + t.nom.split(' ')[0] + ', te escribo de Estudio Demo para confirmar tu turno ' + cuando + ' a las ' + hhmm(t.ini) + '. Si no podés venir, avisame y lo liberamos. Gracias.') +
      '">Avisar</a></div></div>'
    ).join('');
  }

  /* ---------- Llegaron sin turno: se anotan solas con el QR; la profesional solo decide cuándo pasarlas ---------- */
  function pintarFila() {
    const lista = Store.fila();
    $('#b-fila').hidden = lista.length === 0;
    $('#fila-cuenta').textContent = lista.length ? lista.length + ' esperando' : '';
    $('#fila').innerHTML = lista.map((e) => {
      const hora = e.est !== null ? hhmm(e.est) : '--:--';
      const msg = 'Hola ' + e.nom.split(' ')[0] + ', ya podés pasar por Estudio Demo.';
      return '<div class="fila"><div class="hora-f">' + hora + '</div><div class="dato"><b>' + esc(e.nom) + '</b><span>' + esc(desc(e)) +
        (e.est === null ? ', hoy no hay lugar' : '') + '</span></div><div class="acciones">' +
        '<button class="btn chico" data-pasar="' + e.id + '">Pasar</button>' +
        '<a class="btn chico suave" target="_blank" rel="noopener" href="' + wa(e.tel, msg) + '">Avisar</a>' +
        '<button class="btn chico suave" data-ausente="' + e.id + '">No vino</button></div></div>';
    }).join('');
  }
  $('#fila').addEventListener('click', (e) => {
    const p = e.target.closest('[data-pasar]');
    const a = e.target.closest('[data-ausente]');
    if (p) {
      const t = Store.pasar(p.dataset.pasar);
      if (t) aviso(t.nom + ' pasó a la agenda a las ' + hhmm(t.ini) + '.');
    }
    if (a) { Store.filaEstado(a.dataset.ausente, 'ausente'); aviso('Anotado: no vino.'); }
    refrescarHoy();
  });

  /* ---------- Llegó alguien sin turno: la profesional toca el servicio y listo ---------- */
  const dq = $('#d-qr');
  let stServId = null;

  function abrirSinTurno() {
    stServId = null;
    $('#st-nombre').value = '';
    const errEl = $('#st-error');
    if (errEl) errEl.style.display = 'none';
    $('#st-ok').disabled = true;

    // Genera los chips de servicios
    const lista = Store.catalogo();
    let h = '';
    lista.forEach((g) => {
      h += '<div class="grupo-p" style="margin-top:14px"><b style="font-size:1rem;color:var(--tinta-2)">' + g.nombre + '</b><div class="chips" style="margin-top:8px">';
      g.items.forEach((it) => {
        h += '<button class="chip chip-st" type="button" data-stid="' + it.id + '">' + it.nombre + '</button>';
      });
      h += '</div></div>';
    });
    h += '<div class="grupo-p" style="margin-top:14px"><div class="chips"><button class="chip chip-st" type="button" data-stid="consulta">A definir en la peluquería</button></div></div>';
    $('#st-lista').innerHTML = h;

    // Genera QR para la opción "que ella se anote"
    try {
      const url = new URL('estoy-aca.html', location.href).href;
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      $('#qr-grande').innerHTML = qr.createImgTag(8, 0);
    } catch (e) {
      $('#qr-grande').innerHTML = '<span>No se pudo generar el QR sin internet.</span>';
    }
    dq.showModal();
  }

  $('#btn-sin-turno').addEventListener('click', abrirSinTurno);

  // Acceso de 1 toque directo para walk-in (Corte, Peinado, Nutrición, Consulta)
  $('#d-qr').addEventListener('click', (e) => {
    const dir = e.target.closest('[data-directo]');
    if (dir) {
      const servId = dir.dataset.directo;
      const it = servId === 'consulta' ? window.CONSULTA : Store.itemsTodos().find((x) => x.id === servId);
      if (!it) return;
      const ahora = Store.ahora();
      const seg = Store.segmentos(it, 'medio');
      const ini = Store.primerLibre(hoyK, ahora, seg);
      if (ini === null) {
        aviso('Hoy no queda tiempo suficiente para ' + it.nombre + '. Conviene darle turno para otro día.');
        return;
      }
      const nom = ($('#st-nombre').value || '').trim() || 'Clienta en salón';
      Store.add({ fecha: hoyK, ini, nom, serv: it.nombre, servId: it.id, seg, origen: 'sin_turno', nuevo: true, creado: Date.now() });
      dq.close();
      refrescarHoy();
      aviso('¡Listo! ' + it.nombre + ' asignado a las ' + hhmm(ini) + '.');
      return;
    }
    const b = e.target.closest('.chip-st');
    if (!b) return;
    stServId = b.dataset.stid;
    const errEl = $('#st-error');
    if (errEl) errEl.style.display = 'none';
    document.querySelectorAll('.chip-st').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    $('#st-ok').disabled = false;
  });

  // Agregar: calcula el primer lugar libre y lo mete directo en la agenda
  $('#st-ok').addEventListener('click', () => {
    if (!stServId) return;
    const it = stServId === 'consulta' ? window.CONSULTA : Store.itemsTodos().find((x) => x.id === stServId);
    if (!it) return;
    const ahora = Store.ahora();
    const seg = Store.segmentos(it, 'medio');
    const ini = Store.primerLibre(hoyK, ahora, seg);
    if (ini === null) {
      const err = $('#st-error');
      err.textContent = 'Hoy no queda un hueco libre de ' + dur(Store.total(seg)) + ' para ' + it.nombre + '. Conviene darle turno para otro día.';
      err.style.display = 'block';
      return;
    }
    const nom = ($('#st-nombre').value || '').trim() || 'Clienta en salón';
    Store.add({ fecha: hoyK, ini, nom, serv: it.nombre, servId: it.id, seg, origen: 'sin_turno', nuevo: true, creado: Date.now() });
    dq.close();
    refrescarHoy();
    aviso(nom.split(' ')[0] + ' anotada a las ' + hhmm(ini) + ' (' + it.nombre + ').');
  });

  // Compat: el viejo botón "qr-sin-datos" ya no existe pero por las dudas no rompe
  const btnSd = $('#qr-sin-datos');
  if (btnSd) btnSd.addEventListener('click', () => {
    const ahora = Store.ahora();
    const ini = Store.primerLibre(hoyK, ahora, [['activo2', 30]]) || ahora;
    Store.add({ fecha: hoyK, ini, nom: 'Clienta sin datos', serv: 'Servicio sin especificar', origen: 'sin_turno', seg: [['activo2', 30]] });
    dq.close();
    refrescarHoy();
    aviso('Anotada a las ' + hhmm(ini) + '.');
  });

  /* ---------- Voy atrasada: se toca el minuto directamente, sin abrir ningún dialog ---------- */
  document.querySelector('.atraso-rapido').addEventListener('click', (e) => {
    const b = e.target.closest('[data-at]');
    if (!b) return;
    const min = Number(b.dataset.at);
    const enCurso = Store.dia(hoyK).find((t) => t.ini <= Store.ahora() && Store.ahora() < t.ini + Store.total(t.seg));
    Store.registrarAtraso(enCurso && enCurso.servId, min);
    const afectados = Store.atrasar(min);
    refrescarHoy();
    aviso('Corrido ' + min + ' minutos.' + (afectados.length ? ' Avisá a ' + afectados.length + ' clienta' + (afectados.length > 1 ? 's' : '') + ' desde la Agenda.' : ''));
  });

  /* ---------- Cerrar las reservas de hoy ---------- */
  const btnCerrar = $('#btn-cerrar');
  function pintarCerrar() {
    const c = Store.cerradoHoy();
    btnCerrar.textContent = c ? 'Reabrir reservas de hoy' : 'Cerrar reservas de hoy';
    btnCerrar.setAttribute('aria-pressed', String(c));
  }
  btnCerrar.addEventListener('click', () => {
    Store.cerrarHoy(!Store.cerradoHoy());
    pintarCerrar();
    aviso(Store.cerradoHoy() ? 'Hoy la página ya no toma más reservas.' : 'La página vuelve a tomar reservas hoy.');
  });

  document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- Ahora: sale de la agenda, con el servicio principal y todo lo que se fue sumando ---------- */
  const ETQ = { activo: 'Aplicación', espera: 'Espera', activo2: 'Trabajo' };
  const pesos = (n) => '$' + Number(n).toLocaleString('es-AR');
  function pintarAhora() {
    const ahora = Store.ahora();
    // Todos los turnos activos en este momento (puede haber más de uno si uno está en la espera de otro)
    const enCurso = Store.dia(hoyK).filter((x) => x.ini <= ahora && ahora < x.ini + Store.total(x.seg));
    const cont = $('#ahora');
    if (!enCurso.length) { $('#ahora-desde').textContent = ''; cont.innerHTML = '<p class="vacio" style="padding:0">Ahora no hay nadie en turno.</p>'; return; }

    let html = '';
    let huecoLibreHasta = null; // si hay espera activa sin otro turno encima, mostramos el aviso

    enCurso.forEach((t, idx) => {
      const total = Store.total(t.seg);
      const tr = Store.tramos(t.seg, t.ini);
      const actual = tr.find((x) => ahora >= x.a && ahora < x.b);
      const nombres = [t.serv].concat((t.adicionales || []).map((a) => a.serv));
      if (idx === 0) $('#ahora-desde').textContent = enCurso.length > 1 ? enCurso.length + ' en simultáneo' : 'Empezó a las ' + hhmm(t.ini);
      if (idx > 0) html += '<hr style="border:0;border-top:1px solid var(--linea);margin:14px 0">';
      html += '<div class="quien">' + esc(t.nom) + '</div><div class="que">' + esc(nombres.join(' + ')) + (t.largo ? ', pelo ' + esc(t.largo) : '') + '</div>';
      html += '<div class="linea-tiempo" aria-label="Etapas del turno">' +
        t.seg.map((s) => '<div class="tramo ' + s[0] + '" style="width:' + (s[1] / total * 100) + '%" title="' + esc(s[2] || ETQ[s[0]]) + '">' + esc(s[2] || ETQ[s[0]]) + '</div>').join('') +
        '<div class="marca-ahora" style="left:' + ((ahora - t.ini) / total * 100) + '%"></div></div>';
      // ¿Este turno está en espera? (Tiempo de pose / acción de producto)
      if (actual && actual.tipo === 'espera') {
        const rem = actual.b - ahora;
        const huecoOcupado = enCurso.some((o) => o.id !== t.id);
        if (!huecoOcupado) huecoLibreHasta = actual.b;

        let clasePose = 'badge-pose';
        let textoPose = '';
        if (rem <= 0) {
          clasePose += ' listo';
          textoPose = '<b>Tiempo cumplido.</b> Enjuagar a ' + esc(t.nom.split(' ')[0]) + ' ahora mismo.';
        } else if (rem <= 5) {
          clasePose += ' urgente';
          textoPose = '<b>Enjuagar pronto.</b> Quedan solo ' + rem + ' min de pose (a las ' + hhmm(actual.b) + ') para ' + esc(t.nom.split(' ')[0]) + '.';
        } else {
          textoPose = '<b>Tiempo de pose:</b> quedan ' + rem + ' min (enjuagar a las ' + hhmm(actual.b) + ') para ' + esc(t.nom.split(' ')[0]) + '.';
        }
        html += '<div class="' + clasePose + '">' + textoPose + '</div>';
      }
      html += '<div class="sumar"><button class="btn suave chico" data-sumar="' + t.id + '" type="button">Sumar un servicio a ' + esc(t.nom.split(' ')[0]) + '</button></div>';
    });

    // Aviso de hueco libre: la clienta se anota sola con el cartel QR y entra directo a la agenda
    if (huecoLibreHasta !== null) {
      const minLibres = huecoLibreHasta - ahora;
      html += '<div class="hueco">' +
        '<div><b>Estás libre por ' + minLibres + ' min (hasta las ' + hhmm(huecoLibreHasta) + ')</b>' +
        '<span>Podés meter un corte o peinado ahora sin atrasarte. Si alguien escanea el cartel, entra solo.</span></div>' +
        '</div>';
    }

    cont.innerHTML = html;
  }

  /* ---------- Para cobrar: el resumen de todo lo que se hizo, listo para decírselo a la clienta ---------- */
  function pintarCobrar() {
    const lista = Store.porCobrar();
    $('#b-cobrar').hidden = lista.length === 0;
    $('#cobrar-n').textContent = lista.length ? lista.length + (lista.length === 1 ? ' clienta' : ' clientas') : '';
    $('#cobrar').innerHTML = lista.map((x) =>
      '<div class="cobrar-fila"><div class="quien">' + esc(x.nom) + '</div><ul class="cb-resumen">' + x.lineas.map((l) => '<li><span>' + esc(l.n) + '</span><b>' + (l.p ? pesos(l.p) : 'falta precio') + '</b></li>').join('') + (x.descuento ? '<li><span>Descuento</span><b>−' + pesos(x.descuento) + '</b></li>' : '') + '</ul>' +
      '<div class="total">' + (x.faltaPrecio ? 'Total: ' + pesos(x.monto) + ' (faltan precios)' : 'Total: ' + pesos(x.monto)) + (x.medio && x.medio !== 'Sin especificar' ? '<small>' + esc(x.medio) + '</small>' : '') + '</div>' +
      '<div class="acciones-c">' +
      (x.faltaPrecio ? '<button class="btn chico" data-cobrar-ya="' + x.id + '" type="button">Poner precio y cobrar</button>' : '<button class="btn chico" data-cobrado="' + x.id + '" type="button">Cobrado ' + pesos(x.monto) + '</button><button class="btn chico suave" data-cobrar-ya="' + x.id + '" type="button">Cambiar</button>') +
      '<button class="btn chico suave" data-sumar="' + x.id + '" type="button">Se hizo algo más</button>' +
      '</div></div>'
    ).join('');
  }

  /* ---------- Sumar un servicio: la clienta aceptó algo más, en el momento o al cobrar ---------- */
  const dsu = $('#d-sumar');
  let sumarId = null;
  document.addEventListener('click', (e) => {
    const canc = e.target.closest('[data-cancelar]');
    if (canc) {
      const id = canc.dataset.cancelar;
      const t = Store.todos().find((x) => x.id === id);
      if (!t) return;
      Store.cancelar(id);
      const detDlg = $('#d-turno-det');
      if (detDlg && detDlg.open) detDlg.close();
      refrescarHoy();
      aviso('Turno de ' + t.nom.split(' ')[0] + ' (' + hhmm(t.ini) + ') cancelado y horario liberado.');
      return;
    }
    const ya = e.target.closest('[data-cobrar-ya]');
    if (ya) { window.abrirCobro && window.abrirCobro(ya.dataset.cobrarYa, hoyK); return; }
    const cob = e.target.closest('[data-cobrado]');
    if (cob) {
      const id = cob.dataset.cobrado;
      const x = Store.caja(hoyK).find((y) => y.id === id);
      Store.ajustarCobro(id, { pagado: true, monto: x ? x.monto : undefined, lin: x ? x.lineas : undefined, desc: x ? x.descuento : undefined });
      refrescarHoy();
      aviso('Cobro de ' + (x ? x.nom.split(' ')[0] : 'la clienta') + ' registrado.');
      return;
    }
    const b = e.target.closest('[data-sumar]');
    if (!b) return;
    sumarId = b.dataset.sumar;
    const t = Store.todos().find((x) => x.id === sumarId);
    $('#su-form').hidden = false;
    $('#su-res').hidden = true;
    $('#su-quien').textContent = 'Para ' + t.nom + '. Tocá lo que se hizo de más.';
    $('#su-lista').innerHTML = Store.catalogo().map((g) => '<h3>' + g.nombre + '</h3>' +
      g.items.map((it) => '<button class="opcion" type="button" data-item="' + it.id + '"><span><b>' + it.nombre + '</b></span></button>').join('')).join('');
    dsu.showModal();
  });
  $('#su-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-item]');
    if (!b) return;
    const item = Store.itemsTodos().find((x) => x.id === b.dataset.item);
    const r = Store.agregarServicio(sumarId, item);
    if (!r) return;
    const c = Store.caja(hoyK).find((x) => x.id === sumarId);
    $('#su-form').hidden = true;
    const res = $('#su-res');
    res.hidden = false;
    res.innerHTML = '<h2>Listo, sumado</h2><p class="ayuda" style="color:var(--tinta-2);font-size:1.1rem">' + esc(item.nombre) + ' se sumó a ' + esc(r.turno.nom) +
      '. Total ahora: <b>' + (c ? pesos(c.monto) + (c.faltaPrecio ? ' (falta algún precio)' : '') : 'sin precio cargado') + '</b>.</p>' +
      (r.afectados.length ? '<p style="margin-top:12px"><b>Se corrieron estos turnos.</b> Les avisás con un toque:</p><ul>' + r.afectados.map((t) =>
        '<li><div><b>' + esc(t.nom) + '</b><span>Ahora a las ' + hhmm(t.ini) + '</span></div><a class="btn chico" target="_blank" rel="noopener" href="' +
        wa(t.tel, 'Hola ' + t.nom.split(' ')[0] + ', tu turno pasó a las ' + hhmm(t.ini) + ' porque estoy con otro servicio. Perdón y gracias.') + '">Avisar</a></li>').join('') + '</ul>' : '') +
      '<div class="botones"><button class="btn" type="button" data-cerrar>Listo</button></div>';
    res.querySelector('[data-cerrar]').addEventListener('click', () => dsu.close());
    refrescarHoy();
  });
  function refrescarHoy() {
    pintarAhora();
    pintarCobrar();
    pintarSiguiente();
    pintarFila();
    pintarManana();
    pintarCerrar();
    window.refrescarVistas && window.refrescarVistas();
  }

  /* ---------- Se actualiza solo cuando algo cambia en otra pestaña (por ejemplo, una reserva) ---------- */
  window.addEventListener('storage', (e) => {
    if (!Store.CLAVES.includes(e.key)) return;
    const nuevos = Store.todos().filter((t) => t.origen === 'web' && Store.esNuevo(t) && !conocidos.has(t.id));
    refrescarHoy();
    if (nuevos.length) aviso('Entró una reserva nueva: ' + nuevos[0].nom + ', ' + nuevos[0].serv + '.');
    conocidos = new Set(Store.todos().map((t) => t.id));
  });

  window.refrescarHoy = refrescarHoy;
  refrescarHoy();
})();
