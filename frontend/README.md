# CoWorkHub — Frontend

Interfaz HTML5, CSS3 y JavaScript sin framework ni instalación de dependencias.

- `index.html`: estructura de la interfaz.
- `css/styles.css`: estilos.
- `js/app.js`: lógica de pantallas, sesión y peticiones HTTP.
- `js/config.js`: URL base de la API (por defecto `http://localhost:8080`).

Para ejecutar la aplicación completa, sigue `../README.md` y usa Docker Compose desde la carpeta raíz. Spring Boot publica automáticamente estos archivos en `http://localhost:8080/`.

Para editar/visualizar el frontend independientemente, abre esta carpeta en Visual Studio Code e inicia Live Server. El backend debe estar activo y su configuración CORS permite los puertos 5500–5503.
