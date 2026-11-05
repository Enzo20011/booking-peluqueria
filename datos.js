// Datos del negocio (versión de demostración, todo de ejemplo).
// Los servicios, los tiempos de trabajo y de espera y los horarios son inventados para la demo; se cambian desde Ajustes en el panel.
window.NEGOCIO = {
  nombre: 'Estudio Demo',
  whatsapp: '',
  telefono: '',
  google: null,
  opiniones: [],
  maps: '',
  abre: 8 * 60,        // lo más temprano que abre cualquier día
  cierra: 19 * 60,     // lo más tarde que cierra cualquier día
  dias: [2, 3, 4, 5, 6], // martes a sábado (lunes y domingo cerrado)
  horarios: { 2: [[480, 720], [840, 1140]], 3: [[480, 720], [840, 1140]], 4: [[480, 720], [840, 1140]], 5: [[480, 720], [840, 1140]], 6: [[540, 780]] },
  mostrarDonde: false,
  ciudad: '',
  lugarMaps: '',
  textoHorario: 'Atendemos de martes a viernes de 8 a 12 y de 14 a 19 hs, y los sábados de 9 a 13 hs.',
  paso: 30,
};

window.LARGOS = {
  corto: { nombre: 'Corto', det: 'Por encima de los hombros' },
  medio: { nombre: 'Medio', det: 'Hasta los hombros o un poco más' },
  largo: { nombre: 'Largo', det: 'Por debajo de los hombros' },
};

window.TIPOS_PELO = [
  { id: 'lacio', nombre: 'Lacio' },
  { id: 'ondulado', nombre: 'Ondulado' },
  { id: 'enrulado', nombre: 'Enrulado' },
];

// Cosas que alargan el turno y la clienta marca si corresponden
window.EXTRAS_PELO = [
  { id: 'previo', nombre: 'Ya tiene tintura o decoloración' },
  { id: 'mucho', nombre: 'Tiene mucho pelo' },
];

// min = duración total del turno; esp = minutos de espera en los que la profesional queda libre
window.CATALOGO = [
  {
    id: 'color',
    nombre: 'Color y mechas',
    items: [
      { id: 'balayage', nombre: 'Balayage', detalle: 'En tonos rubios fríos, dorados, miel o caramelo, también sin decoloración.', largo: true, pelo: true,
        v: { corto: { min: 180, esp: 45 }, medio: { min: 210, esp: 50 }, largo: { min: 240, esp: 60 } } },
      { id: 'castano', nombre: 'Castaño iluminado', detalle: 'Iluminación sutil o con contraste para dar luz y brillo al pelo castaño.', largo: true, pelo: true,
        v: { corto: { min: 150, esp: 40 }, medio: { min: 180, esp: 45 }, largo: { min: 210, esp: 50 } } },
      { id: 'mechas-gorro', nombre: 'Mechas con gorro', detalle: 'Mechas en rubios fríos, cálidos o miel, devolviendo contraste natural.', largo: true, pelo: true,
        v: { corto: { min: 150, esp: 40 }, medio: { min: 180, esp: 45 }, largo: { min: 210, esp: 50 } } },
      { id: 'contouring', nombre: 'Mechas con contouring / Ice Blonde / Glow Up', detalle: 'Mechas rubias y contorno frontal iluminado que realza el rostro.', largo: true, pelo: true,
        v: { corto: { min: 165, esp: 45 }, medio: { min: 195, esp: 50 }, largo: { min: 225, esp: 55 } } },
      { id: 'babylights', nombre: 'Babylights', detalle: 'Mechas tejidas súper finas y delicadas, efecto besado por el sol.', largo: true, pelo: true,
        v: { corto: { min: 180, esp: 45 }, medio: { min: 210, esp: 50 }, largo: { min: 240, esp: 60 } } },
      { id: 'micromechas', nombre: 'Micro mechas (disimulo de canas)', detalle: 'Micro mechas y mechitas tejidas ideales para iluminar e integrar las canas.', largo: true, pelo: true,
        v: { corto: { min: 180, esp: 45 }, medio: { min: 210, esp: 50 }, largo: { min: 240, esp: 60 } } },
      { id: 'retoque', nombre: 'Retoque de mechas', detalle: 'Mantenimiento de raíz o contorno para recuperar el rubio cuidando el largo.', largo: true, pelo: true,
        v: { corto: { min: 120, esp: 35 }, medio: { min: 140, esp: 40 }, largo: { min: 160, esp: 45 } } },
      { id: 'color-global', nombre: 'Color global (cobrizo, chocolate o platinado)', detalle: 'Color completo parejo: tonos cobrizos, chocolate, castaño natural o platinado.', largo: true, pelo: true,
        v: { corto: { min: 90, esp: 35 }, medio: { min: 110, esp: 40 }, largo: { min: 130, esp: 45 } } },
      { id: 'correccion', nombre: 'Corrección de color / Mechas inversas / Matización', detalle: 'Para corregir restos de coloración oscura o rojiza, devolver fondo natural o matizar.', largo: true, pelo: true,
        v: { corto: { min: 180, esp: 45 }, medio: { min: 210, esp: 50 }, largo: { min: 240, esp: 60 } } },
    ],
  },
  {
    id: 'tratamientos',
    nombre: 'Tratamientos',
    items: [
      { id: 'nutritivo', nombre: 'Tratamiento nutritivo y brillo', detalle: 'Nutrición profunda (Prismax, células madre o touch de argán) para recuperar el pelo y dar brillo.', largo: true, pelo: true,
        v: { corto: { min: 50, esp: 15 }, medio: { min: 60, esp: 15 }, largo: { min: 70, esp: 20 } } },
      { id: 'botox', nombre: 'Botox capilar / Plastificado en gel', detalle: 'Botox capilar, botox matizador o plastificado en gel para controlar el frizz y dar brillo extremo.', largo: true, pelo: true,
        v: { corto: { min: 120, esp: 40 }, medio: { min: 150, esp: 40 }, largo: { min: 180, esp: 45 } } },
      { id: 'alisado', nombre: 'Alisado (keratina / sin formol)', detalle: 'Tratamiento de alisado para eliminar el frizz y lograr un lacio parejo y saludable.', largo: true, pelo: true,
        v: { corto: { min: 150, esp: 40 }, medio: { min: 180, esp: 40 }, largo: { min: 210, esp: 45 } } },
    ],
  },
  {
    id: 'corte',
    nombre: 'Cortes y peinados',
    items: [
      { id: 'corte', nombre: 'Corte de pelo (tendencia / Bob / puntas)', detalle: 'Corte personalizado, líneas rectas, Short Bob, Long Bob, puntas o cambio de look.', largo: false, pelo: false, fijo: { min: 35, esp: 0 } },
      { id: 'peinado', nombre: 'Lavado, brushing, ondas y peinados de fiesta', detalle: 'Lavado profesional, modelado con brushing u ondas y peinados de recepción.', largo: false, pelo: false, fijo: { min: 30, esp: 0 } },
      { id: 'corte-peinado', nombre: 'Corte y peinado / Alisado más corte', detalle: 'Corte personalizado más lavado, modelado o tratamiento final.', largo: false, pelo: false, fijo: { min: 45, esp: 0 } },
    ],
  },
];

// Los servicios de color son los que se alargan si el pelo ya tiene tintura o decoloración
['balayage', 'castano', 'mechas-gorro', 'contouring', 'babylights', 'micromechas', 'retoque', 'color-global', 'correccion'].forEach((id) => {
  const item = window.CATALOGO.flatMap((g) => g.items).find((x) => x.id === id);
  if (item) item.color = true;
});

// Para quien no sabe qué hacerse: reserva un tiempo y se decide en la peluquería. La profesional después suma el servicio real (el sistema acomoda la agenda).
window.CONSULTA = { id: 'consulta', nombre: 'A definir en la peluquería', fijo: { min: 150, esp: 0 }, largo: false, pelo: false, aDefinir: true };
