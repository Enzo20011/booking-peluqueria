(function () {
  const N = window.NEGOCIO;
  const I = window.ICONO;
  const $ = (s, r = document) => r.querySelector(s);
  const dlg = $('#reserva');
  const caja = $('#turnero-cuerpo');
  const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const thumbUrl = (u) => String(u || '').startsWith('img/trabajos/') ? u.replace('img/trabajos/', 'img/thumbs/') + '?v=14' : u;
  const thumbSmUrl = (u) => String(u || '').startsWith('img/trabajos/') ? u.replace('img/trabajos/', 'img/thumbs-sm/') + '?v=14' : u;

  // Respaldo automático: si por caché previa o subida nueva una miniatura falla, carga la foto original sin mostrar ícono roto
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    const src = img.getAttribute('src') || '';
    if (src.includes('img/thumbs-sm/') || src.includes('img/thumbs/')) {
      img.removeAttribute('srcset');
      img.src = src.split('?')[0].replace(/img\/thumbs(-sm)?\//, 'img/trabajos/') + '?v=14';
    }
  }, true);
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dur = (m) => {
    const h = Math.floor(m / 60), r = m % 60;
    return h ? (r ? h + ' h ' + r + ' min' : h + ' h') : r + ' min';
  };
  const fechaLarga = (d) => DIAS_L[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];

  let st = nuevoTurno();
  let filtroGal = 'todos';
  let busqGal = '';
  const PASO_GAL = 12;
  let limiteGal = PASO_GAL;

  function nuevoTurno() {
    return { item: null, largo: null, pelo: null, extras: [], nota: '', dia: null, hora: null, nombre: '', tel: '', i: 0, errores: {} };
  }

  function todos() {
    return Store.itemsTodos().concat([window.CONSULTA]);
  }

  function peloInfo() {
    return { tipo: st.pelo && st.pelo !== 'sin dato' ? st.pelo : null, extras: st.extras || [] };
  }

  function tiempos() {
    return Store.tiempos(st.item, st.largo, peloInfo());
  }

  function pasos() {
    const p = ['servicio'];
    // Todo lo del pelo va junto en una sola pantalla, y solo aparece lo que corresponde al servicio
    if (!st.item || st.item.largo || st.item.pelo) p.push('pelo');
    p.push('dia', 'datos', 'listo');
    return p;
  }

  function numWa() {
    const m = Store.marca();
    return String((m && m.whatsapp) || N.whatsapp || '').replace(/[^\d]/g, '');
  }

  function actualizarLinksWa() {
    const w = numWa();
    const waUrl = 'https://wa.me/' + w + '?text=' + encodeURIComponent('Hola la profesional, quería consultarte por un turno.');
    document.querySelectorAll('[data-wa]').forEach((a) => (a.href = waUrl));
  }

  function contarPorServicio() {
    const porServ = {};
    Store.galeria().forEach((x) => {
      porServ[x.servId] = (porServ[x.servId] || 0) + 1;
    });
    return porServ;
  }

  function poolsPorServicio() {
    const fijos = {};
    const todosServ = {};
    Store.galeria().forEach((x) => {
      if (!x.url) return;
      if (!todosServ[x.servId]) todosServ[x.servId] = [];
      todosServ[x.servId].push(x.url);
      if (!x.video) {
        if (!fijos[x.servId]) fijos[x.servId] = [];
        fijos[x.servId].push(x.url);
      }
    });
    const res = {};
    Object.keys(todosServ).forEach((k) => {
      res[k] = (fijos[k] && fijos[k].length ? fijos[k] : todosServ[k]);
    });
    return res;
  }

  function crossfadeImagen(contenedor, imgBase, nuevaSrc, nuevaSrcset, nuevoAlt, alCambiarMitad) {
    if (!contenedor || !imgBase) return;
    const pre = new Image();
    if (nuevaSrcset) pre.srcset = nuevaSrcset;
    pre.src = nuevaSrc;
    const aplicar = () => {
      const viejas = contenedor.querySelectorAll('.img-crossfade');
      viejas.forEach((v) => v.remove());
      const clon = document.createElement('img');
      clon.className = 'img-crossfade';
      if (nuevaSrcset) clon.srcset = nuevaSrcset;
      clon.src = nuevaSrc;
      clon.alt = nuevoAlt || imgBase.alt || '';
      contenedor.appendChild(clon);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clon.classList.add('visible');
          if (alCambiarMitad) alCambiarMitad();
        });
      });
      setTimeout(() => {
        if (nuevaSrcset) imgBase.srcset = nuevaSrcset;
        imgBase.src = nuevaSrc;
        if (nuevoAlt != null) imgBase.alt = nuevoAlt;
        clon.remove();
      }, 640);
    };
    if (pre.decode) {
      pre.decode().then(aplicar).catch(aplicar);
    } else {
      pre.onload = aplicar;
    }
  }

  let timerCarta = null;
  const idxCartaPorServ = {};

  function iniciarRotacionCarta() {
    if (timerCarta) {
      clearInterval(timerCarta);
      timerCarta = null;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pools = poolsPorServicio();
    const rotables = Object.keys(pools).filter((id) => pools[id] && pools[id].length > 1);
    if (!rotables.length) return;
    rotables.forEach((id) => {
      if (typeof idxCartaPorServ[id] !== 'number') idxCartaPorServ[id] = 1;
    });
    let cursor = 0;
    timerCarta = setInterval(() => {
      if (document.hidden || dlg.open || visor.open) return;
      for (let paso = 0; paso < 2; paso++) {
        const servId = rotables[cursor % rotables.length];
        cursor++;
        const btn = $('#carta .servicio[data-id="' + servId + '"]');
        if (!btn || btn.matches(':hover')) continue;
        const cajaFoto = btn.querySelector('.foto');
        const img = btn.querySelector('.foto img:not(.img-crossfade)');
        const lista = pools[servId];
        if (!cajaFoto || !img || !lista || lista.length <= 1) continue;
        const sigUrl = lista[idxCartaPorServ[servId] % lista.length];
        idxCartaPorServ[servId] = (idxCartaPorServ[servId] + 1) % lista.length;
        const sm = thumbSmUrl(sigUrl);
        const md = thumbUrl(sigUrl);
        crossfadeImagen(cajaFoto, img, sm, sm + ' 1x, ' + md + ' 2x', img.alt);
      }
    }, 3600);
  }

  /* ---------- Lista de servicios (la carta) ---------- */
  function pintarCarta() {
    const cont = $('#carta');
    const fotos = Store.fotos();
    const pools = poolsPorServicio();
    const conteo = contarPorServicio();
    // Cada grupo se abre y se cierra con un toque; el primero arranca abierto y se recuerda lo que la clienta abrió
    const primeraVez = !cont.querySelector('details.grupo');
    const abiertos = new Set(Array.from(cont.querySelectorAll('details.grupo[open]')).map((d) => d.dataset.g));
    cont.innerHTML = Store.catalogo().map((g, gi) =>
      '<details class="grupo grupo-acordeon" data-g="' + esc(g.nombre) + '"' + ((primeraVez ? gi === 0 : abiertos.has(g.nombre)) ? ' open' : '') + '>' +
      '<summary><span class="g-nombre">' + esc(g.nombre) + '</span><small>' + g.items.length + (g.items.length === 1 ? ' servicio' : ' servicios') + '</small></summary><div class="servicios">' +
      g.items.map((it) => {
        const tMed = Store.tiempos(it, 'medio');
        const pr = Store.precio(it.id);
        const nTrab = conteo[it.id] || 0;
        const fotoIni = (pools[it.id] && pools[it.id][0]) || fotos[it.id];
        return '<div class="servicio-item">' +
          '<button class="servicio" type="button" data-id="' + it.id + '">' +
          '<span class="foto">' + (fotoIni ? '<img src="' + thumbSmUrl(fotoIni) + '" srcset="' + thumbSmUrl(fotoIni) + ' 1x, ' + thumbUrl(fotoIni) + ' 2x" loading="lazy" decoding="async" alt="Trabajo de ' + esc(it.nombre) + '">' : '<span class="vacia">Foto pendiente</span>') + '</span>' +
          '<span class="serv-info"><h4>' + esc(it.nombre) + '</h4><p>' + esc(it.detalle) + '</p>' +
          '<span class="serv-meta">' +
          (pr ? '<span class="precio">Desde $' + pr.toLocaleString('es-AR') + '</span>' : '') +
          '</span></span>' +
          '<span class="ir" aria-hidden="true">' + I.flecha + '</span></button>' +
          (nTrab ? '<button class="ver-trabajos-serv" type="button" data-ver-serv="' + it.id + '">Ver ' + nTrab + (nTrab === 1 ? ' trabajo' : ' trabajos') + ' →</button>' : '') +
          '</div>';
      }).join('') + '</div></details>'
    ).join('');
    activarEntrada();
    iniciarRotacionCarta();
  }

  // Los servicios entran suavemente al llegar a la pantalla (si la persona no pidió menos movimiento)
  function activarEntrada() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('#carta .servicio-item:not(.reveal), #galeria .trabajo[data-serv]:not(.reveal)').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 4) * 50 + 'ms';
      io.observe(el);
    });
  }

  /* ---------- Trabajos e Instagram (todo sale de lo que se carga en el panel) ---------- */
  function pintarMarca() {
    const m = Store.marca();
    $('#insta-h').textContent = m.instagram ? '@' + m.instagram : '';
    $('#insta-link').hidden = !m.instagram; if (m.instagram) $('#insta-link').href = 'https://www.instagram.com/' + m.instagram + '/';
    actualizarLinksWa();

    const g = Store.galeria();
    const items = todos();
    const fg = $('#filtros-galeria');
    const porServ = {};
    let nSoloVideo = 0;
    let nConVideo = 0;

    g.forEach((x) => {
      porServ[x.servId] = (porServ[x.servId] || 0) + 1;
      const nTotal = Array.isArray(x.fotos) ? x.fotos.length : 1;
      const tieneV = !!(x.video || (x.videos && Object.keys(x.videos).length));
      if (tieneV) {
        nConVideo++;
        if (nTotal === 1) nSoloVideo++;
      }
    });

    if (fg) {
      const chips = [{ id: 'todos', nombre: 'Todos (' + g.length + ')' }]
        .concat(nSoloVideo ? [{ id: 'solo-videos', nombre: '▶ Solo videos (' + nSoloVideo + ')' }] : [])
        .concat(nConVideo > nSoloVideo ? [{ id: 'videos', nombre: '▶ Todos con video (' + nConVideo + ')' }] : [])
        .concat(items.filter((i) => porServ[i.id]).map((i) => ({ id: i.id, nombre: i.nombre.split(' (')[0].split(' /')[0] + ' (' + porServ[i.id] + ')' })));
      fg.innerHTML = chips.map((c) =>
        '<button class="chip" type="button" data-fgal="' + c.id + '" aria-pressed="' + (filtroGal === c.id) + '">' + esc(c.nombre) + '</button>'
      ).join('');
    }

    const q = norm(busqGal.trim());
    const filtrada = g.filter((x) => {
      const nTotal = Array.isArray(x.fotos) ? x.fotos.length : 1;
      const tieneV = !!(x.video || (x.videos && Object.keys(x.videos).length));
      const pasaCat = filtroGal === 'todos'
        ? true
        : filtroGal === 'solo-videos'
          ? nTotal === 1 && tieneV
          : filtroGal === 'videos'
            ? tieneV
            : x.servId === filtroGal;
      if (!pasaCat) return false;
      if (!q) return true;
      const it = items.find((i) => i.id === x.servId);
      const nombreServ = it ? it.nombre : '';
      const textoBusq = norm((x.titulo || '') + ' ' + (x.texto || '') + ' ' + nombreServ);
      return textoBusq.includes(q);
    });

    const visible = filtrada.slice(0, limiteGal);
    const resEl = $('#resumen-galeria');
    if (resEl) {
      if (q || filtroGal !== 'todos') {
        resEl.textContent = filtrada.length
          ? 'Viendo ' + visible.length + ' de ' + filtrada.length + (filtrada.length === 1 ? ' trabajo.' : ' trabajos.')
          : 'No encontramos trabajos con ese filtro. Probá con otra palabra o tocá "Todos".';
      } else {
        resEl.textContent = 'Viendo ' + visible.length + ' de ' + filtrada.length + ' trabajos realizados en el salón.';
      }
    }

    $('#galeria').innerHTML = visible.length
      ? visible.map((x) => {
        const ids = Array.isArray(x.servIds) && x.servIds.length ? x.servIds : [x.servId];
        const it = items.find((i) => i.id === x.servId);
        const n = it ? it.nombre : '';
        const tit = x.titulo || n;
        const desc = sinEtiquetas(x.texto);
        const nTotal = Array.isArray(x.fotos) ? x.fotos.length : 1;
        const nVid = x.videos ? Object.keys(x.videos).length : (x.video ? 1 : 0);
        const nFot = nTotal - nVid;
        const esSoloVideo = nVid > 0 && nFot === 0;
        let badgeTxt = '';
        if (nVid > 0 && nFot > 0) {
          badgeTxt = nFot + (nFot === 1 ? ' foto' : ' fotos') + ' · ▶ ' + (nVid === 1 ? '1 video' : nVid + ' videos');
        } else if (esSoloVideo) {
          badgeTxt = '▶ Reel / Video';
        } else if (nTotal > 1) {
          badgeTxt = nTotal + ' fotos';
        }
        const badge = badgeTxt ? '<span class="badge-fotos">' + badgeTxt + '</span>' : '';
        const playCenter = esSoloVideo ? '<span class="play-central" aria-hidden="true">▶</span>' : '';
        const tagsMini = it ? '<small class="tag-serv-card">' + esc(it.nombre.split(' (')[0].split(' /')[0]) + '</small>' : '';
        return '<button class="trabajo" type="button" data-foto="' + x.id + '" data-serv="' + x.servId + '">' +
          '<div class="trabajo-img">' +
          '<img src="' + thumbUrl(x.url) + '" loading="lazy" decoding="async" alt="Trabajo: ' + esc(tit) + '">' +
          playCenter +
          badge +
          '</div>' +
          '<div class="et">' +
          (tagsMini ? '<div class="tags-card">' + tagsMini + '</div>' : '') +
          '<b>' + esc(tit) + '</b>' +
          (desc ? '<span>' + esc(desc) + '</span>' : '') +
          '</div></button>';
      }).join('')
      : '<div class="galeria-vacia"><p>No hay trabajos que coincidan con tu búsqueda.</p><button class="btn suave chico" type="button" id="btn-limpiar-gal">Ver todos los trabajos</button></div>';

    const masCont = $('#galeria-mas');
    if (masCont) {
      const restan = filtrada.length - visible.length;
      masCont.hidden = restan <= 0;
      masCont.style.display = restan > 0 ? 'flex' : 'none';
      if (restan > 0) {
        const btnMas = $('#btn-mas-trabajos');
        const btnTodos = $('#btn-todos-trabajos');
        if (btnMas) btnMas.textContent = 'Ver ' + Math.min(PASO_GAL, restan) + (restan === 1 ? ' trabajo más' : ' trabajos más');
        if (btnTodos) {
          btnTodos.hidden = restan <= 36;
          btnTodos.style.display = restan > 36 ? '' : 'none';
        }
      }
    }

    // Dónde estamos: sale de la dirección o de las coordenadas exactas que se cargan en el panel
    const dir = (m.direccion || '').trim();
    const ciudadAprox = (window.NEGOCIO && window.NEGOCIO.ciudad) || '';
    const coord = String(m.coordenadas || '').replace(/\s/g, '');
    const coordOk = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(coord);
    const donde = $('#donde');
    const navDonde = $('#nav-donde');
    const mapsUrl = (window.NEGOCIO && window.NEGOCIO.maps) || '';
    const lugarMaps = (window.NEGOCIO && window.NEGOCIO.lugarMaps) || '';
    donde.hidden = !(window.NEGOCIO && window.NEGOCIO.mostrarDonde) || (!dir && !coordOk && !ciudadAprox && !mapsUrl);
    const pieDonde = $('#pie-donde'); if (pieDonde) pieDonde.hidden = donde.hidden;
    if (navDonde) navDonde.hidden = donde.hidden;
    if (!donde.hidden) {
      // Sin mapa incrustado: solo un enlace a Google Maps
      $('#mapa').innerHTML = '';
      $('#mapa').hidden = true;
      const lugar = coordOk ? coord : (dir || lugarMaps);
      $('#donde-dir').textContent = dir ? dir : (ciudadAprox ? 'Estamos en ' + ciudadAprox + '.' : 'Encontranos en Google Maps.');
      $('#como-llegar').href = lugar ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lugar) : mapsUrl;
      $('#como-llegar').textContent = 'Cómo llegar en Google Maps';
    }
    // Puntaje y opiniones de Google, y teléfono (datos de la ficha de Maps)
    const neg = window.NEGOCIO || {};
    const estrella = (llena) => '<svg class="est' + (llena ? '' : ' vacia') + '" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z"/></svg>';
    const estrellas = (n) => '<span class="gp-estrellas" role="img" aria-label="' + n + ' de 5 estrellas">' + [1, 2, 3, 4, 5].map((i) => estrella(i <= Math.round(n))).join('') + '</span>';
    const gp = $('#google-puntaje');
    if (gp && neg.google && neg.google.puntaje) {
      gp.hidden = false;
      gp.href = neg.maps || '#';
      gp.innerHTML = estrellas(neg.google.puntaje) + ' <b>' + String(neg.google.puntaje).replace('.', ',') + '</b> · ' + neg.google.opiniones + ' opiniones en Google';
    }
    const opSec = $('#opiniones');
    if (opSec && neg.opiniones && neg.opiniones.length) {
      opSec.hidden = false;
      $('#opiniones-res').textContent = neg.google ? (String(neg.google.puntaje).replace('.', ',') + ' de 5 en Google, con ' + neg.google.opiniones + ' opiniones' + (neg.google.cincoEstrellas ? ' (' + neg.google.cincoEstrellas + ' de 5 estrellas)' : '') + '.') : '';
      $('#opiniones-lista').innerHTML = neg.opiniones.slice(0, 3).map((o) =>
        '<figure class="op-card">' + estrellas(o.e) + '<blockquote>' + esc(o.t) + '</blockquote><figcaption>Clienta · Google</figcaption></figure>').join('');
      $('#opiniones-mas').href = neg.maps || '#';
    }
    const ll = $('#pie-llamar');
    if (ll && neg.telefono) { ll.hidden = false; ll.href = 'tel:' + neg.telefono; }
    const extra = [m.direccion, m.horario].filter(Boolean).join('. ');
    $('#pie-info').textContent = 'Estudio Demo. ' + (extra || (window.NEGOCIO && window.NEGOCIO.textoHorario) || 'Atendemos de lunes a sábado.');
    activarEntrada();
  }

  /* ---------- Visor de un trabajo: publicación entera con todas sus fotos, nombre, descripción y reserva ---------- */
  const visor = $('#visor');
  const sinEtiquetas = (t) => String(t || '').replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim();
  let visorFotos = [];
  let visorVideos = {};
  let visorIdx = 0;
  let visorTit = '';

  function pintarFotoVisor(esApertura) {
    const totalF = visorFotos.length;
    const url = visorFotos[visorIdx] || '';
    const vUrl = visorVideos[url] || null;
    const med = $('#visor-medio');
    if (esApertura || !med.querySelector('.visor-stage')) {
      const mediaHtml = vUrl
        ? '<video src="' + vUrl + '" poster="' + url + '" autoplay muted loop playsinline preload="metadata" controls></video>'
        : '<img src="' + url + '" alt="Trabajo: ' + esc(visorTit) + '">';
      const icoPrev = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
      const icoNext = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
      med.innerHTML =
        '<div class="visor-stage">' + mediaHtml + '</div>' +
        (totalF > 1
          ? '<button class="visor-nav prev" type="button" data-vnav="-1" aria-label="Anterior">' + icoPrev + '</button>' +
            '<button class="visor-nav next" type="button" data-vnav="1" aria-label="Siguiente">' + icoNext + '</button>' +
            '<span class="visor-cuenta" id="visor-cuenta-txt">' + (visorIdx + 1) + ' / ' + totalF + '</span>'
          : '');
    } else {
      const stage = med.querySelector('.visor-stage');
      const cuentaEl = $('#visor-cuenta-txt', med);
      if (cuentaEl) cuentaEl.textContent = (visorIdx + 1) + ' / ' + totalF;
      if (vUrl) {
        stage.innerHTML = '<video src="' + vUrl + '" poster="' + url + '" autoplay muted loop playsinline preload="metadata" controls></video>';
      } else {
        const imgActual = stage.querySelector('img:not(.img-crossfade)');
        if (!imgActual) {
          stage.innerHTML = '<img src="' + url + '" alt="Trabajo: ' + esc(visorTit) + '">';
        } else if (imgActual.getAttribute('src') !== url) {
          const pre = new Image();
          pre.src = url;
          const cambiar = () => {
            imgActual.src = url;
            imgActual.alt = 'Trabajo: ' + visorTit;
          };
          if (pre.decode) {
            pre.decode().then(cambiar).catch(cambiar);
          } else {
            pre.onload = cambiar;
          }
        }
      }
    }
    const th = $('#visor-thumbs');
    if (th) {
      th.hidden = totalF <= 1;
      if (esApertura) {
        th.innerHTML = totalF > 1
          ? visorFotos.map((u, idx) =>
            '<button class="v-thumb' + (idx === visorIdx ? ' activo' : '') + '" type="button" data-vidx="' + idx + '" aria-label="Elemento ' + (idx + 1) + '">' +
            '<img src="' + thumbSmUrl(u) + '" loading="lazy" decoding="async" alt="">' +
            (visorVideos[u] ? '<span class="v-play" aria-hidden="true">▶</span>' : '') +
            '</button>'
          ).join('')
          : '';
      } else {
        th.querySelectorAll('.v-thumb').forEach((b, idx) => {
          b.classList.toggle('activo', idx === visorIdx);
        });
      }
    }
  }

  function abrirVisor(idFoto) {
    const x = Store.galeria().find((y) => y.id === idFoto);
    if (!x) return;
    const items = todos();
    const ids = Array.isArray(x.servIds) && x.servIds.length ? x.servIds : [x.servId];
    const it = items.find((i) => i.id === x.servId);
    const n = it ? it.nombre : '';
    visorTit = x.titulo || n;
    visorFotos = Array.isArray(x.fotos) && x.fotos.length ? x.fotos : [x.url];
    visorVideos = Object.assign({}, x.videos || {});
    if (x.video && !visorVideos[x.url]) visorVideos[x.url] = x.video;
    visorIdx = 0;
    pintarFotoVisor(true);
    // Precargamos las demás fotos del álbum para que pasar de una a otra sea instantáneo
    visorFotos.slice(1).forEach((u) => {
      if (!visorVideos[u]) {
        const p = new Image();
        p.src = u;
      }
    });

    const catsEl = $('#visor-cats');
    if (catsEl) {
      catsEl.innerHTML = n ? '<span class="visor-cat">' + esc(n) + '</span>' : '';
    }
    $('#visor-serv').textContent = visorTit;
    const txt = sinEtiquetas(x.texto);
    $('#visor-texto').textContent = txt;
    $('#visor-texto').hidden = !txt;
    const igLink = $('#visor-ig');
    if (igLink) {
      igLink.href = x.ig || '#';
      igLink.hidden = !x.ig;
    }
    visor.dataset.serv = x.servId;
    const btnsEl = $('#visor-botones');
    if (btnsEl) {
      btnsEl.innerHTML = '<button class="btn" id="visor-reservar" type="button">Reservar este trabajo</button>';
    }
    visor.showModal();
  }

  /* ---------- Reserva ---------- */
  function elegirServicio(id) {
    const item = todos().find((x) => x.id === id) || todos()[0];
    Object.assign(st, nuevoTurno(), { item, largo: item.largo ? null : 'medio', pelo: item.pelo ? null : 'sin dato', i: 1 });
    pintar();
  }

  function abrirModal() { if (!dlg.open) dlg.showModal(); }
  function cerrarModal() { if (dlg.open) dlg.close(); }

  // Desde la lista de servicios, las fotos o la consulta: la mini ventana se abre ya en ese servicio
  function abrir(id) {
    elegirServicio(id);
    abrirModal();
  }

  // Desde "Reservar turno": se abre en el primer paso, para elegir el servicio
  function abrirNuevo() {
    st = nuevoTurno();
    pintar();
    abrirModal();
  }
  function listo(paso) {
    if (paso === 'servicio') return !!st.item;
    if (paso === 'pelo') return !!st.largo && !!st.pelo;
    if (paso === 'dia') return !!(st.dia && st.hora !== null);
    if (paso === 'datos') return true;
    return true;
  }

  // Los horarios libres los calcula el sistema con los turnos reales y las esperas
  function slots() {
    const seg = Store.segmentos(st.item, st.largo, peloInfo());
    const total = Store.total(seg);
    const out = [];
    const hoy = new Date();
    const ahora = Store.ahora() + 30;
    const esHoy = st.dia.toDateString() === hoy.toDateString();
    if (esHoy && Store.cerradoHoy()) return [];
    const fk = Store.clave(st.dia);
    // Cada tramo de atención por separado (por ejemplo 7 a 11 y 14 a 18): el servicio tiene que entrar entero
    Store.tramosFecha(fk).forEach((t) => {
      for (let m = t[0]; m + total <= t[1]; m += N.paso) {
        if (esHoy && m < ahora) continue;
        out.push({ m, ocupado: !Store.libre(fk, m, seg).libre });
      }
    });
    return out;
  }

  function cuerpo(paso) {
    const it = st.item;
    if (paso === 'servicio') {
      const chip = (g, x) => '<button class="chip" type="button" data-svc="' + x.id + '" aria-pressed="' + (st.item && st.item.id === x.id) + '">' + esc(x.nombre) + '</button>';
      return '<h2>¿Qué querés hacerte?</h2><p class="ayuda">Tocá una opción y seguimos.</p>' +
        Store.catalogo().map((g) => '<div class="grupo-p"><b>' + esc(g.nombre) + '</b><div class="chips">' + g.items.map((x) => chip(g, x)).join('') + '</div></div>').join('') +
        '<div class="no-se"><button class="opcion no-se-btn" type="button" data-svc="consulta" aria-pressed="' + !!(st.item && st.item.id === 'consulta') + '"><span><b>No sé qué hacerme</b><span class="det">Lo decido en la peluquería, con la profesional. Reservá igual tu horario.</span></span></button></div>';
    }
    if (paso === 'pelo') {
      const chip = (attr, val, texto, on) => '<button class="chip" type="button" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + esc(texto) + '</button>';
      let h = '<h2>Contanos de tu pelo</h2><p class="ayuda">Así reservamos el tiempo que necesita tu turno.</p>';
      if (it.largo) {
        h += '<div class="grupo-p"><b>¿Qué largo tiene?</b><div class="chips">' +
          Object.keys(window.LARGOS).map((k) => chip('data-largo', k, window.LARGOS[k].nombre, st.largo === k)).join('') +
          '</div><p class="hint">Corto: por encima de los hombros. Medio: hasta los hombros o un poco más. Largo: por debajo de los hombros.</p></div>';
      }
      if (it.pelo) {
        h += '<div class="grupo-p"><b>¿Cómo es?</b><div class="chips">' +
          window.TIPOS_PELO.map((t) => chip('data-pelo', t.id, t.nombre, st.pelo === t.id)).join('') + '</div></div>';
        // "Ya tiene tintura" solo importa en los servicios de color
        const extras = window.EXTRAS_PELO.filter((x) => x.id !== 'previo' || it.color);
        h += '<div class="grupo-p"><b>¿Algo más?</b><p class="hint" style="margin:0 0 10px">Tocá lo que corresponda o escribí si querés aclarar algo. Si no, seguí.</p><div class="chips">' +
          extras.map((x) => chip('data-extra', x.id, x.nombre, st.extras.includes(x.id))).join('') + '</div>' +
          '<div class="campo" style="margin-top:12px"><textarea id="f-nota" rows="2" placeholder="Si querés contarle o aclarar algo más, escribilo acá (opcional)">' + esc(st.nota || '') + '</textarea></div>' +
          '</div>';
      }
      return h;
    }
    if (paso === 'dia') {
      const t = tiempos();
      const dias = [];
      const base = new Date();
      const diasHabiles = Store.diasAtencion();
      for (let k = 0; k < 150 && dias.length < (st.nDias || 12); k++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + k);
        if (Store.diaAbierto(Store.clave(d))) dias.push(d);
      }
      let h = '<h2>¿Qué día te queda bien?</h2>';
      if (st.aviso) h += '<p class="aviso-error">' + st.aviso + '</p>';
      h += '<div class="resumen-mini">' + (it.aDefinir ? 'Todavía no sabés qué hacerte: lo decidís en la peluquería, con la profesional.' : esc(it.nombre) + (it.largo ? ', pelo ' + window.LARGOS[st.largo].nombre.toLowerCase() : '') + '.') + '</div>';
      h += '<div class="dias" role="group" aria-label="Días">' + dias.map((d, i) =>
        '<button class="dia" type="button" data-dia="' + i + '" aria-pressed="' + (!!st.dia && st.dia.toDateString() === d.toDateString()) + '"><small>' + DIAS_C[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + MESES[d.getMonth()].slice(0, 3) + '</small></button>'
      ).join('') + '</div>' +
        '<button class="btn suave mas-dias" type="button" data-accion="masdias">Ver más días</button>';
      st.listaDias = dias;
      if (st.dia) {
        if (st.dia.toDateString() === new Date().toDateString() && Store.cerradoHoy()) h += '<p class="aviso-error">Hoy ya no tomamos más turnos. Elegí otro día.</p>';
        const listaSlots = slots();
        const libresCount = listaSlots.filter((s) => !s.ocupado).length;
        if (listaSlots.length && libresCount === 0) {
          h += '<p class="aviso-error">Ese día ya no quedan horarios con tiempo suficiente para este servicio. Probá con otro día.</p>';
        }
        h += '<div class="horas" role="group" aria-label="Horarios">' + listaSlots.map((s) =>
          '<button class="hora" type="button" data-hora="' + s.m + '"' + (s.ocupado ? ' disabled' : '') + ' aria-pressed="' + (st.hora === s.m) + '">' + hhmm(s.m) + '</button>'
        ).join('') + '</div>';
      } else {
        h += '<p class="ayuda">Elegí un día para ver los horarios libres.</p>';
      }
      return h;
    }
    if (paso === 'datos') {
      return '<h2>¿A nombre de quién?</h2><p class="ayuda">Con estos datos te guardamos el turno.</p>' +
        '<div class="campo"><label for="f-nombre">Tu nombre</label><input id="f-nombre" autocomplete="given-name" value="' + esc(st.nombre) + '"><div class="error">' + (st.errores.nombre || '') + '</div></div>' +
        '<div class="campo"><label for="f-tel">Tu WhatsApp</label><small class="hint-campo">Con la característica, sin 0 ni 15.</small><input id="f-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="Ej: 3757 515300" value="' + esc(st.tel) + '"><div class="error">' + (st.errores.tel || '') + '</div></div>' +
        (!it.pelo ? '<div class="campo"><label for="f-nota">¿Algo más? (opcional)</label><textarea id="f-nota" rows="2" placeholder="Si querés aclarar algo más, escribilo acá">' + esc(st.nota || '') + '</textarea></div>' : '');
    }
    // listo
    const t = tiempos();
    const fecha = fechaLarga(st.dia);
    let h = '<div class="listo"><div class="sello">' + I.tilde + '</div><h2>Tu turno quedó reservado</h2>';
    h += '<p class="ayuda">Te esperamos, ' + esc(st.nombre) + '.</p>';
    h += '<div class="ficha"><div class="escalera"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><dl>';
    h += '<div><dt>Servicio</dt><dd>' + esc(it.nombre) + '</dd></div>';
    if (it.largo) h += '<div><dt>Largo del pelo</dt><dd>' + window.LARGOS[st.largo].nombre + '</dd></div>';
    if (st.nota && st.nota.trim()) h += '<div><dt>Nota</dt><dd>' + esc(st.nota.trim()) + '</dd></div>';
    h += '<div><dt>Día</dt><dd>' + fecha + '</dd></div>';
    h += '<div><dt>Hora</dt><dd>' + hhmm(st.hora) + '</dd></div></dl></div>';
    h += '</div>';
    return h;
  }

  // Recordatorio gratis: el turno se baja al calendario de la clienta con alarma un día antes y dos horas antes
  function icsUrl() {
    const d = st.dia;
    const p2 = (n) => String(n).padStart(2, '0');
    const fmt = (m) => d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + 'T' + p2(Math.floor(m / 60)) + p2(m % 60) + '00';
    const total = Store.total(Store.segmentos(st.item, st.largo, peloInfo()));
    const sello = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lineas = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Estudio Demo//Turnos//ES', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@estetica-estudio-demo', 'DTSTAMP:' + sello,
      'DTSTART:' + fmt(st.hora), 'DTEND:' + fmt(st.hora + total),
      'SUMMARY:Estudio Demo: ' + st.item.nombre, 'DESCRIPTION:Tu turno en Estudio Demo.',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Mañana tenés turno en Estudio Demo', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:En dos horas tenés turno en Estudio Demo', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lineas.join('\r\n'));
  }

  function mensajeWa() {
    const it = st.item;
    let m = 'Hola la profesional, soy ' + st.nombre + '. Reservé ' + it.nombre;
    if (it.largo) m += ' (pelo ' + window.LARGOS[st.largo].nombre.toLowerCase() + ')';
    m += ' para el ' + fechaLarga(st.dia) + ' a las ' + hhmm(st.hora) + '.';
    if (it.pelo && st.pelo && st.pelo !== 'sin dato') {
      const tp = window.TIPOS_PELO.find((x) => x.id === st.pelo);
      const ex = window.EXTRAS_PELO.filter((x) => st.extras.includes(x.id)).map((x) => x.nombre.toLowerCase());
      if (tp) m += ' Mi pelo: ' + tp.nombre.toLowerCase() + (ex.length ? ', ' + ex.join(', ') : '') + '.';
    }
    if (st.nota && st.nota.trim()) m += ' Nota: ' + st.nota.trim() + '.';
    return m;
  }

  function pintar() {
    const lista = pasos();
    const paso = lista[st.i];
    const total = lista.length - 1;
    const enListo = paso === 'listo';
    let h = '<div class="paso"><header>';
    h += st.i > 0 && !enListo ? '<button class="atras" type="button" aria-label="Volver">' + I.atras + '</button>' : '<span style="width:48px"></span>';
    h += '<div class="progreso" aria-hidden="true">' + lista.slice(0, total).map((_, k) => '<i class="' + (k <= st.i ? 'hecho' : '') + '"></i>').join('') + '</div>';
    h += '<button class="cerrar" type="button" aria-label="Cerrar">' + I.cerrar + '</button></header>';
    h += '<div class="cuerpo">' + cuerpo(paso) + '</div>';
    if (enListo) {
      const url = 'https://wa.me/' + numWa() + '?text=' + encodeURIComponent(mensajeWa());
      h += '<footer><a class="btn" href="' + url + '" target="_blank" rel="noopener">Avisarle a la profesional por WhatsApp</a>' +
        '<a class="btn suave" download="turno-estudio-demo.ics" href="' + icsUrl() + '">Agregar a mi calendario</a>' +
        '<button class="btn suave" type="button" data-accion="cerrar">Listo</button></footer>';
    } else if (paso !== 'servicio') {
      h += '<footer><button class="btn" type="button" data-accion="seguir"' + (listo(paso) ? '' : ' disabled') + '>' + (paso === 'datos' ? 'Confirmar mi turno' : 'Seguir') + '</button></footer>';
    }
    h += '</div>';
    const cambio = st.vistoI !== st.i;
    st.vistoI = st.i;
    caja.innerHTML = h;
    if (cambio) {
      caja.querySelector('.cuerpo').classList.add('entra');
      dlg.scrollTop = 0;
    }
  }
  function seguir() {
    const paso = pasos()[st.i];
    const notaEl = $('#f-nota', caja);
    if (notaEl) st.nota = notaEl.value;
    if (paso === 'datos') {
      const n = $('#f-nombre', caja).value.trim();
      const t = $('#f-tel', caja).value.replace(/[^\d]/g, '');
      st.nombre = n;
      st.tel = $('#f-tel', caja).value;
      st.errores = {};
      if (n.length < 2) st.errores.nombre = 'Escribí tu nombre.';
      if (t.length < 8) st.errores.tel = 'Revisá el número: tiene que llevar la característica.';
      if (st.errores.nombre || st.errores.tel) return pintar();
      // Se vuelve a controlar el horario justo antes de guardar, por si alguien lo tomó recién
      const seg = Store.segmentos(st.item, st.largo, peloInfo());
      if (!Store.libre(Store.clave(st.dia), st.hora, seg).libre) {
        st.hora = null;
        st.aviso = 'Ese horario se acaba de ocupar. Elegí otro.';
        st.i = pasos().indexOf('dia');
        return pintar();
      }
      const turno = {
        fecha: Store.clave(st.dia), ini: st.hora, nom: st.nombre, tel: st.tel,
        serv: st.item.nombre, servId: st.item.id, largo: st.item.largo ? st.largo : undefined,
        pelo: st.pelo, extras: st.extras, nota: (st.nota || '').trim() || undefined, seg, origen: 'web', nuevo: true,
      };
      if (window.NUBE && window.NUBE.modo === 'anon' && window.NUBE.reservar) {
        // Se reserva en la nube: ahí se controla que nadie más haya tomado el horario
        if (st.guardando) return;
        st.guardando = true;
        const btn = $('[data-accion="seguir"]', caja);
        if (btn) { btn.disabled = true; btn.textContent = 'Reservando...'; }
        window.NUBE.reservar(turno).then((r) => {
          st.guardando = false;
          if (!r.ok) {
            st.hora = null;
            st.aviso = r.ocupado ? 'Ese horario se acaba de ocupar. Elegí otro.' : 'No pudimos guardar tu turno. Revisá tu conexión y probá de nuevo.';
            if (r.ocupado) { st.i = pasos().indexOf('dia'); window.NUBE.hidratar && window.NUBE.hidratar(); }
            return pintar();
          }
          turno._yaEnNube = true;
          Store.add(turno);
          st.i += 1;
          pintar();
        });
        return;
      }
      Store.add(turno);
    }
    st.i += 1;
    pintar();
  }

  caja.addEventListener('input', (e) => {
    if (!e.target) return;
    if (e.target.id === 'f-nota') st.nota = e.target.value;
    if (e.target.id === 'f-nombre') st.nombre = e.target.value;
    if (e.target.id === 'f-tel') st.tel = e.target.value;
  });

  caja.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.cerrar') || t.closest('[data-accion="cerrar"]')) return cerrarModal();
    const svc = t.closest('[data-svc]');
    if (svc) return elegirServicio(svc.dataset.svc);
    if (t.closest('.atras')) { st.i = Math.max(0, st.i - 1); return pintar(); }
    if (t.closest('[data-accion="seguir"]')) return seguir();
    if (t.closest('[data-accion="masdias"]')) { st.nDias = (st.nDias || 12) + 12; return pintar(); }
    let b;
    if ((b = t.closest('[data-largo]'))) { st.largo = b.dataset.largo; st.hora = null; return pintar(); }
    if ((b = t.closest('[data-pelo]'))) { st.pelo = b.dataset.pelo; st.hora = null; return pintar(); }
    if ((b = t.closest('[data-extra]'))) { const x = b.dataset.extra; st.extras = st.extras.includes(x) ? st.extras.filter((y) => y !== x) : st.extras.concat(x); st.hora = null; return pintar(); }
    if ((b = t.closest('[data-dia]'))) { st.dia = st.listaDias[Number(b.dataset.dia)]; st.hora = null; return pintar(); }
    if ((b = t.closest('[data-hora]'))) { st.hora = Number(b.dataset.hora); st.aviso = null; return pintar(); }
  });
  caja.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); seguir(); }
  });

  pintarCarta();
  pintarMarca();
  pintar();
  // La mini ventana se cierra tocando afuera o con Esc, y vuelve a empezar de cero
  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarModal(); });
  dlg.addEventListener('close', () => { if (!dlg.open) { st = nuevoTurno(); pintar(); } });
  document.querySelectorAll('[data-abrir-turnero]').forEach((b) => b.addEventListener('click', abrirNuevo));
  $('#carta').addEventListener('click', (e) => {
    const verBtn = e.target.closest('[data-ver-serv]');
    if (verBtn) {
      filtroGal = verBtn.dataset.verServ;
      busqGal = '';
      const inp = $('#buscar-galeria');
      if (inp) inp.value = '';
      limiteGal = PASO_GAL;
      pintarMarca();
      const sec = $('#trabajos');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const b = e.target.closest('.servicio');
    if (b) abrir(b.dataset.id);
  });
  // Si la profesional cambia precios, tiempos o fotos en el panel, esta página se actualiza sola
  window.addEventListener('storage', (e) => {
    if (Store.CLAVES.includes(e.key)) {
      pintarCarta();
      pintarMarca();
      if (dlg.open && st.item && pasos()[st.i] === 'dia') pintar();
    }
  });
  const fgEl = $('#filtros-galeria');
  if (fgEl) {
    fgEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fgal]');
      if (!b) return;
      filtroGal = b.dataset.fgal;
      limiteGal = PASO_GAL;
      pintarMarca();
    });
  }
  const busqInput = $('#buscar-galeria');
  if (busqInput) {
    busqInput.addEventListener('input', () => {
      busqGal = busqInput.value;
      limiteGal = PASO_GAL;
      pintarMarca();
    });
  }
  const btnMas = $('#btn-mas-trabajos');
  if (btnMas) {
    btnMas.addEventListener('click', () => {
      limiteGal += PASO_GAL;
      pintarMarca();
    });
  }
  const btnTodos = $('#btn-todos-trabajos');
  if (btnTodos) {
    btnTodos.addEventListener('click', () => {
      limiteGal = 9999;
      pintarMarca();
    });
  }
  $('#galeria').addEventListener('click', (e) => {
    if (e.target.closest('#btn-limpiar-gal')) {
      filtroGal = 'todos';
      busqGal = '';
      if (busqInput) busqInput.value = '';
      limiteGal = PASO_GAL;
      pintarMarca();
      return;
    }
    const b = e.target.closest('[data-foto]');
    if (b) abrirVisor(b.dataset.foto);
  });
  const vitrinaEl = $('.hero-vitrina');
  if (vitrinaEl) {
    vitrinaEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-foto]');
      if (b) abrirVisor(b.dataset.foto);
    });
    const cardsV = Array.from(vitrinaEl.querySelectorAll('.vitrina-card'));
    // Orden estricto desde los últimos trabajos que hizo hasta los primeros (solo fotos en alta resolución, sin capturas de video)
    const soloFotos = Store.galeria().filter((x) => !x.video);
    const pool = soloFotos.length >= cardsV.length ? soloFotos : Store.galeria().slice();
    let idxPool = 0;
    const aplicarTrabajoACard = (card, w, conFade) => {
      if (!card || !w) return;
      const marco = card.querySelector('.vitrina-marco');
      const img = card.querySelector('.vitrina-marco img:not(.img-crossfade)');
      const sub = card.querySelector('.vitrina-sub');
      const tag = card.querySelector('.vitrina-tag');
      const it = todos().find((x) => x.id === w.servId);
      const catCorto = it ? it.nombre.split(' (')[0].split(' /')[0] : 'Trabajo';
      const tit = (w.titulo || catCorto).split(' (')[0];
      const mismoTxt = norm(catCorto) === norm(tit);
      const tUrl = thumbUrl(w.url);
      if (!conFade || !marco || !img) {
        card.dataset.foto = w.id;
        if (img) { img.src = tUrl; img.alt = tit; }
        if (sub) { sub.textContent = catCorto; sub.hidden = mismoTxt; }
        if (tag) tag.textContent = tit;
        return;
      }
      crossfadeImagen(marco, img, tUrl, null, tit, () => {
        card.dataset.foto = w.id;
        if (sub) { sub.textContent = catCorto; sub.hidden = mismoTxt; }
        if (tag) tag.textContent = tit;
      });
    };
    if (pool.length >= cardsV.length) {
      cardsV.forEach((c) => {
        aplicarTrabajoACard(c, pool[idxPool % pool.length], false);
        idxPool++;
      });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let turnoCard = 0;
        setInterval(() => {
          if (document.hidden || dlg.open || visor.open || vitrinaEl.matches(':hover')) return;
          const card = cardsV[turnoCard % cardsV.length];
          const w = pool[idxPool % pool.length];
          idxPool++;
          turnoCard++;
          aplicarTrabajoACard(card, w, true);
        }, 7500);
      }
    }
  }
  const fabEl = $('.fab-reservar');
  const heroEl = $('.hero');
  if (fabEl && heroEl && 'IntersectionObserver' in window) {
    const ioFab = new IntersectionObserver((ents) => {
      ents.forEach((en) => fabEl.classList.toggle('oculto-fab', en.isIntersecting));
    }, { threshold: 0.15 });
    ioFab.observe(heroEl);
  }
  visor.addEventListener('click', (e) => {
    const resBtn = e.target.closest('[data-reservar-serv]');
    if (resBtn) {
      const s = resBtn.dataset.reservarServ || visor.dataset.serv;
      visor.close();
      abrir(s);
      return;
    }
    if (e.target.closest('#visor-reservar')) {
      const s = visor.dataset.serv;
      visor.close();
      abrir(s);
      return;
    }
    const nav = e.target.closest('[data-vnav]');
    if (nav && visorFotos.length > 1) {
      visorIdx = (visorIdx + Number(nav.dataset.vnav) + visorFotos.length) % visorFotos.length;
      pintarFotoVisor();
      return;
    }
    const th = e.target.closest('[data-vidx]');
    if (th) {
      visorIdx = Number(th.dataset.vidx);
      pintarFotoVisor();
      return;
    }
    if (e.target === visor || e.target.closest('.cerrar-v')) visor.close();
  });
  document.addEventListener('keydown', (e) => {
    if (!visor.open || visorFotos.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      visorIdx = (visorIdx - 1 + visorFotos.length) % visorFotos.length;
      pintarFotoVisor();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      visorIdx = (visorIdx + 1) % visorFotos.length;
      pintarFotoVisor();
    }
  });
  let touchStartX = null;
  const vMed = $('#visor-medio');
  if (vMed) {
    vMed.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) touchStartX = e.touches[0].clientX;
    }, { passive: true });
    vMed.addEventListener('touchend', (e) => {
      if (touchStartX === null || visorFotos.length <= 1) return;
      const dx = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchStartX) - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) > 40) {
        visorIdx = (visorIdx + (dx < 0 ? 1 : -1) + visorFotos.length) % visorFotos.length;
        pintarFotoVisor();
      }
    }, { passive: true });
  }
  visor.addEventListener('close', () => { $('#visor-medio').innerHTML = ''; });
  const btnTema = $('#btn-tema');
  if (btnTema) {
    const actualizarBotonTema = () => {
      const esOscuro = document.documentElement.getAttribute('data-tema') === 'oscuro';
      btnTema.setAttribute('aria-pressed', String(esOscuro));
      btnTema.setAttribute('title', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    };
    actualizarBotonTema();
    btnTema.addEventListener('click', () => {
      const actual = document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.setAttribute('data-tema', actual);
      try { localStorage.setItem('estudio-demo_tema_v1', actual); } catch (_) {}
      actualizarBotonTema();
    });
  }
  actualizarLinksWa();
})();
