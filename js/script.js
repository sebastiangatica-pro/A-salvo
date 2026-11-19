const CLAVE_KIT = 'a-salvo-kit-completados';
const CLAVE_AVISO = 'a-salvo-aviso-mensaje';
const CLAVE_CONTACTOS = 'a-salvo-contactos';
const CLAVE_PLAN = 'a-salvo-plan-familiar';
const AVISO_POR_DEFECTO = 'Estoy a salvo. Estoy bien y en un lugar seguro.';
const AVISO_LARGO_MAXIMO = 160;

// Utilidades compartidas

function leerContactos() {
  const contactos = JSON.parse(localStorage.getItem(CLAVE_CONTACTOS) || '[]');
  return Array.isArray(contactos) ? contactos : [];
}

function mostrarEstado(elemento, texto, esError = false) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.classList.remove('visually-hidden');
  elemento.classList.toggle('text-danger', esError);
  elemento.classList.toggle('text-success', !esError);
}

function limpiarEstado(elemento) {
  if (!elemento) return;
  elemento.textContent = '';
  elemento.classList.add('visually-hidden');
  elemento.classList.remove('text-danger', 'text-success');
}

// Kit (kit.html e index.html)

async function iniciarKit() {
  const listaKit = document.querySelector('[data-kit-checklist]');
  const seccionesAvance = [...document.querySelectorAll('[data-kit-progress]')];
  if (!listaKit && seccionesAvance.length === 0) return;

  const estado = document.querySelector('[data-kit-status]');

  try {
    const respuesta = await fetch('data/kit.json');
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar data/kit.json (${respuesta.status}).`);
    }

    const elementos = await respuesta.json();
    if (!Array.isArray(elementos)) throw new Error('data/kit.json no tiene el formato esperado.');
    const categorias = [...new Set(elementos.map((elemento) => elemento.categoria))];

    const guardados = JSON.parse(localStorage.getItem(CLAVE_KIT) || '[]');
    const idsValidos = new Set(elementos.map((elemento) => elemento.id));
    const completados = new Set(
      Array.isArray(guardados) ? guardados.filter((id) => idsValidos.has(id)) : []
    );

    const actualizarAvance = () => {
      const listos = completados.size;
      const porcentaje = Math.round((listos / elementos.length) * 100);
      seccionesAvance.forEach((seccion) => {
        seccion.querySelector('[data-kit-count]').textContent = `${listos} de ${elementos.length}`;
        const barraProgreso = seccion.querySelector('[role="progressbar"]');
        barraProgreso.setAttribute('aria-valuemax', elementos.length);
        barraProgreso.setAttribute('aria-valuenow', listos);
        seccion.querySelector('[data-kit-bar]').style.width = `${porcentaje}%`;
      });
    };

    if (listaKit) {
      categorias.forEach((categoria, indice) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';

        const encabezado = document.createElement('h2');
        encabezado.className = 'accordion-header';
        encabezado.id = `kit-heading-${indice}`;

        const boton = document.createElement('button');
        boton.className = 'accordion-button collapsed';
        boton.type = 'button';
        boton.dataset.bsToggle = 'collapse';
        boton.dataset.bsTarget = `#kit-category-${indice}`;
        boton.setAttribute('aria-expanded', 'false');
        boton.setAttribute('aria-controls', `kit-category-${indice}`);
        boton.textContent = categoria;
        encabezado.append(boton);

        const panel = document.createElement('div');
        panel.id = `kit-category-${indice}`;
        panel.className = 'accordion-collapse collapse';
        panel.setAttribute('aria-labelledby', encabezado.id);
        panel.dataset.bsParent = '#kit-accordion';

        const cuerpo = document.createElement('div');
        cuerpo.className = 'accordion-body';
        elementos.filter((elemento) => elemento.categoria === categoria).forEach((elemento) => {
          const contenedor = document.createElement('div');
          contenedor.className = 'form-check mb-3';

          const casilla = document.createElement('input');
          casilla.className = 'form-check-input';
          casilla.type = 'checkbox';
          casilla.id = `kit-item-${elemento.id}`;
          casilla.checked = completados.has(elemento.id);
          casilla.addEventListener('change', () => {
            if (casilla.checked) {
              completados.add(elemento.id);
            } else {
              completados.delete(elemento.id);
            }
            actualizarAvance();
            try {
              localStorage.setItem(CLAVE_KIT, JSON.stringify([...completados]));
              limpiarEstado(estado);
            } catch (error) {
              mostrarEstado(estado, `No se pudo guardar el avance del kit: ${error.message}`, true);
            }
          });

          const etiqueta = document.createElement('label');
          etiqueta.className = 'form-check-label fw-semibold';
          etiqueta.htmlFor = casilla.id;
          etiqueta.textContent = elemento.nombre;
          contenedor.append(casilla, etiqueta);
          cuerpo.append(contenedor);
        });

        panel.append(cuerpo);
        item.append(encabezado, panel);
        listaKit.append(item);
      });
    }

    actualizarAvance();
  } catch (error) {
    const pista = window.location.protocol === 'file:'
      ? ' Abre el proyecto con Live Server o desde GitHub Pages; fetch no funciona al abrir el HTML con doble clic.'
      : '';
    mostrarEstado(estado, `No se pudo mostrar el kit. ${error.message}${pista}`, true);
  }
}

// Mi aviso (mi_aviso.html)

function iniciarAviso() {
  const mensaje = document.querySelector('[data-aviso-mensaje]');
  if (!mensaje) return;

  const contador = document.querySelector('[data-aviso-contador]');
  const validacion = document.querySelector('[data-aviso-validacion]');
  const botonSms = document.querySelector('[data-aviso-sms]');
  const botonCopiar = document.querySelector('[data-aviso-copiar]');
  const estado = document.querySelector('[data-aviso-status]');
  const frasesRapidas = [...document.querySelectorAll('[data-aviso-frase]')];

  let mensajeGuardado = '';
  try {
    mensajeGuardado = localStorage.getItem(CLAVE_AVISO) || '';
  } catch (error) {
    mostrarEstado(estado, `No se pudo leer el aviso guardado: ${error.message}`, true);
  }
  mensaje.value = mensajeGuardado.slice(0, AVISO_LARGO_MAXIMO) || AVISO_POR_DEFECTO;

  function validar() {
    const valido = mensaje.value.trim().length > 0;
    contador.textContent = `${mensaje.value.length} / ${AVISO_LARGO_MAXIMO}`;
    mensaje.classList.toggle('is-invalid', !valido);
    mensaje.classList.toggle('is-valid', valido);

    validacion.textContent = valido ? 'Mensaje listo para compartir.' : 'El mensaje no puede estar vacío.';
    validacion.classList.toggle('text-danger', !valido);
    validacion.classList.toggle('text-success', valido);

    botonSms.disabled = !valido;
    botonCopiar.disabled = !valido;
    return valido;
  }

  mensaje.addEventListener('input', () => {
    validar();
    limpiarEstado(estado);
    try {
      localStorage.setItem(CLAVE_AVISO, mensaje.value);
    } catch (error) {
      mostrarEstado(estado, `No se pudo guardar el aviso: ${error.message}`, true);
    }
  });

  frasesRapidas.forEach((boton) => {
    boton.addEventListener('click', () => {
      mensaje.value = boton.dataset.avisoFrase;
      mensaje.dispatchEvent(new Event('input'));
    });
  });

  botonSms.addEventListener('click', () => {
    if (!validar()) return;

    let contactos;
    try {
      contactos = leerContactos();
    } catch (error) {
      mostrarEstado(estado, `No se pudieron cargar los contactos: ${error.message}`, true);
      return;
    }

    if (contactos.length === 0) {
      mostrarEstado(estado, 'Primero agrega contactos: ', true);
      const enlace = document.createElement('a');
      enlace.href = 'contactos.html';
      enlace.textContent = 'Ir a Contactos';
      enlace.className = 'link-danger';
      estado.append(enlace);
      return;
    }

    const destinatarios = contactos
      .map((contacto) => contacto.telefono || '')
      .filter(Boolean)
      .map((telefono) => telefono.startsWith('+') ? telefono : `+56${telefono}`)
      .join(',');
    if (!destinatarios) {
      mostrarEstado(estado, 'No hay números de teléfono válidos en tus contactos.', true);
      return;
    }

    const esIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const separador = esIOS ? '&body=' : '?body=';
    window.location.href = `sms:${destinatarios}${separador}${encodeURIComponent(mensaje.value.trim())}`;
  });

  botonCopiar.addEventListener('click', async () => {
    if (!validar()) return;
    try {
      await navigator.clipboard.writeText(mensaje.value.trim());
      mostrarEstado(estado, 'Mensaje copiado.');
    } catch (error) {
      mostrarEstado(estado, `No se pudo copiar el aviso: ${error.message}`, true);
    }
  });

  validar();
}

// Contactos (contactos.html)

function iniciarContactos() {
  const form = document.getElementById('form-contacto');
  if (!form) return;

  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  const lista = document.getElementById('lista-contactos');
  const estado = document.getElementById('contactos-estado');

  function mostrarContactos() {
    const contactos = leerContactos();
    lista.replaceChildren();

    if (contactos.length === 0) {
      estado.textContent = 'Todavía no tienes contactos guardados.';
      return;
    }

    estado.textContent = '';
    contactos.forEach((contacto) => {
      const columna = document.createElement('div');
      columna.className = 'col-12 col-md-6';

      const tarjeta = document.createElement('article');
      tarjeta.className = 'card h-100';

      const cuerpo = document.createElement('div');
      cuerpo.className = 'card-body';

      const titulo = document.createElement('h3');
      titulo.className = 'card-title h6';
      titulo.textContent = contacto.nombre;

      const telefono = document.createElement('p');
      telefono.className = 'card-text text-secondary mb-0';
      telefono.textContent = contacto.telefono;

      cuerpo.append(titulo, telefono);
      tarjeta.append(cuerpo);
      columna.append(tarjeta);
      lista.append(columna);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const nombreValido = nombre.length > 0;
    const telefonoValido = /^9[0-9]{8}$/.test(telefono);

    nombreInput.classList.toggle('is-invalid', !nombreValido);
    telefonoInput.classList.toggle('is-invalid', !telefonoValido);
    if (!nombreValido || !telefonoValido) return;

    try {
      const contactos = leerContactos();
      contactos.push({
        id: `${Date.now()}`,
        nombre,
        telefono
      });
      localStorage.setItem(CLAVE_CONTACTOS, JSON.stringify(contactos));
      form.reset();
      mostrarContactos();
      nombreInput.focus();
    } catch (error) {
      estado.textContent = `No se pudo guardar el contacto: ${error.message}`;
    }
  });

  [nombreInput, telefonoInput].forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
  });

  try {
    mostrarContactos();
  } catch (error) {
    estado.textContent = `No se pudieron cargar los contactos: ${error.message}`;
  }
}

// Plan familiar (plan_familiar.html)

function iniciarPlanFamiliar() {
  const form = document.querySelector('[data-plan-form]');
  if (!form) return;

  const puntoEncuentro = form.querySelector('[data-punto-encuentro]');
  const contenedorTareas = form.querySelector('[data-plan-tareas]');
  const contador = form.querySelector('[data-plan-contador]');
  const botonSinContactos = form.querySelector('[data-plan-sin-contactos]');
  const estado = document.querySelector('[data-plan-status]');

  let contactos = [];
  let planGuardado = null;
  try {
    contactos = leerContactos();
    planGuardado = JSON.parse(localStorage.getItem(CLAVE_PLAN) || 'null');
  } catch (error) {
    mostrarEstado(estado, `No se pudo leer el plan guardado: ${error.message}`, true);
  }

  puntoEncuentro.value = planGuardado?.puntoEncuentro || '';
  const tareasGuardadas = new Map(
    (planGuardado?.tareas || []).map((asignacion) => [asignacion.contactoId, asignacion.tarea])
  );

  if (contactos.length === 0) {
    contenedorTareas.innerHTML = '<p class="text-secondary mb-0">No tienes contactos registrados todavía.</p>';
  } else {
    contenedorTareas.replaceChildren();
  }
  botonSinContactos.hidden = contactos.length > 0;
  contador.textContent = `${contactos.length} ${contactos.length === 1 ? 'contacto' : 'contactos'}`;

  contactos.forEach((contacto, indice) => {
    const contenedor = document.createElement('div');
    contenedor.className = 'mb-3';

    const etiqueta = document.createElement('label');
    etiqueta.className = 'form-label fw-semibold';
    etiqueta.htmlFor = `plan-tarea-${indice}`;
    etiqueta.textContent = contacto.nombre;

    const tarea = document.createElement('input');
    tarea.type = 'text';
    tarea.className = 'form-control';
    tarea.id = `plan-tarea-${indice}`;
    tarea.maxLength = 120;
    tarea.dataset.contactoId = contacto.id;
    tarea.placeholder = 'Ej.: Llevar botiquín';
    tarea.value = tareasGuardadas.get(contacto.id) || '';

    contenedor.append(etiqueta, tarea);
    contenedorTareas.append(contenedor);
  });

  puntoEncuentro.addEventListener('input', () => {
    puntoEncuentro.classList.remove('is-invalid');
    limpiarEstado(estado);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const encuentro = puntoEncuentro.value.trim();
    puntoEncuentro.classList.toggle('is-invalid', !encuentro);
    if (!encuentro) {
      puntoEncuentro.focus();
      mostrarEstado(estado, 'Completa el punto de encuentro antes de guardar.', true);
      return;
    }

    if (!window.confirm('¿Guardar el plan familiar?')) return;

    const tareas = [...contenedorTareas.querySelectorAll('input')].map((input) => ({
      contactoId: input.dataset.contactoId,
      tarea: input.value.trim()
    }));

    try {
      localStorage.setItem(CLAVE_PLAN, JSON.stringify({ puntoEncuentro: encuentro, tareas }));
      mostrarEstado(estado, 'Plan familiar guardado correctamente.');
    } catch (error) {
      mostrarEstado(estado, `No se pudo guardar el plan familiar: ${error.message}`, true);
    }
  });
}

iniciarKit();
iniciarAviso();
iniciarContactos();
iniciarPlanFamiliar();
