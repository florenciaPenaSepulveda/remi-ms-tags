import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { Tag, TagsService } from './tags.service';

const claveDeRecetas = (id: string) => `tag:${id}:recipes`;
const claveDeEtiquetas = (recipeId: string) => `recipe:${recipeId}:tags`;

@Injectable()
export class TagsRecetaService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly tagsService: TagsService,
  ) {}

  async addTagsToRecipe(recipeId: string, tagIds: string[]): Promise<string[]> {
    const ids = [...new Set(tagIds)];
    await this.exigirExistentes(ids);
    if (ids.length) {
      const transaccion = this.redis
        .multi()
        .sadd(claveDeEtiquetas(recipeId), ...ids);
      ids.forEach((id) => transaccion.sadd(claveDeRecetas(id), recipeId));
      await transaccion.exec();
    }
    return this.redis.smembers(claveDeEtiquetas(recipeId));
  }

  async setRecipeTags(recipeId: string, tagIds: string[]): Promise<string[]> {
    const nuevos = [...new Set(tagIds)];
    await this.exigirExistentes(nuevos);
    const actuales = await this.redis.smembers(claveDeEtiquetas(recipeId));
    const transaccion = this.redis.multi().del(claveDeEtiquetas(recipeId));
    actuales
      .filter((id) => !nuevos.includes(id))
      .forEach((id) => transaccion.srem(claveDeRecetas(id), recipeId));
    if (nuevos.length) {
      transaccion.sadd(claveDeEtiquetas(recipeId), ...nuevos);
      nuevos.forEach((id) => transaccion.sadd(claveDeRecetas(id), recipeId));
    }
    await transaccion.exec();
    return nuevos;
  }

  async removeTagRecipe(recipeId: string, tagId: string) {
    await this.redis
      .multi()
      .srem(claveDeEtiquetas(recipeId), tagId)
      .srem(claveDeRecetas(tagId), recipeId)
      .exec();
    return this.getRecipeTag(recipeId);
  }

  async removeAllTagsRecipe(recipeId: string) {
    const actuales = await this.redis.smembers(claveDeEtiquetas(recipeId));
    const transaccion = this.redis.multi().del(claveDeEtiquetas(recipeId));
    actuales.forEach((id) => transaccion.srem(claveDeRecetas(id), recipeId));
    await transaccion.exec();
    return { recipeId, tagsRemoved: actuales.length };
  }

  getRecipeTag(recipeId: string): Promise<string[]> {
    return this.redis.smembers(claveDeEtiquetas(recipeId));
  }

  async getRecipeTags(recipeId: string): Promise<Tag[]> {
    const ids = await this.getRecipeTag(recipeId);
    const etiquetas = await this.tagsService.leer(ids);
    return etiquetas.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async getTagsOfRecipes(recipeIds: string[]): Promise<Record<string, Tag[]>> {
    if (!recipeIds.length) {
      return {};
    }
    const pipeline = this.redis.pipeline();
    recipeIds.forEach((id) => pipeline.smembers(claveDeEtiquetas(id)));
    const respuestas = (await pipeline.exec()) ?? [];
    const idsPorReceta = respuestas.map(([, ids]) => (ids ?? []) as string[]);
    const unicos = [...new Set(idsPorReceta.flat())];
    const porId = new Map(
      (await this.tagsService.leer(unicos)).map((t) => [t.id, t]),
    );
    return Object.fromEntries(
      recipeIds.map((recipeId, i) => [
        recipeId,
        idsPorReceta[i].flatMap((id) => porId.get(id) ?? []),
      ]),
    );
  }

  async recipeHasTag(recipeId: string, tagId: string): Promise<boolean> {
    return (
      (await this.redis.sismember(claveDeEtiquetas(recipeId), tagId)) === 1
    );
  }

  async getRecipesByTag(tagId: string): Promise<string[]> {
    await this.tagsService.findOne(tagId);
    return this.redis.smembers(claveDeRecetas(tagId));
  }

  private async exigirExistentes(ids: string[]) {
    const existentes = new Set(
      (await this.tagsService.leer(ids)).map((t) => t.id),
    );
    const faltantes = ids.filter((id) => !existentes.has(id));
    if (faltantes.length) {
      throw new RpcException({
        status: 404,
        message: `Etiquetas no encontradas: ${faltantes.join(', ')}`,
      });
    }
  }
}
