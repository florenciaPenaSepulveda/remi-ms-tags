import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisClient } from '../redis/redis.client';
import { TagsService } from './tags.service';
import { Tag } from './schemas/tag.schema';

@Injectable()
export class TagsRecetaService implements OnModuleInit {
  private redisClient: any;

  constructor(
    private readonly redisClientProvider: RedisClient,
    private readonly tagsService: TagsService,
  ) {}

  async onModuleInit() {
    this.redisClient = this.redisClientProvider.getClient().redis;
  }

  // Agregar tags a una receta
  async addTagsToRecipe(recipeId: string, tagIds: string[]): Promise<void> {
    const key = `recipe:${recipeId}:tags`;
    await this.redisClient.sadd(key, ...tagIds);
  }

  // Remover un tag de una receta
  async removeTagRecipe(recipeId: string, tagId: string): Promise<void> {
    const key = `recipe:${recipeId}:tags`;
    await this.redisClient.srem(key, tagId);
  }

  async removeAllTagsRecipe(recipeId: string): Promise<void> {
    const key = `recipe:${recipeId}:tags`;
    await this.redisClient.del(key);
  }

  // SOLO GET RECIPETAGS LLEGA AQUI
  async getRecipeTag(recipeId: string): Promise<string[]> {
    const key = `recipe:${recipeId}:tags`;
    return await this.redisClient.smembers(key);
  }

  // Obtener tags completos (con nombre)
  async getRecipeTags(recipeId: string): Promise<Tag[]> {
    const tagIds = await this.getRecipeTag(recipeId);
    const tags: Tag[] = [];

    for (const tagId of tagIds) {
      const tag = await this.tagsService.findOne(tagId);
      if (tag) {
        tags.push(tag);
      }
    }

    return tags;
  }

  // Verificar si una receta tiene un tag específico
  async recipeHasTag(recipeId: string, tagId: string): Promise<boolean> {
    const key = `recipe:${recipeId}:tags`;
    return (await this.redisClient.sismember(key, tagId)) === 1;
  }

  // Obtener todas las recetas que tienen un tag específico
  async getRecipesByTag(tagId: string): Promise<string[]> {
    const pattern = 'recipe:*:tags';
    const keys = await this.redisClient.keys(pattern);
    const recipeIds: string[] = [];

    for (const key of keys) {
      const hasTag = await this.redisClient.sismember(key, tagId);
      if (hasTag === 1) {
        const recipeId = key.split(':')[1];
        recipeIds.push(recipeId);
      }
    }
    return recipeIds;
  }
}
