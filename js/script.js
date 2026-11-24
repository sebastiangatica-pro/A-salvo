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
    console.error(error);
    mostrarEstado(estado, 'No se pudo cargar el kit.', true);
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
  const esCelular = window.matchMedia('(pointer: coarse)').matches
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (esCelular) {
    botonSms.classList.replace('btn-outline-primary', 'btn-primary');
    botonCopiar.classList.replace('btn-primary', 'btn-outline-primary');
  } else {
    botonCopiar.classList.replace('btn-outline-primary', 'btn-primary');
    botonSms.classList.replace('btn-primary', 'btn-outline-primary');
  }

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
      const mensajeActual = mensaje.value.trim();
      const separador = mensajeActual ? ' ' : '';
      const mensajeNuevo = `${mensajeActual}${separador}${boton.dataset.avisoFrase}`;

      if (mensajeNuevo.length > AVISO_LARGO_MAXIMO) {
        mostrarEstado(estado, `No se agregó la frase: el mensaje no puede superar ${AVISO_LARGO_MAXIMO} caracteres.`, true);
        return;
      }

      mensaje.value = mensajeNuevo;
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

    const contactosQueReciben = contactos.filter((contacto) => contacto.recibeAvisos !== false);

    if (contactosQueReciben.length === 0) {
      mostrarEstado(estado, contactos.length === 0
        ? 'Primero agrega contactos: '
        : 'Ningún contacto está marcado para recibir avisos. Revisa Contactos: ', true);
      const enlace = document.createElement('a');
      enlace.href = 'contactos.html';
      enlace.textContent = 'Ir a Contactos';
      enlace.className = 'link-danger';
      estado.append(enlace);
      return;
    }

    const destinatarios = contactosQueReciben
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
  const errorTelefono = document.getElementById('error-telefono');
  const relacionInput = document.getElementById('relacion');
  const recibeAvisosInput = document.getElementById('recibe-avisos');
  const tituloFormulario = document.getElementById('agregar-contacto-titulo');
  const botonGuardar = document.getElementById('guardar-contacto');
  const botonCancelar = document.getElementById('cancelar-edicion');
  const lista = document.getElementById('lista-contactos');
  const estado = document.getElementById('contactos-estado');
  const modalEliminar = document.getElementById('modal-eliminar-contacto');
  const tituloModalEliminar = document.getElementById('modal-eliminar-titulo');
  const estadoModalEliminar = modalEliminar.querySelector('[data-eliminar-estado]');
  const botonConfirmarEliminar = modalEliminar.querySelector('[data-confirmar-eliminar]');
  const instanciaModalEliminar = bootstrap.Modal.getOrCreateInstance(modalEliminar);
  let idEnEdicion = null;
  let contactoAEliminar = null;
  let enfocarListaTrasEliminar = false;
  let botonQueAbrioModal = null;

  function cancelarEdicion() {
    idEnEdicion = null;
    form.reset();
    nombreInput.classList.remove('is-invalid');
    telefonoInput.classList.remove('is-invalid');
    tituloFormulario.textContent = 'Agregar contacto';
    botonGuardar.textContent = 'Guardar contacto';
    botonCancelar.hidden = true;
  }

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
      columna.className = 'col-12 col-md-6 col-lg-12 col-xl-6';

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

      if (contacto.relacion) {
        const relacion = document.createElement('p');
        relacion.className = 'card-text mb-0';
        relacion.textContent = `Relación: ${contacto.relacion}`;
        cuerpo.append(relacion);
      }

      const recibeAvisos = document.createElement('p');
      recibeAvisos.className = 'card-text mb-0';
      recibeAvisos.textContent = `Recibe avisos: ${contacto.recibeAvisos === false ? 'No' : 'Sí'}`;
      cuerpo.append(recibeAvisos);

      const acciones = document.createElement('div');
      acciones.className = 'd-flex flex-wrap gap-2 mt-3';

      const botonEditar = document.createElement('button');
      botonEditar.type = 'button';
      botonEditar.className = 'btn btn-outline-primary contacto-accion';
      botonEditar.dataset.accion = 'editar';
      botonEditar.dataset.contactoId = contacto.id;
      botonEditar.setAttribute('aria-label', `Editar a ${contacto.nombre}`);
      botonEditar.textContent = 'Editar';

      const botonEliminar = document.createElement('button');
      botonEliminar.type = 'button';
      botonEliminar.className = 'btn btn-outline-danger contacto-accion';
      botonEliminar.dataset.accion = 'eliminar';
      botonEliminar.dataset.contactoId = contacto.id;
      botonEliminar.setAttribute('aria-label', `Eliminar a ${contacto.nombre}`);
      botonEliminar.textContent = 'Eliminar';

      acciones.append(botonEditar, botonEliminar);
      cuerpo.append(acciones);
      tarjeta.append(cuerpo);
      columna.append(tarjeta);
      lista.append(columna);
    });
  }

  function editarContacto(contacto) {
    idEnEdicion = contacto.id;
    nombreInput.value = contacto.nombre || '';
    telefonoInput.value = contacto.telefono || '';
    relacionInput.value = contacto.relacion || '';
    recibeAvisosInput.checked = contacto.recibeAvisos !== false;
    tituloFormulario.textContent = 'Editar contacto';
    botonGuardar.textContent = 'Guardar cambios';
    botonCancelar.hidden = false;
    nombreInput.focus();
  }

  lista.addEventListener('click', (event) => {
    const boton = event.target.closest('button[data-accion]');
    if (!boton || !lista.contains(boton)) return;

    try {
      const contacto = leerContactos().find((item) => item.id === boton.dataset.contactoId);
      if (!contacto) {
        mostrarEstado(estado, 'No se encontró el contacto seleccionado.', true);
        return;
      }

      if (boton.dataset.accion === 'editar') {
        editarContacto(contacto);
        limpiarEstado(estado);
        return;
      }

      contactoAEliminar = contacto;
      botonQueAbrioModal = boton;
      estadoModalEliminar.textContent = '';
      tituloModalEliminar.textContent = `¿Eliminar a ${contacto.nombre}?`;
      instanciaModalEliminar.show(boton);
    } catch (error) {
      mostrarEstado(estado, `No se pudo abrir la acción del contacto: ${error.message}`, true);
    }
  });

  botonCancelar.addEventListener('click', cancelarEdicion);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const relacion = relacionInput.value.trim();
    const nombreValido = nombre.length > 0;
    const telefonoValido = /^9[0-9]{8}$/.test(telefono);

    nombreInput.classList.toggle('is-invalid', !nombreValido);
    telefonoInput.classList.toggle('is-invalid', !telefonoValido);
    errorTelefono.textContent = telefono
      ? 'Número telefónico inválido'
      : 'Ingresa el número telefónico.';
    if (!nombreValido || !telefonoValido) {
      (nombreValido ? telefonoInput : nombreInput).focus();
      return;
    }

    try {
      const estabaEditando = idEnEdicion !== null;
      const contactos = leerContactos();
      const contacto = {
        id: idEnEdicion || `${Date.now()}`,
        nombre,
        telefono,
        relacion,
        recibeAvisos: recibeAvisosInput.checked
      };
      if (idEnEdicion) {
        const indice = contactos.findIndex((item) => item.id === idEnEdicion);
        if (indice === -1) {
          throw new Error('El contacto que intentas editar ya no existe.');
        }
        contactos[indice] = { ...contactos[indice], ...contacto };
      } else {
        contactos.push(contacto);
      }
      localStorage.setItem(CLAVE_CONTACTOS, JSON.stringify(contactos));
      cancelarEdicion();
      mostrarContactos();
      mostrarEstado(estado, estabaEditando ? 'Contacto actualizado.' : 'Contacto guardado.');
      if (!estabaEditando) nombreInput.focus();
    } catch (error) {
      mostrarEstado(estado, `No se pudo guardar el contacto: ${error.message}`, true);
    }
  });

  botonConfirmarEliminar.addEventListener('click', () => {
    if (!contactoAEliminar) return;

    let planAnterior = null;
    let planActualizado = false;
    try {
      const contactos = leerContactos();
      const restantes = contactos.filter((contacto) => contacto.id !== contactoAEliminar.id);
      if (restantes.length === contactos.length) {
        throw new Error('El contacto seleccionado ya no existe.');
      }

      planAnterior = localStorage.getItem(CLAVE_PLAN);
      if (planAnterior !== null) {
        const plan = JSON.parse(planAnterior);
        if (plan && typeof plan === 'object' && !Array.isArray(plan) && Array.isArray(plan.tareas)) {
          const tareas = plan.tareas.filter((tarea) => tarea.contactoId !== contactoAEliminar.id);
          if (tareas.length !== plan.tareas.length) {
            plan.tareas = tareas;
            localStorage.setItem(CLAVE_PLAN, JSON.stringify(plan));
            planActualizado = true;
          }
        }
      }

      try {
        localStorage.setItem(CLAVE_CONTACTOS, JSON.stringify(restantes));
      } catch (error) {
        if (planActualizado) {
          try {
            localStorage.setItem(CLAVE_PLAN, planAnterior);
          } catch (errorRestauracion) {
            throw new Error(`${error.message} Tampoco se pudo restaurar el plan: ${errorRestauracion.message}`);
          }
        }
        throw error;
      }

      if (idEnEdicion === contactoAEliminar.id) cancelarEdicion();
      contactoAEliminar = null;
      enfocarListaTrasEliminar = true;
      instanciaModalEliminar.hide();
      mostrarContactos();
      mostrarEstado(estado, 'Contacto eliminado.');
    } catch (error) {
      estadoModalEliminar.textContent = `No se pudo eliminar el contacto: ${error.message}`;
    }
  });

  modalEliminar.addEventListener('hidden.bs.modal', () => {
    contactoAEliminar = null;
    if (enfocarListaTrasEliminar) {
      enfocarListaTrasEliminar = false;
      lista.focus();
    } else if (botonQueAbrioModal && botonQueAbrioModal.isConnected) {
      // Cancelar/cerrar: el foco vuelve al botón "Eliminar" que abrió el modal
      botonQueAbrioModal.focus();
    }
    botonQueAbrioModal = null;
  });

  [nombreInput, relacionInput].forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
  });

  telefonoInput.addEventListener('input', () => {
    const telefono = telefonoInput.value.trim();
    const esInvalido = telefono.length > 0 && !/^9[0-9]{8}$/.test(telefono);
    telefonoInput.setCustomValidity(esInvalido ? 'Número telefónico inválido' : '');
    errorTelefono.textContent = telefono.length > 0
      ? 'Número telefónico inválido'
      : 'Ingresa el número telefónico.';
    if (telefonoInput.validity.valid) telefonoInput.classList.remove('is-invalid');
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

    const tarea = document.createElement('select');
    tarea.className = 'form-select';
    tarea.id = `plan-tarea-${indice}`;
    tarea.dataset.contactoId = contacto.id;
    const opciones = [
      ['', 'Sin tarea'],
      ['Lleva el kit', 'Lleva el kit'],
      ['Busca a los niños', 'Busca a los niños'],
      ['Busca a la abuela/o', 'Busca a la abuela/o'],
      ['Cierra gas y luz', 'Cierra gas y luz'],
      ['otra', 'Otra…']
    ];
    const tareaGuardada = tareasGuardadas.get(contacto.id) || '';
    const tareaEsOtra = tareaGuardada !== '' && !opciones.some(([valor]) => valor === tareaGuardada);
    opciones.forEach(([valor, texto]) => {
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = texto;
      tarea.append(opcion);
    });
    tarea.value = tareaEsOtra ? 'otra' : tareaGuardada;

    const tareaOtra = document.createElement('input');
    tareaOtra.type = 'text';
    tareaOtra.className = 'form-control mt-2';
    tareaOtra.maxLength = 120;
    tareaOtra.placeholder = 'Escribe la otra tarea';
    tareaOtra.dataset.tareaOtra = '';
    tareaOtra.value = tareaEsOtra ? tareaGuardada : '';
    tareaOtra.hidden = !tareaEsOtra;
    tarea.addEventListener('change', () => {
      tareaOtra.hidden = tarea.value !== 'otra';
      if (!tareaOtra.hidden) tareaOtra.focus();
    });

    contenedor.append(etiqueta, tarea, tareaOtra);
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

    const tareas = [...contenedorTareas.querySelectorAll('select[data-contacto-id]')].map((select) => {
      const tareaOtra = select.parentElement.querySelector('[data-tarea-otra]');
      return {
        contactoId: select.dataset.contactoId,
        tarea: select.value === 'otra' ? tareaOtra.value.trim() : select.value
      };
    });

    try {
      localStorage.setItem(CLAVE_PLAN, JSON.stringify({ puntoEncuentro: encuentro, tareas }));
      mostrarEstado(estado, 'Plan familiar guardado.');
    } catch (error) {
      mostrarEstado(estado, `No se pudo guardar el plan familiar: ${error.message}`, true);
    }
  });
}

// Resumen de contactos (index.html)

function iniciarResumenContactos() {
  const seccion = document.querySelector('[data-contactos-resumen]');
  if (!seccion) return;

  const conteo = seccion.querySelector('[data-contactos-count]');
  const nombres = seccion.querySelector('[data-contactos-nombres]');
  const enlace = seccion.querySelector('[data-contactos-enlace]');
  const estado = seccion.querySelector('[data-contactos-status]');

  let contactos;
  try {
    contactos = leerContactos();
  } catch (error) {
    mostrarEstado(estado, `No se pudieron cargar los contactos: ${error.message}`, true);
    return;
  }

  const contactosQueReciben = contactos.filter((contacto) => contacto.recibeAvisos !== false);
  const total = contactosQueReciben.length;
  conteo.textContent = `${total} ${total === 1 ? 'contacto' : 'contactos'}`;

  if (total === 0) {
    nombres.textContent = contactos.length === 0
      ? 'Agrega tu primer contacto.'
      : 'Ningún contacto recibe avisos.';
    enlace.textContent = 'Agregar';
    enlace.setAttribute('aria-label', 'Agregar contactos');
    return;
  }

  const primeros = contactosQueReciben.slice(0, 2).map((contacto) => contacto.nombre);
  const restantes = total - primeros.length;
  nombres.textContent = restantes > 0
    ? `${primeros.join(', ')} y ${restantes} más`
    : primeros.join(' y ');
  enlace.textContent = 'Editar';
  enlace.setAttribute('aria-label', 'Editar contactos');
}

iniciarKit();
iniciarAviso();
iniciarResumenContactos();
iniciarContactos();
iniciarPlanFamiliar();
