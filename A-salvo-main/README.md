# A Salvo

Sitio web para avisar a tu familia y contactos que estás bien durante una emergencia, preparar un kit básico y acordar un plan familiar.

Proyecto del curso **Interfaz de Usuario**, Instituto Profesional Virginio Gómez (IPVG), Concepción.
Equipo: **Biobío Studios**.

## Contexto

Después de un sismo u otra emergencia, las llamadas se saturan y las redes pueden fallar. Muchas familias no saben cómo avisar que están bien ni tienen lista la información básica para esos días.

A Salvo busca resolver eso con tres ideas simples:

- **Avisar rápido.** Un botón «Estoy a salvo» abre la app de mensajes del teléfono con el texto y los contactos listos. La persona solo aprieta enviar.
- **Tener todo a mano.** Contactos de emergencia, un checklist del kit basado en las recomendaciones de Senapred para 72 horas y un plan familiar con punto de encuentro.
- **Sin cuentas ni servidor.** Los datos se guardan solo en el navegador del propio dispositivo.

Cliente de referencia (ficticio para el curso): Junta de Vecinos Los Aromos, Chiguayante.

## Integrantes y roles

| Integrante | Rol |
|---|---|
| Sebastián Gatica | Líder / Coordinador · Frontend / Maquetación · Interactividad / JS |
| Cristian Gatica | Diseño UI/UX · Product Owner |
| Carlos Carrasco | Frontend / Maquetación · Interactividad / JS |

## Resumen técnico

- **Tipo de aplicación:** sitio web estático de una sola instancia en el navegador. No tiene backend ni base de datos.
- **Tecnologías:** HTML5, Bootstrap 5.3 (grilla, componentes y modal), JavaScript y localStorage.
- **Almacenamiento:** los contactos, el mensaje, el avance del kit y el plan familiar se guardan en localStorage. Los datos no salen del dispositivo.
- **Envío del aviso:** el botón usa un enlace `sms:` con el texto prellenado. La app de mensajes del teléfono envía el mensaje; el sitio no envía SMS por sí mismo.
- **Datos del kit:** la lista de 14 elementos se carga desde `data/kit.json` con `fetch`.
- **Publicación:** sitio estático, pensado para GitHub Pages.
- **Compatibilidad:** diseño responsive, de 1 columna en celular y 2 en computador, sin scroll horizontal desde 360 px.

## Páginas

| Página | Qué incluye |
|---|---|
| Inicio | Botón «Estoy a salvo», resumen de contactos y avance del kit |
| Mi aviso | Mensaje editable, frases rápidas y botón «Abrir mensajes» (o «Copiar» en computador) |
| Contactos | Lista de contactos con agregar, editar y eliminar, con confirmación antes de borrar |
| Kit | Checklist de 14 elementos en 4 categorías, con barra de avance |
| Plan familiar | Punto de encuentro y tarea asignada a cada contacto |