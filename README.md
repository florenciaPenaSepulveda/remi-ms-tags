# Remi Recetas · Servicio de etiquetas

[![CI](https://github.com/florenciaPenaSepulveda/remi-ms-tags/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florenciaPenaSepulveda/remi-ms-tags/actions/workflows/ci.yml)

Microservicio de **Remi Recetas** que guarda las etiquetas (por ejemplo "Vegano" o "Postre") y las asocia a las recetas. No expone HTTP: escucha mensajes en una cola de RabbitMQ y responde al [gateway](https://github.com/florenciaPenaSepulveda/remi-gateway). Hecho con NestJS 11 y Redis.

## Repositorios del sistema

| Repositorio | Función |
|---|---|
| [remi-gateway](https://github.com/florenciaPenaSepulveda/remi-gateway) | API HTTP pública, autenticación y enrutamiento |
| [remi-ms-users](https://github.com/florenciaPenaSepulveda/remi-ms-users) | Usuarios, inicio de sesión y tokens |
| [remi-ms-recetas](https://github.com/florenciaPenaSepulveda/remi-ms-recetas) | Recetas e ingredientes |
| **remi-ms-tags** (este) | Etiquetas de las recetas |
| [remi-ms-socials](https://github.com/florenciaPenaSepulveda/remi-ms-socials) | Me gusta y comentarios |
| [remi-frontend](https://github.com/florenciaPenaSepulveda/remi-frontend) | Aplicación web en React |

## Modelo de datos en Redis

| Clave | Tipo | Contenido |
|---|---|---|
| `tag:{id}` | hash | `id` y `name` de la etiqueta |
| `tags:all` | set | IDs de todas las etiquetas |
| `tag:slug:{nombre}` | string | ID que reserva el nombre (en minúsculas y sin tildes) para que sea único |
| `recipe:{recipeId}:tags` | set | Etiquetas de una receta |
| `tag:{id}:recipes` | set | Recetas de una etiqueta (índice inverso) |

Cada cambio que toca varias claves se hace en una transacción (`MULTI`), así el índice inverso nunca queda desfasado, y las consultas por etiqueta usan ese índice en lugar de recorrer todas las claves. No necesita módulos de Redis: sirve un Redis estándar.

## Mensajes que atiende

| Patrón | Datos | Respuesta |
|---|---|---|
| `create_tag` | `name` | Etiqueta (409 si el nombre ya existe) |
| `get_all_tags` | — | Etiquetas ordenadas por nombre |
| `find_tag_by_id` | `id` | Etiqueta o 404 |
| `find_tags_by_name` | `name` | Etiquetas cuyo nombre contiene el texto |
| `update_tag` | `id`, `updateTagDto` | Etiqueta renombrada |
| `delete_tag` | `id` | La quita de todas las recetas |
| `add_tags_to_recipe` | `recipeId`, `tagIds` | IDs de etiquetas de la receta |
| `set_recipe_tags` | `recipeId`, `tagIds` | Reemplaza el conjunto completo |
| `remove_tag_from_recipe` | `recipeId`, `tagId` | IDs restantes |
| `remove_all_tags_from_recipe` | `recipeId` | `{ recipeId, tagsRemoved }` |
| `get_recipe_tags` / `get_recipe_tag_ids` | `recipeId` | Etiquetas completas / solo IDs |
| `get_tags_of_recipes` | `recipeIds` | Mapa receta → etiquetas, en una sola consulta |
| `get_recipes_by_tag` | `tagId` | IDs de recetas |
| `recipe_has_tag` | `recipeId`, `tagId` | `true` o `false` |

Los nombres se limpian (espacios repetidos) y no se distinguen mayúsculas ni tildes: "Rápido" y "rapido" son la misma etiqueta. Solo se pueden asociar etiquetas que existan. Los errores viajan como `{ status, message }` y el gateway los convierte en respuestas HTTP.

## Requisitos

- Node.js 24 (ver `.nvmrc`).
- Redis y RabbitMQ. El `docker-compose.yml` del gateway los levanta.

## Puesta en marcha

```bash
cp .env.example .env
npm ci
npm run start:dev
```

| Variable | Descripción | Por defecto |
|---|---|---|
| `REDIS_URL` | Conexión a Redis | `redis://localhost:6379` |
| `AMQP_URI` | Conexión a RabbitMQ | `amqp://localhost:5672` |
| `TAGS_QUEUE` | Cola que escucha | `tags_queue` |

## Pruebas

```bash
npm test
npm run test:cov
npm run lint
```

Las pruebas levantan el servicio completo (validación y errores incluidos) sobre transporte TCP y lo consultan como lo haría el gateway; necesitan un Redis en `REDIS_URL` (por defecto `redis://localhost:6380/15`, la base 15) y la vacían antes de cada prueba, así que no la apuntes a una base con datos. El CI ejecuta lint, compilación y pruebas con cobertura.

## Docker

```bash
docker build -t remi-ms-tags .
docker run --env-file .env remi-ms-tags
```

## Autoría

Proyecto desarrollado en equipo durante la carrera. Esta copia forma parte del portafolio de [Florencia Peña Sepúlveda](https://github.com/florenciaPenaSepulveda), que la revisó, corrigió y documentó.
