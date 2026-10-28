import { INestMicroservice } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';
import { REDIS } from './redis/redis.module';

const PUERTO = 4873;
const RECETA_A = '507f1f77bcf86cd799439011';
const RECETA_B = '507f1f77bcf86cd799439012';
const UUID_AJENO = '3f8a4a52-6d6c-4b1e-9f0e-5a3c8f2b7d11';

describe('Servicio de etiquetas', () => {
  let app: INestMicroservice;
  let cliente: ClientProxy;
  let redis: Redis;

  const enviar = <T = any>(cmd: string, datos: unknown = {}) =>
    firstValueFrom(cliente.send<T>({ cmd }, datos));
  const fallo = async (cmd: string, datos: unknown = {}) => {
    try {
      await enviar(cmd, datos);
    } catch (error) {
      return error as { status: number; message: string | string[] };
    }
    throw new Error('Se esperaba un error');
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarApp(
      modulo.createNestMicroservice({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: PUERTO },
      }),
    );
    await app.listen();
    cliente = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PUERTO },
    });
    await cliente.connect();
    redis = app.get<Redis>(REDIS);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.flushdb();
    cliente.close();
    await app.close();
  });

  describe('etiquetas', () => {
    it('crea una etiqueta y la consulta por ID', async () => {
      const creada = await enviar('create_tag', { name: '  Sin   gluten ' });
      expect(creada).toEqual({ id: expect.any(String), name: 'Sin gluten' });
      expect(await enviar('find_tag_by_id', creada.id)).toEqual(creada);
    });

    it('rechaza nombres repetidos sin distinguir mayúsculas ni tildes', async () => {
      await enviar('create_tag', { name: 'Rápido' });
      expect((await fallo('create_tag', { name: 'rapido' })).status).toBe(409);
      expect((await fallo('create_tag', { name: 'RÁPIDO' })).status).toBe(409);
    });

    it('valida el nombre', async () => {
      expect((await fallo('create_tag', { name: '   ' })).status).toBe(400);
      expect((await fallo('create_tag', { name: 'x'.repeat(31) })).status).toBe(
        400,
      );
      expect((await fallo('create_tag', { name: 'ok', extra: 1 })).status).toBe(
        400,
      );
    });

    it('lista ordenadas por nombre, vacío sin error', async () => {
      expect(await enviar('get_all_tags')).toEqual([]);
      await enviar('create_tag', { name: 'Postre' });
      await enviar('create_tag', { name: 'Almuerzo' });
      const lista = await enviar<any[]>('get_all_tags');
      expect(lista.map((t) => t.name as string)).toEqual([
        'Almuerzo',
        'Postre',
      ]);
    });

    it('busca por parte del nombre', async () => {
      await enviar('create_tag', { name: 'Vegetariano' });
      await enviar('create_tag', { name: 'Vegano' });
      await enviar('create_tag', { name: 'Postre' });
      const lista = await enviar<any[]>('find_tags_by_name', { name: 'VEG' });
      expect(lista.map((t) => t.name as string)).toEqual([
        'Vegano',
        'Vegetariano',
      ]);
      expect(await enviar('find_tags_by_name', { name: 'zzz' })).toEqual([]);
    });

    it('informa una etiqueta inexistente con 404', async () => {
      expect((await fallo('find_tag_by_id', UUID_AJENO)).status).toBe(404);
      expect((await fallo('delete_tag', UUID_AJENO)).status).toBe(404);
    });

    it('renombra y libera el nombre anterior', async () => {
      const creada = await enviar('create_tag', { name: 'Fácil' });
      const cambiada = await enviar('update_tag', {
        id: creada.id,
        updateTagDto: { name: 'Sencillo' },
      });
      expect(cambiada.name).toBe('Sencillo');
      expect((await enviar('create_tag', { name: 'Fácil' })).id).not.toBe(
        creada.id,
      );
    });

    it('no renombra a un nombre ocupado', async () => {
      await enviar('create_tag', { name: 'Postre' });
      const otra = await enviar('create_tag', { name: 'Dulce' });
      const error = await fallo('update_tag', {
        id: otra.id,
        updateTagDto: { name: 'postre' },
      });
      expect(error.status).toBe(409);
    });

    it('permite cambiar solo mayúsculas del propio nombre', async () => {
      const creada = await enviar('create_tag', { name: 'postre' });
      const cambiada = await enviar('update_tag', {
        id: creada.id,
        updateTagDto: { name: 'Postre' },
      });
      expect(cambiada.name).toBe('Postre');
    });
  });

  describe('etiquetas de una receta', () => {
    let rapido: { id: string };
    let postre: { id: string };

    beforeEach(async () => {
      rapido = await enviar('create_tag', { name: 'Rápido' });
      postre = await enviar('create_tag', { name: 'Postre' });
    });

    it('agrega etiquetas y las consulta con su nombre', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id, postre.id, rapido.id],
      });
      const etiquetas = await enviar<any[]>('get_recipe_tags', RECETA_A);
      expect(etiquetas.map((t) => t.name as string)).toEqual([
        'Postre',
        'Rápido',
      ]);
      expect(
        (await enviar<string[]>('get_recipe_tag_ids', RECETA_A)).sort(),
      ).toEqual([rapido.id, postre.id].sort());
    });

    it('no agrega etiquetas que no existen', async () => {
      const error = await fallo('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id, UUID_AJENO],
      });
      expect(error.status).toBe(404);
      expect(await enviar('get_recipe_tag_ids', RECETA_A)).toEqual([]);
    });

    it('valida los identificadores', async () => {
      expect(
        (
          await fallo('add_tags_to_recipe', {
            recipeId: 'x',
            tagIds: [rapido.id],
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await fallo('add_tags_to_recipe', {
            recipeId: RECETA_A,
            tagIds: ['no-uuid'],
          })
        ).status,
      ).toBe(400);
    });

    it('reemplaza el conjunto completo con set_recipe_tags', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id],
      });
      await enviar('set_recipe_tags', {
        recipeId: RECETA_A,
        tagIds: [postre.id],
      });
      expect(await enviar('get_recipe_tag_ids', RECETA_A)).toEqual([postre.id]);
      expect(await enviar('get_recipes_by_tag', rapido.id)).toEqual([]);
      expect(await enviar('get_recipes_by_tag', postre.id)).toEqual([RECETA_A]);
    });

    it('quita una etiqueta o todas', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id, postre.id],
      });
      await enviar('remove_tag_from_recipe', {
        recipeId: RECETA_A,
        tagId: rapido.id,
      });
      expect(await enviar('get_recipe_tag_ids', RECETA_A)).toEqual([postre.id]);
      const resultado = await enviar('remove_all_tags_from_recipe', RECETA_A);
      expect(resultado).toEqual({ recipeId: RECETA_A, tagsRemoved: 1 });
      expect(await enviar('get_recipes_by_tag', postre.id)).toEqual([]);
    });

    it('responde si una receta tiene una etiqueta', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id],
      });
      expect(
        await enviar('recipe_has_tag', {
          recipeId: RECETA_A,
          tagId: rapido.id,
        }),
      ).toBe(true);
      expect(
        await enviar('recipe_has_tag', {
          recipeId: RECETA_B,
          tagId: rapido.id,
        }),
      ).toBe(false);
    });

    it('lista las recetas de una etiqueta', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id],
      });
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_B,
        tagIds: [rapido.id],
      });
      const recetas = await enviar<string[]>('get_recipes_by_tag', rapido.id);
      expect(recetas.sort()).toEqual([RECETA_A, RECETA_B]);
      expect((await fallo('get_recipes_by_tag', UUID_AJENO)).status).toBe(404);
    });

    it('consulta las etiquetas de varias recetas de una vez', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id, postre.id],
      });
      const mapa = await enviar('get_tags_of_recipes', {
        recipeIds: [RECETA_A, RECETA_B],
      });
      expect(
        mapa[RECETA_A].map((t: { name: string }) => t.name).sort(),
      ).toEqual(['Postre', 'Rápido']);
      expect(mapa[RECETA_B]).toEqual([]);
      expect(await enviar('get_tags_of_recipes', { recipeIds: [] })).toEqual(
        {},
      );
    });

    it('al borrar una etiqueta se quita de todas las recetas', async () => {
      await enviar('add_tags_to_recipe', {
        recipeId: RECETA_A,
        tagIds: [rapido.id, postre.id],
      });
      await enviar('delete_tag', rapido.id);
      expect(await enviar('get_recipe_tag_ids', RECETA_A)).toEqual([postre.id]);
      expect((await fallo('find_tag_by_id', rapido.id)).status).toBe(404);
      expect((await enviar('create_tag', { name: 'Rápido' })).id).toEqual(
        expect.any(String),
      );
    });
  });
});
