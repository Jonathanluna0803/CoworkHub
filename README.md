# CoWorkHub

Sistema académico de gestión de espacios de coworking. Este repositorio reúne en una carpeta el backend Spring Boot, el frontend HTML/CSS/JavaScript y la configuración de MySQL con Docker Compose.

## Estructura

- `backend/`: API Spring Boot, persistencia, seguridad y documentación.
- `frontend/`: interfaz web HTML, CSS y JavaScript.
- `docker-compose.yml`: aplicación y MySQL.
- `.env.example`: plantilla de configuración local sin credenciales.

## Requisitos

Docker Desktop con Compose, virtualización habilitada y puertos 3306 y 8080 disponibles.

## Configuración y ejecución

Copia `.env.example` como `.env` en la carpeta raíz, reemplaza los valores `replace-with-...` por valores fuertes y únicos, y ejecuta `docker compose up --build`. Abre `http://localhost:8080/`; Swagger UI está en `http://localhost:8080/doc/swagger-ui.html`. El archivo `.env` está excluido de Git.

`backend/src/main/resources/import.sql` carga datos sintéticos de demostración. No los uses en un entorno real. Para detener, usa `docker compose down`; `docker compose down -v` también borra los datos locales de MySQL.

## Desarrollo

Abre `backend/` como proyecto Maven en IntelliJ IDEA (Java 21) y `frontend/` en Visual Studio Code. La colección Postman está en `backend/postman/CoWorkHub-14-escenarios.postman_collection.json` y el esquema OpenAPI en `backend/docs/openapi.json`.

La estructura del ZIP y la configuración de Compose fueron inspeccionadas. No se declara compilación Maven ni arranque integral cuando no se pudieron ejecutar en este entorno.
