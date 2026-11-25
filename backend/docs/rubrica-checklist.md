# Checklist de evaluación (derivada del enunciado)

> El archivo oficial `rubrica.md` no venía adjunto al material recibido. Esta lista resume los criterios y requisitos incluidos en el enunciado; no sustituye la rúbrica oficial.


## Criterios y peso
- [ ] Modelo JPA — 20%
- [ ] Reglas de negocio — 30%
- [ ] Arquitectura y calidad del código — 15%
- [ ] Excepciones y códigos HTTP — 10%
- [ ] Seguridad — 15%
- [ ] Swagger, README y pruebas — 10%

## Módulos
- [ ] M01 Spring Boot: DTO records, Optional, streams, inyección por constructor, Actuator.
- [ ] M02 Beans: servicios interfaz/implementación, Clock, PasswordEncoder, @Value, @Primary o @Qualifier, @PostConstruct.
- [ ] M03 JPA: entidades y repositorios.
- [ ] M04 MySQL: relaciones, import.sql, cascade/orphanRemoval, consultas con carga de relaciones.
- [ ] M05 REST: presentación/business/persistence, validación y transacciones.
- [ ] M06 Swagger/OpenAPI: UI, Authorize, documentación y export.
- [ ] M07 Excepciones: advice único, errores con códigos y timestamp.
- [ ] M08 Seguridad: JWT, BCrypt, roles, propietario del recurso, 401/403.

## Reglas de negocio a probar
- [ ] RN-01 No solapamiento; solicitudes simultáneas.
- [ ] RN-02 Duración de 30 min a 8 h, en intervalos de 30 min y mismo día.
- [ ] RN-03 Horario de sede, reserva futura y 1 h de anticipación.
- [ ] RN-04 Sala activa y capacidad.
- [ ] RN-05 Miembro activo.
- [ ] RN-06 Máximo de reservas activas por plan.
- [ ] RN-07 Horas incluidas/excedentes y servicios con precio congelado.
- [ ] RN-08 Cancelación: 24 h sin cargo, 2–24 h 50%, menos de 2 h prohibida.
- [ ] RN-09 Transiciones de estados.
- [ ] RN-10 Servicios solo en PENDING.
- [ ] RN-11 Unicidad de documento/email/username/catálogos.
- [ ] RN-12 No borrar recursos relacionados.
- [ ] RN-13 Permisos por rol.

## Aceptación
La colección de Postman contiene las solicitudes de los escenarios del enunciado. El escenario de concurrencia requiere ejecutar dos solicitudes en paralelo para comprobar realmente el bloqueo; una ejecución secuencial solo verifica que la segunda solicitud detecta el solapamiento.
