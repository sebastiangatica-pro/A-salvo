const KIT_STORAGE_KEY = 'a-salvo-kit-completados';

async function initializeKit() {
  const checklist = document.querySelector('[data-kit-checklist]');
  const progressSections = [...document.querySelectorAll('[data-kit-progress]')];
  if (!checklist && progressSections.length === 0) return;

  const status = document.querySelector('[data-kit-status]');
  const showError = (message) => {
    if (status) {
      status.textContent = message;
      status.classList.remove('visually-hidden');
      status.classList.add('alert', 'alert-danger');
    }
  };
  const clearStatus = () => {
    if (status) {
      status.textContent = '';
      status.classList.add('visually-hidden');
      status.classList.remove('alert', 'alert-danger');
    }
  };

  try {
    const response = await fetch('data/kit.json');
    if (!response.ok) {
      throw new Error(`No se pudo cargar data/kit.json (${response.status}).`);
    }

    const items = await response.json();
    if (
      !Array.isArray(items)
      || items.length !== 14
      || items.some((item) => !item.id || !item.nombre || !item.categoria)
      || new Set(items.map((item) => item.id)).size !== items.length
    ) {
      throw new Error('El archivo data/kit.json no contiene las 14 tareas esperadas.');
    }
    const categories = [...new Set(items.map((item) => item.categoria))];
    if (categories.length !== 4) {
      throw new Error('El archivo data/kit.json debe contener exactamente 4 categorías.');
    }

    const storedItems = JSON.parse(localStorage.getItem(KIT_STORAGE_KEY) || '[]');
    if (!Array.isArray(storedItems)) {
      throw new Error('El avance guardado del kit no tiene un formato válido.');
    }
    const validIds = new Set(items.map((item) => item.id));
    const completedItems = new Set(storedItems.filter((id) => validIds.has(id)));

    const updateProgress = () => {
      const completed = completedItems.size;
      const percentage = Math.round((completed / items.length) * 100);
      progressSections.forEach((section) => {
        section.querySelector('[data-kit-count]').textContent = `${completed} de ${items.length}`;
        const progress = section.querySelector('[role="progressbar"]');
        const bar = section.querySelector('[data-kit-bar]');
        progress.setAttribute('aria-valuemax', items.length);
        progress.setAttribute('aria-valuenow', completed);
        bar.style.width = `${percentage}%`;
      });
    };

    if (checklist) {
      categories.forEach((category, categoryIndex) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';

        const heading = document.createElement('h2');
        heading.className = 'accordion-header';
        heading.id = `kit-heading-${categoryIndex}`;

        const toggle = document.createElement('button');
        toggle.className = 'accordion-button collapsed';
        toggle.type = 'button';
        toggle.dataset.bsToggle = 'collapse';
        toggle.dataset.bsTarget = `#kit-category-${categoryIndex}`;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', `kit-category-${categoryIndex}`);
        toggle.textContent = category;
        heading.append(toggle);

        const panel = document.createElement('div');
        panel.id = `kit-category-${categoryIndex}`;
        panel.className = 'accordion-collapse collapse';
        panel.setAttribute('aria-labelledby', heading.id);
        panel.dataset.bsParent = '#kit-accordion';

        const body = document.createElement('div');
        body.className = 'accordion-body';
        items.filter((kitItem) => kitItem.categoria === category).forEach((kitItem) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'form-check mb-3';

          const checkbox = document.createElement('input');
          checkbox.className = 'form-check-input';
          checkbox.type = 'checkbox';
          checkbox.id = `kit-item-${kitItem.id}`;
          checkbox.checked = completedItems.has(kitItem.id);
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              completedItems.add(kitItem.id);
            } else {
              completedItems.delete(kitItem.id);
            }
            updateProgress();
            try {
              localStorage.setItem(KIT_STORAGE_KEY, JSON.stringify([...completedItems]));
              clearStatus();
            } catch (error) {
              showError(`No se pudo guardar el avance del kit: ${error.message}`);
            }
          });

          const label = document.createElement('label');
          label.className = 'form-check-label fw-semibold';
          label.htmlFor = checkbox.id;
          label.textContent = kitItem.nombre;
          wrapper.append(checkbox, label);
          body.append(wrapper);
        });

        panel.append(body);
        item.append(heading, panel);
        checklist.append(item);
      });
    }

    updateProgress();
  } catch (error) {
    const hint = window.location.protocol === 'file:'
      ? ' Abre el proyecto con Live Server o desde GitHub Pages; fetch no funciona al abrir el HTML con doble clic.'
      : '';
    showError(`No se pudo mostrar el kit. ${error.message}.${hint}`);
  }
}

initializeKit();

const AVISO_STORAGE_KEY = 'a-salvo-aviso-mensaje';
const AVISO_STORAGE_ALIASES = ['a-salvo-aviso', 'a-salvo-mensaje'];
const AVISO_DEFAULT = 'Estoy a salvo. Estoy bien y en un lugar seguro.';
const AVISO_MAX_LENGTH = 160;

function initializeAviso() {
  const page = document.querySelector('[data-aviso-mensaje]');
  if (!page) return;

  const message = page;
  const counter = document.querySelector('[data-aviso-contador]');
  const validation = document.querySelector('[data-aviso-validacion]');
  const action = document.querySelector('[data-aviso-accion]');
  const status = document.querySelector('[data-aviso-status]');
  const quickPhrases = [...document.querySelectorAll('[data-aviso-frase]')];

  let savedMessage = '';
  try {
    savedMessage = localStorage.getItem(AVISO_STORAGE_KEY)
      || AVISO_STORAGE_ALIASES.map((key) => localStorage.getItem(key)).find(Boolean)
      || '';
  } catch (error) {
    showAvisoStatus(`No se pudo leer el aviso guardado: ${error.message}`, true);
  }
  message.value = savedMessage.slice(0, AVISO_MAX_LENGTH) || AVISO_DEFAULT;

  const isMobile = navigator.userAgent.includes('Mobi')
    || navigator.userAgent.includes('Android')
    || navigator.userAgent.includes('iPhone');
  action.textContent = isMobile ? 'Abrir mensajes' : 'Copiar aviso';

  function showAvisoStatus(text, isError = false) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove('visually-hidden');
    status.classList.toggle('text-danger', isError);
    status.classList.toggle('text-success', !isError);
  }

  function clearAvisoStatus() {
    if (!status) return;
    status.textContent = '';
    status.classList.add('visually-hidden');
    status.classList.remove('text-danger', 'text-success');
  }

  function validate() {
    const text = message.value.trim();
    const valid = text.length > 0;
    if (counter) counter.textContent = `${message.value.length} / ${AVISO_MAX_LENGTH}`;
    message.classList.toggle('is-invalid', !valid);
    message.classList.toggle('is-valid', valid);

    if (validation) {
      validation.textContent = valid ? 'Mensaje listo para compartir.' : 'El mensaje no puede estar vacío.';
      validation.classList.toggle('text-danger', !valid);
      validation.classList.toggle('text-success', valid);
    }
    if (action) action.disabled = !valid;
    return valid;
  }

  message.addEventListener('input', () => {
    validate();
    clearAvisoStatus();
    try {
      localStorage.setItem(AVISO_STORAGE_KEY, message.value);
      AVISO_STORAGE_ALIASES.forEach((key) => localStorage.setItem(key, message.value));
    } catch (error) {
      showAvisoStatus(`No se pudo guardar el aviso: ${error.message}`, true);
    }
  });

  quickPhrases.forEach((button) => {
    button.addEventListener('click', () => {
      message.value = button.dataset.avisoFrase;
      validate();
      message.dispatchEvent(new Event('input'));
      message.focus();
    });
  });

  action.addEventListener('click', async () => {
    if (!validate()) return;
    const text = message.value.trim();

    if (isMobile) {
      let recipients = '';
      try {
        const contacts = JSON.parse(localStorage.getItem('a-salvo-contactos') || '[]');
        if (Array.isArray(contacts)) {
          recipients = contacts
            .map((contact) => contact.telefono || contact.phone || contact.numero || '')
            .filter(Boolean)
            .join(',');
        }
      } catch (error) {
        showAvisoStatus(`No se pudieron cargar los contactos: ${error.message}`, true);
      }
      window.location.href = `sms:${recipients}?body=${encodeURIComponent(text)}`;
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showAvisoStatus('Aviso copiado al portapapeles.');
    } catch (error) {
      showAvisoStatus(`No se pudo copiar el aviso: ${error.message}`, true);
    }
  });

  validate();
}

initializeAviso();

const PLAN_STORAGE_KEY = 'a-salvo-plan-familiar';
const PLAN_STORAGE_ALIASES = ['a-salvo-plan'];
const CONTACTOS_STORAGE_KEY = 'a-salvo-contactos';

function initializePlanFamiliar() {
  const form = document.querySelector('[data-plan-form]');
  if (!form) return;

  const meetingInput = form.querySelector('[data-punto-encuentro]');
  const tasksContainer = form.querySelector('[data-plan-tareas]');
  const counter = form.querySelector('[data-plan-contador]');
  const noContactsButton = form.querySelector('[data-plan-sin-contactos]');
  const status = document.querySelector('[data-plan-status]');

  let contacts = [];
  let savedPlan = null;

  try {
    const storedContacts = JSON.parse(localStorage.getItem(CONTACTOS_STORAGE_KEY) || '[]');
    if (Array.isArray(storedContacts)) contacts = storedContacts;

    const storedPlan = JSON.parse(
      localStorage.getItem(PLAN_STORAGE_KEY)
        || PLAN_STORAGE_ALIASES.map((key) => localStorage.getItem(key)).find(Boolean)
        || 'null'
    );
    if (storedPlan && typeof storedPlan === 'object') savedPlan = storedPlan;
  } catch (error) {
    showPlanStatus(`No se pudo leer el plan guardado: ${error.message}`, true);
  }

  meetingInput.value = savedPlan?.puntoEncuentro
    || savedPlan?.encuentro
    || '';

  function showPlanStatus(text, isError = false) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove('visually-hidden');
    status.classList.toggle('text-danger', isError);
    status.classList.toggle('text-success', !isError);
  }

  function clearPlanStatus() {
    if (!status) return;
    status.textContent = '';
    status.classList.add('visually-hidden');
    status.classList.remove('text-danger', 'text-success');
  }

  const savedTasks = new Map(
    ((savedPlan?.tareas || savedPlan?.tasks || [])).map((assignment) => [
      String(assignment.contactoId || assignment.id || assignment.nombre || ''),
      assignment.tarea || assignment.task || ''
    ])
  );

  tasksContainer.replaceChildren();
  if (contacts.length === 0) {
    tasksContainer.innerHTML = '<p class="text-secondary mb-0">No tienes contactos registrados todavía.</p>';
    noContactsButton.hidden = false;
  } else {
    noContactsButton.hidden = true;
  }

  counter.textContent = `${contacts.length} ${contacts.length === 1 ? 'contacto' : 'contactos'}`;

  contacts.forEach((contact, index) => {
    const name = contact.nombre || contact.name || `Contacto ${index + 1}`;
    const id = String(contact.id || contact.nombre || contact.name || `contacto-${index}`);
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-3';

    const label = document.createElement('label');
    label.className = 'form-label fw-semibold';
    label.htmlFor = `plan-tarea-${index}`;
    label.textContent = name;

    const taskInput = document.createElement('input');
    taskInput.type = 'text';
    taskInput.className = 'form-control';
    taskInput.id = `plan-tarea-${index}`;
    taskInput.maxLength = 120;
    taskInput.dataset.contactoId = id;
    taskInput.dataset.planTarea = '';
    taskInput.placeholder = 'Ej.: Llevar botiquín';
    taskInput.value = savedTasks.get(id) || '';

    wrapper.append(label, taskInput);
    tasksContainer.append(wrapper);
  });

  meetingInput.addEventListener('input', () => {
    meetingInput.classList.remove('is-invalid');
    clearPlanStatus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const meeting = meetingInput.value.trim();
    meetingInput.classList.toggle('is-invalid', !meeting);
    if (!meeting) {
      meetingInput.focus();
      showPlanStatus('Completa el punto de encuentro antes de guardar.', true);
      return;
    }

    if (!window.confirm('¿Guardar el plan familiar?')) return;

    const tareas = [...form.querySelectorAll('[data-plan-tarea]')].map((input) => {
      const contact = contacts.find((item, index) => {
        const id = String(item.id || item.nombre || item.name || `contacto-${index}`);
        return id === input.dataset.contactoId;
      });
      return {
        contactoId: input.dataset.contactoId,
        nombre: contact?.nombre || contact?.name || '',
        tarea: input.value.trim()
      };
    });

    const plan = {
      puntoEncuentro: meeting,
      tareas
    };

    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
      PLAN_STORAGE_ALIASES.forEach((key) => localStorage.setItem(key, JSON.stringify(plan)));
      showPlanStatus('Plan familiar guardado correctamente.');
    } catch (error) {
      showPlanStatus(`No se pudo guardar el plan familiar: ${error.message}`, true);
    }
  });
}

initializePlanFamiliar();