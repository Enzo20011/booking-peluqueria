// Almacén compartido del boceto: la página y el panel leen y escriben acá, así se hablan solos.
// En la versión real esto es la base de datos (Supabase); acá vive en el navegador.
(function () {
  const K_T = 'ec_turnos_v1';
  const K_C = 'ec_cobros_v2';
  const K_S = 'ec_servicios_v1';
  const K_F = 'ec_galeria_v1';
  const K_M = 'ec_marca_v1';
  const K_H = 'ec_ocultas_v1';
  const K_V = 'ec_servicios_extra_v1';
  const K_O = 'ec_servicios_ocultos_v1';
  const K_N = 'ec_fichas_v1';
  const K_Q = 'ec_fila_v1';
  const K_X = 'ec_extras_v1';
  const K_A = 'ec_atrasos_v1';
  const K_L = 'ec_latido_v1';
  const K_E = 'ec_estado_v1';
  const K_P = 'ec_privado_v1';   // datos que NO se ven en la página (por ejemplo, el WhatsApp para recibir el resumen)
  const pad = (n) => String(n).padStart(2, '0');
  const clave = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const sumar = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  const guardar = (k, v) => {
    // Las clientas (sin sesión) no guardan la agenda en su aparato: la agenda real vive en la nube
    if (window.NUBE && window.NUBE.modo === 'anon' && k === 'ec_turnos_v1') return true;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return false; }
    if (window.NUBE && window.NUBE.subir) window.NUBE.subir(k, v);
    return true;
  };
  let seq = 0;
  const nuevoId = () => 't' + Date.now().toString(36) + (seq++);

  // Turnos de ejemplo para el día de hoy y los próximos
  function semilla() {
    return [];   // sin turnos de ejemplo: la agenda arranca vacía
    const hoy = new Date();
    const f = (n) => clave(sumar(hoy, n));
    const s = (id, fecha, ini, nom, serv, seg, extra) =>
      Object.assign({ id, fecha, ini, nom, serv, seg, origen: 'panel', estado: 'confirmado', seed: true }, extra || {});
    return [
      s('seed-marcela', f(0), 600, 'Marcela R.', 'Balayage', [['activo', 60], ['espera', 50], ['activo2', 130]], { largo: 'largo', servId: 'balayage' }),
      s('seed-lucia', f(0), 870, 'Lucía P.', 'Tratamiento nutritivo', [['activo2', 60]], { largo: 'largo', servId: 'nutritivo', origen: 'web', nuevo: true, creado: Date.now() }),
      s('seed-camila', f(0), 930, 'Camila F.', 'Retoque de mechas', [['activo', 45], ['espera', 30], ['activo2', 25]], { largo: 'medio', servId: 'retoque' }),
      s('seed-julieta', f(0), 1020, 'Julieta A.', 'Tratamiento nutritivo', [['activo2', 60]], { largo: 'largo', servId: 'nutritivo' }),
      s('seed-paula', f(1), 600, 'Paula G.', 'Micro mechas', [['activo', 70], ['espera', 60], ['activo2', 110]], { largo: 'medio', servId: 'micromechas' }),
      s('seed-romina', f(1), 840, 'Romina S.', 'Alisado', [['activo2', 75]], { largo: 'medio', servId: 'alisado' }),
      s('seed-aldana', f(2), 990, 'Aldana T.', 'Tratamiento nutritivo', [['activo', 30], ['espera', 15], ['activo2', 15]], { largo: 'medio', servId: 'nutritivo' }),
    ];
  }

  function cargar() {
    // Clientas: solo ven lo ocupado (sin nombres), no los turnos de ejemplo
    if (window.NUBE && window.NUBE.modo === 'anon') return { base: '', turnos: window.NUBE.anon };
    const hoyK = clave(new Date());
    let est = leer(K_T, null);
    if (est && est.turnos && est.turnos.some((t) => t.seed)) { est.turnos = est.turnos.filter((t) => !t.seed); guardar(K_T, est); }
    if (!est || est.base !== hoyK) {
      const propios = est ? est.turnos.filter((t) => !t.seed) : [];
      est = { base: hoyK, turnos: propios.concat(semilla()) };
      guardar(K_T, est);
    }
    return est;
  }

  const Store = {
    CLAVES: [K_T, K_C, K_S, K_F, K_N, K_Q, K_E, K_X, K_A, K_L, K_M, K_H, K_V, K_O, K_P],
    clave,
    sumar,

    /* ---- turnos ---- */
    todos() { return cargar().turnos; },
    dia(f) { return cargar().turnos.filter((t) => t.fecha === f && t.estado !== 'cancelado').sort((a, b) => a.ini - b.ini); },
    add(t) {
      const est = cargar();
      t.id = nuevoId();
      t.estado = t.estado || 'confirmado';
      t.creado = Date.now();
      est.turnos.push(t);
      guardar(K_T, est);
      if (window.NUBE && window.NUBE.modo === 'anon') {
        window.NUBE.mios.push(t);
        // Si no se reservó antes por la página, se manda a la nube sin esperar (por ejemplo, quien llega sin turno)
        if (!t._yaEnNube) window.NUBE.reservar(Object.assign({}, t));
      }
      return t;
    },
    update(id, patch) {
      const est = cargar();
      const t = est.turnos.find((x) => x.id === id);
      if (t) { Object.assign(t, patch); guardar(K_T, est); }
      return t;
    },
    cancelar(id) {
      return Store.update(id, { estado: 'cancelado' });
    },
    total(seg) { return seg.reduce((a, s) => a + s[1], 0); },
    tramos(seg, ini) {
      let c = ini;
      return seg.map((s) => { const x = { tipo: s[0], a: c, b: c + s[1] }; c += s[1]; return x; });
    },
    // Solo las etapas "activas" ocupan a la profesional; durante la espera queda libre para algo corto.
    libre(f, ini, seg, ignorar, extras) {
      const mios = Store.tramos(seg, ini);
      const ocupados = [];
      const esperas = [];
      Store.dia(f).concat(extras || []).forEach((t) => {
        if (t.id === ignorar) return;
        Store.tramos(t.seg, t.ini).forEach((x) => (x.tipo === 'espera' ? esperas : ocupados).push(x));
      });
      const choca = mios.some((m) => m.tipo !== 'espera' && ocupados.some((o) => m.a < o.b && o.a < m.b));
      if (choca) return { libre: false, hueco: false };
      const hueco = mios.some((m) => m.tipo !== 'espera' && esperas.some((e) => m.a >= e.a && m.b <= e.b));
      return { libre: true, hueco };
    },

    // En el boceto "ahora" es la mañana si se prueba de noche; en la versión real es la hora de verdad.
    ahora() {
      const d = new Date();
      const m = d.getHours() * 60 + d.getMinutes();
      const N = window.NEGOCIO || {};
      return m >= (N.abre || 540) && m <= (N.cierra || 1140) ? m : 600;
    },
    primerLibre(f, desde, seg, extras) {
      const total = Store.total(seg);
      for (let m = Math.ceil(desde / 5) * 5; m + total <= ((window.NEGOCIO && window.NEGOCIO.cierra) || 1200); m += 5) {
        if (Store.dentroHorario(f, m, total) && Store.libre(f, m, seg, null, extras).libre) return m;
      }
      return null;
    },

    /* ---- fila de las que llegan sin turno: se anotan solas escaneando el QR del local ---- */
    filaCruda() { return leer(K_Q, []).filter((e) => e.fecha === clave(new Date()) && e.estado === 'esperando'); },
    // Cada una tiene su hora estimada, contando a las que están antes en la fila
    fila() {
      const f = clave(new Date());
      const tent = [];
      return Store.filaCruda().map((e) => {
        const est = Store.primerLibre(f, Store.ahora(), e.seg, tent);
        if (est !== null) tent.push({ id: 'tent-' + e.id, ini: est, seg: e.seg });
        return Object.assign({}, e, { est });
      });
    },
    filaAdd(e) {
      const l = leer(K_Q, []);
      e.id = nuevoId();
      e.fecha = clave(new Date());
      e.estado = 'esperando';
      e.llego = Store.ahora();
      l.push(e);
      guardar(K_Q, l);
      if (window.NUBE && window.NUBE.modo === 'anon' && window.NUBE.anotarFila) window.NUBE.anotarFila(e);
      return Store.fila().find((x) => x.id === e.id);
    },
    filaEstado(id, estado) {
      const l = leer(K_Q, []);
      const e = l.find((x) => x.id === id);
      if (e) { e.estado = estado; guardar(K_Q, l); }
    },
    // "Nuevo" dura 12 horas desde que entró la reserva; no hace falta tocar nada para que se vaya
    esNuevo(t) { return !!t.nuevo && Date.now() - (t.creado || 0) < 12 * 3600 * 1000; },
    // La pasa a la agenda en el lugar que le tocaba
    pasar(id) {
      const e = Store.fila().find((x) => x.id === id);
      if (!e) return null;
      const ini = e.est !== null ? e.est : Store.ahora();
      Store.filaEstado(id, 'atendida');
      return Store.add({ fecha: clave(new Date()), ini, nom: e.nom, tel: e.tel, serv: e.serv, servId: e.servId, largo: e.largo, seg: e.seg, origen: 'sin_turno' });
    },

    /* ---- sumar un servicio a un turno (la clienta aceptó algo más): suma el tiempo, corre a quien viene y suma al total ---- */
    agregarServicio(turnoId, item, largo) {
      const est = cargar();
      const t = est.turnos.find((x) => x.id === turnoId);
      if (!t) return null;
      const terminado = t.ini + Store.total(t.seg) <= Store.ahora() && t.fecha === clave(new Date());
      const extra = Store.segmentos(item, largo || t.largo || 'medio');
      t.adicionales = (t.adicionales || []).concat([{ servId: item.id, serv: item.nombre, precio: Store.precio(item.id) || 0, min: terminado ? 0 : Store.total(extra) }]);
      // Si el turno ya terminó (se suma al cobrar), solo cambia el total: no se toca la agenda
      if (!terminado) t.seg = t.seg.concat(extra.map((s) => [s[0], s[1], item.nombre]));
      guardar(K_T, est);
      const afectados = [];
      if (!terminado) {
        Store.dia(t.fecha).filter((x) => x.id !== t.id && x.ini >= t.ini).sort((a, b) => a.ini - b.ini).forEach((n) => {
          let ini = n.ini;
          let guarda = 0;
          while (!Store.libre(t.fecha, ini, n.seg, n.id).libre && guarda++ < 300) ini += 5;
          if (ini !== n.ini) afectados.push(Store.update(n.id, { ini }));
        });
      }
      return { turno: Store.todos().find((x) => x.id === turnoId), afectados };
    },
    // Lo que hay para cobrar ahora: turnos que terminaron hace poco, con todo lo que se hizo y el total
    porCobrar() {
      const ahora = Store.ahora();
      return Store.caja(clave(new Date())).filter((x) => x.terminado && !x.anulado && !x.pagado && x.fin >= ahora - 180);
    },

    /* ---- "Voy atrasada": corre lo que viene y devuelve a quiénes avisar ---- */
    atrasar(min) {
      const f = clave(new Date());
      const ahora = Store.ahora();
      const afectados = [];
      Store.dia(f).forEach((t) => {
        if (t.ini < ahora) return;
        const nuevo = Store.update(t.id, { ini: t.ini + min });
        afectados.push(nuevo);
      });
      return afectados;
    },

    /* ---- latido: la pantalla del mostrador avisa que está encendida, para que quien ayuda a distancia lo vea ---- */
    latido() { guardar(K_L, Date.now()); },
    ultimoLatido() { return leer(K_L, null); },

    /* ---- cerrar las reservas de hoy cuando ya no da más, y días de atención ---- */
    cerradoHoy() { return leer(K_E, {}).cerrado === clave(new Date()) || !!Store.bloqueoDe(clave(new Date())); },
    cerrarHoy(si) { const e = leer(K_E, {}); e.cerrado = si ? clave(new Date()) : null; guardar(K_E, e); },
    // Tramos de atención de un día de la semana (1 = lunes ... 7 = domingo). Sin horarios cargados: corrido de abre a cierra.
    tramosDia(dow) {
      const N = window.NEGOCIO || {};
      if (N.horarios) return N.horarios[dow] || [];
      return [[N.abre || 540, N.cierra || 1200]];
    },
    // ¿El servicio entra entero dentro de un tramo de atención de ese día?
    dentroHorario(fechaK, ini, total) {
      return Store.tramosFecha(fechaK).some((t) => ini >= t[0] && ini + total <= t[1]);
    },
    /* ---- días cerrados (vacaciones, enfermedad, feriados) y horarios especiales de un día ---- */
    bloqueos() { return leer(K_E, {}).bloqueos || []; },
    bloquear(desde, hasta, motivo) {
      const e = leer(K_E, {});
      e.bloqueos = (e.bloqueos || []).concat([{ id: nuevoId(), desde, hasta: hasta && hasta >= desde ? hasta : desde, motivo: motivo || '' }]);
      guardar(K_E, e);
    },
    desbloquear(id) { const e = leer(K_E, {}); e.bloqueos = (e.bloqueos || []).filter((b) => b.id !== id); guardar(K_E, e); },
    especiales() { return leer(K_E, {}).especiales || {}; },
    setEspecial(f, tramos) {
      const e = leer(K_E, {});
      e.especiales = e.especiales || {};
      if (tramos) e.especiales[f] = tramos; else delete e.especiales[f];
      guardar(K_E, e);
    },
    bloqueoDe(f) { return Store.bloqueos().find((b) => f >= b.desde && f <= b.hasta) || null; },
    // Tramos de atención de una fecha concreta, ya con días cerrados y horarios especiales
    tramosFecha(f) {
      if (Store.bloqueoDe(f)) return [];
      const esp = Store.especiales()[f];
      if (esp) return esp;
      const p = String(f).split('-');
      const dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      const dow = dt.getDay() === 0 ? 7 : dt.getDay();
      if (!Store.diasAtencion().includes(dow)) return [];
      return Store.tramosDia(dow);
    },
    diaAbierto(f) { return Store.tramosFecha(f).length > 0; },
    turnosEnRango(desde, hasta) { return cargar().turnos.filter((t) => t.estado !== 'cancelado' && t.fecha >= desde && t.fecha <= hasta).sort((x, y) => (x.fecha + x.ini).localeCompare(y.fecha + y.ini)); },
    diasAtencion() {
      const e = leer(K_E, {});
      return Array.isArray(e.dias) && e.dias.length ? e.dias : (window.NEGOCIO && window.NEGOCIO.dias) || [1, 2, 3, 4, 5, 6];
    },
    setDiasAtencion(dias) {
      const e = leer(K_E, {});
      e.dias = dias;
      guardar(K_E, e);
    },
    margenSinTurno() { return leer(K_E, {}).margen || 'ninguno'; },
    setMargenSinTurno(m) { const e = leer(K_E, {}); e.margen = m; guardar(K_E, e); },

    /* ---- catálogo: los servicios de base más los que se agregan desde el panel; se puede ocultar cualquiera ---- */
    ocultos() { return leer(K_O, []); },
    // Convierte un servicio cargado en el panel (duración para pelo medio) en un servicio como los demás
    armarItem(x) {
      const it = { id: x.id, nombre: x.nombre, detalle: x.detalle || '', largo: !!x.largo, pelo: !!x.pelo, color: !!x.color, propio: true };
      if (x.largo) {
        it.v = {
          corto: { min: Math.max(15, x.min - 30), esp: x.esp },
          medio: { min: x.min, esp: x.esp },
          largo: { min: x.min + 30, esp: x.esp },
        };
      } else {
        it.fijo = { min: x.min, esp: x.esp };
      }
      return it;
    },
    // Todo, incluso lo oculto (para el panel y para ubicar fotos y turnos viejos)
    catalogoTodo() {
      const grupos = (window.CATALOGO || []).map((g) => ({ id: g.id, nombre: g.nombre, items: g.items.slice() }));
      leer(K_V, []).forEach((x) => {
        const nombre = (x.grupo || 'Otros').trim() || 'Otros';
        let g = grupos.find((b) => b.id === nombre || b.nombre.toLowerCase() === nombre.toLowerCase());
        if (!g) { g = { id: 'g-' + nombre.toLowerCase(), nombre, items: [] }; grupos.push(g); }
        g.items.push(Store.armarItem(x));
      });
      return grupos;
    },
    itemsTodos() { return Store.catalogoTodo().flatMap((g) => g.items); },
    // Lo que se ve en la página y en el turnero: sin lo oculto
    catalogo() {
      const o = leer(K_O, []);
      return Store.catalogoTodo().map((g) => ({ id: g.id, nombre: g.nombre, items: g.items.filter((x) => !o.includes(x.id)) })).filter((g) => g.items.length);
    },
    items() { return Store.catalogo().flatMap((g) => g.items); },
    servicioNuevo(d) {
      const l = leer(K_V, []);
      const x = { id: 'x' + Date.now().toString(36) + (seq++), nombre: d.nombre, detalle: d.detalle || '', grupo: d.grupo || 'Otros', largo: !!d.largo, pelo: !!d.pelo, color: !!d.color, min: d.min, esp: d.esp || 0 };
      l.push(x);
      guardar(K_V, l);
      if (d.precio) Store.guardarServicio(x.id, { precio: d.precio });
      return x;
    },
    servicioOcultar(id) { const o = leer(K_O, []); if (!o.includes(id)) guardar(K_O, o.concat([id])); },
    servicioMostrar(id) { guardar(K_O, leer(K_O, []).filter((x) => x !== id)); },
    // Un servicio agregado se puede borrar del todo; uno de base solo se oculta
    servicioBorrar(id) {
      guardar(K_V, leer(K_V, []).filter((x) => x.id !== id));
      guardar(K_O, leer(K_O, []).filter((x) => x !== id));
    },
    /* ---- servicios: lo que se cambia en Ajustes se aplica solo en la página ---- */
    ajustes() { return leer(K_S, {}); },
    guardarServicio(id, patch) {
      const s = leer(K_S, {});
      s[id] = Object.assign(s[id] || {}, patch);
      guardar(K_S, s);
    },
    // Minutos que suma el pelo (los define la profesional en Ajustes; estos son valores de ejemplo)
    extrasMin() { return Object.assign({ enrulado: 10, previo: 30, mucho: 20 }, leer(K_X, {})); },
    guardarExtras(patch) { guardar(K_X, Object.assign(leer(K_X, {}), patch)); },
    // pelo = { tipo: 'enrulado', extras: ['previo', 'mucho'] }: opcional; si no viene, no suma nada
    sumaPelo(item, pelo) {
      if (!pelo || item.fijo) return 0;
      const e = Store.extrasMin();
      let s = 0;
      if (pelo.tipo === 'enrulado') s += e.enrulado;
      if ((pelo.extras || []).includes('previo') && item.color) s += e.previo;
      if ((pelo.extras || []).includes('mucho')) s += e.mucho;
      return s;
    },
    tiempos(item, largo, pelo) {
      const base = item.fijo || item.v[largo];
      const ov = leer(K_S, {})[item.id];
      const ref = item.fijo || item.v.medio;
      let min = ov && ov.min != null ? base.min + (ov.min - ref.min) : base.min;
      let esp = ov && ov.esp != null ? base.esp + (ov.esp - ref.esp) : base.esp;
      min = Math.max(10, min) + Store.sumaPelo(item, pelo);
      esp = Math.max(0, Math.min(esp, min - 10));
      return { min, esp };
    },

    /* ---- aprender cuándo un servicio tarda más: cada "Voy atrasada" es una señal, sin que la profesional anote nada ---- */
    registrarAtraso(servId, min) {
      if (!servId) return;
      const l = leer(K_A, []);
      l.push({ servId, min, fecha: clave(new Date()) });
      guardar(K_A, l);
    },
    // Cuando hay varias señales del mismo servicio, se sugiere subir su duración
    sugerencias(minimo) {
      const l = leer(K_A, []);
      const por = {};
      l.forEach((x) => { (por[x.servId] = por[x.servId] || []).push(x.min); });
      return Object.keys(por).filter((id) => por[id].length >= (minimo || 3)).map((id) => {
        const prom = Math.round(por[id].reduce((a, b) => a + b, 0) / por[id].length / 5) * 5;
        return { servId: id, n: por[id].length, prom: Math.max(5, prom) };
      });
    },
    aplicarSugerencia(servId, item) {
      const s = Store.sugerencias().find((x) => x.servId === servId);
      if (!s) return;
      const actual = Store.tiempos(item, 'medio').min;
      Store.guardarServicio(servId, { min: actual + s.prom });
      guardar(K_A, leer(K_A, []).filter((x) => x.servId !== servId));
    },
    descartarSugerencia(servId) { guardar(K_A, leer(K_A, []).filter((x) => x.servId !== servId)); },
    precio(id) {
      const o = leer(K_S, {})[id];
      return o && Number(o.precio) > 0 ? Number(o.precio) : null;
    },
    segmentos(item, largo, pelo) {
      const t = Store.tiempos(item, largo, pelo);
      if (t.esp > 0) {
        const act = t.min - t.esp;
        const a = Math.max(5, Math.round((act * 0.3) / 5) * 5);
        return [['activo', a], ['espera', t.esp], ['activo2', act - a]];
      }
      return [['activo2', t.min]];
    },

    /* ---- galería de trabajos: varias fotos por servicio, cada una lleva a reservar ese servicio ---- */
    // Trabajos reales de Instagram (trabajos.js) + fotos que se suban desde el panel; las de Instagram se pueden ocultar
    galeria() {
      const ocultas = leer(K_H, []);
      return leer(K_F, []).concat((window.TRABAJOS_BASE || []).filter((x) => !ocultas.includes(x.id)));
    },
    fotosSubidas() {
      return leer(K_F, []);
    },
    ocultasIds() {
      return leer(K_H, []);
    },
    agregarFoto(servId, url, extra) {
      const g = leer(K_F, []);
      g.unshift(Object.assign({ id: nuevoId(), servId, servIds: [servId], url }, extra || {}));
      return guardar(K_F, g);
    },
    quitarFoto(id) {
      if (String(id).startsWith('ig-')) {
        const oc = leer(K_H, []);
        if (!oc.includes(id)) guardar(K_H, oc.concat([id]));
        return;
      }
      guardar(K_F, leer(K_F, []).filter((x) => x.id !== id));
    },
    restaurarFoto(id) {
      guardar(K_H, leer(K_H, []).filter((x) => x !== id));
    },
    restaurarTodasFotos() {
      guardar(K_H, []);
    },
    // La primera foto nítida (no captura de video) de cada servicio es la que se ve en su fila de la carta
    fotos() {
      const m = {};
      const gal = Store.galeria();
      gal.filter((x) => !x.video).forEach((x) => { if (!m[x.servId]) m[x.servId] = x.url; });
      gal.forEach((x) => { if (!m[x.servId]) m[x.servId] = x.url; });
      gal.forEach((x) => {
        (x.servIds || [x.servId]).forEach((s) => { if (!m[s]) m[s] = x.url; });
      });
      return m;
    },

    /* ---- datos de la marca que se ven en la página ---- */
    marca() {
      return Object.assign({ instagram: '', whatsapp: (window.NEGOCIO && window.NEGOCIO.whatsapp) || '', coordenadas: '', direccion: '', horario: '' }, leer(K_M, {}));
    },
    guardarMarca(patch) { guardar(K_M, Object.assign(leer(K_M, {}), patch)); },

    /* ---- caja: se arma sola con la agenda; solo se tocan las excepciones ---- */
    // Nunca se sabe cómo va a pagar cada clienta: por defecto queda sin especificar y no hay nada que configurar
    medioHabitual() { return 'Sin especificar'; },
    setMedioHabitual(m) { const e = leer(K_E, {}); e.medio = m; guardar(K_E, e); },
    // Cambios puntuales: otro monto, otra forma de pago, o que no se cobró
    ajustarCobro(turnoId, patch) {
      const c = leer(K_C, {});
      c[turnoId] = Object.assign(c[turnoId] || {}, patch);
      guardar(K_C, c);
    },
    // Todo turno terminado se da por cobrado al precio de la lista y con la forma de pago habitual
    caja(f) {
      const hoyK = clave(new Date());
      const ahora = Store.ahora();
      const cobros = leer(K_C, {});
      return Store.dia(f).map((t) => {
        const fin = t.ini + Store.total(t.seg);
        const terminado = f < hoyK || (f === hoyK && fin <= ahora);
        // Cada servicio con su precio: el principal y todo lo que se fue sumando
        const base = [{ n: t.serv, p: Store.precio(t.servId) }].concat((t.adicionales || []).map((a) => ({ n: a.serv, p: a.precio > 0 ? Number(a.precio) : Store.precio(a.servId) })));
        const o = cobros[t.id];
        const lin = o && Array.isArray(o.lin) ? o.lin : base;
        const desc = o && o.desc ? Number(o.desc) : 0;
        const falta = lin.some((l) => l.p === null || l.p === undefined || l.p === '');
        const suma = lin.reduce((a, l) => a + (Number(l.p) || 0), 0);
        const calculado = Math.max(0, suma - desc);
        const conLineas = !!(o && Array.isArray(o.lin));
        const monto = o && o.anulado ? 0 : conLineas ? calculado : o && o.monto != null ? o.monto : calculado;
        return {
          id: t.id, nom: t.nom, serv: t.serv, servicios: lin.map((l) => l.n), lineas: lin, descuento: desc, fin, terminado,
          monto, medio: (o && o.medio) || Store.medioHabitual(),
          anulado: !!(o && o.anulado), cambiado: !!o, pagado: !!(o && o.pagado),
          faltaPrecio: falta, sinPrecio: falta && !(o && (o.monto != null || conLineas)),
        };
      });
    },

    /* ---- editar o borrar una clienta (las clientas salen de los turnos, así que se actúa sobre sus turnos) ---- */
    // Cambia el nombre y/o el teléfono en todos sus turnos y pasa su ficha al nombre nuevo
    editarClienta(nombre, nuevoNombre, tel) {
      const est = cargar();
      const n2 = String(nuevoNombre || nombre).trim() || nombre;
      est.turnos.forEach((t) => {
        if (t.nom !== nombre) return;
        t.nom = n2;
        if (tel !== undefined) t.tel = String(tel).trim() || undefined;
      });
      guardar(K_T, est);
      if (n2 !== nombre) {
        const f = leer(K_N, {});
        if (f[nombre]) { f[n2] = Object.assign({ formulas: [], notas: '' }, f[n2] || {}, f[nombre]); delete f[nombre]; guardar(K_N, f); }
      }
      return n2;
    },
    // Borrar una clienta: sus turnos que vienen se cancelan, ya no aparece en la lista y se borra su ficha.
    // Los turnos ya hechos se conservan (sin su nombre en la lista) para que no cambie lo que se cobró.
    borrarClienta(nombre) {
      const est = cargar();
      const hoy = clave(new Date());
      let futuros = 0;
      est.turnos.forEach((t) => {
        if (t.nom !== nombre) return;
        t.oculta = true;
        if (t.fecha >= hoy && t.estado !== 'cancelado') { t.estado = 'cancelado'; futuros++; }
      });
      guardar(K_T, est);
      const f = leer(K_N, {});
      if (f[nombre]) { delete f[nombre]; guardar(K_N, f); }
      return futuros;
    },
    proximosDe(nombre) { return cargar().turnos.filter((t) => t.nom === nombre && t.estado !== 'cancelado' && t.fecha >= clave(new Date())).length; },

    privado() { return leer(K_P, {}); },
    setPrivado(patch) { guardar(K_P, Object.assign(leer(K_P, {}), patch)); },

    /* ---- fichas de clientas ---- */
    fichas() { return leer(K_N, {}); },
    guardarFicha(nombre, patch) {
      const f = leer(K_N, {});
      f[nombre] = Object.assign({ formulas: [], notas: '' }, f[nombre] || {}, patch);
      guardar(K_N, f);
    },
  };

  window.Store = Store;
})();
