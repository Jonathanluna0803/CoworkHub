CoWorkHub - Proyecto completo Spring Boot + frontend

PASOS PARA EL DOCENTE
1. Descomprimir CoWorkHub-Completo.zip.
2. Abrir una terminal en la carpeta raíz CoWorkHub-Completo (donde está docker-compose.yml).
3. Ejecutar: docker compose up --build
4. Esperar a que MySQL y Spring Boot estén listos.
5. Abrir la aplicación web: http://localhost:8080/
6. Abrir Swagger: http://localhost:8080/doc/swagger-ui.html
7. Revisar salud: http://localhost:8080/actuator/health

Usuarios de demostración:
- admin / password
- recepcion / password
- ana / password
- luis / password

Para detener: Ctrl+C y docker compose down.
Para borrar también la base de datos: docker compose down -v.

Nota de verificación: la estructura y referencias se validaron estáticamente. La construcción Maven y ejecución Docker deben probarse en un equipo con Docker Desktop y virtualización habilitada, ya que esas herramientas no están instaladas en el entorno de preparación.
