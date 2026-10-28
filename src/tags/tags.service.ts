import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

export interface Tag {
  id: string;
  name: string;
}

const TODAS = 'tags:all';
const claveDeEtiqueta = (id: string) => `tag:${id}`;
const claveDeNombre = (nombre: string) => `tag:slug:${normalizar(nombre)}`;
const claveDeRecetas = (id: string) => `tag:${id}:recipes`;
const claveDeEtiquetas = (recipeId: string) => `recipe:${recipeId}:tags`;

export const normalizar = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

@Injectable()
export class TagsService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create({ name }: CreateTagDto): Promise<Tag> {
    const id = randomUUID();
    const reservada = await this.redis.set(claveDeNombre(name), id, 'NX');
    if (!reservada) {
      throw this.repetida();
    }
    await this.redis
      .multi()
      .hset(claveDeEtiqueta(id), { id, name })
      .sadd(TODAS, id)
      .exec();
    return { id, name };
  }

  async findAll(): Promise<Tag[]> {
    const ids = await this.redis.smembers(TODAS);
    return (await this.leer(ids)).sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    );
  }

  async findOne(id: string): Promise<Tag> {
    const [etiqueta] = await this.leer([id]);
    if (!etiqueta) {
      throw new RpcException({
        status: 404,
        message: 'Etiqueta no encontrada',
      });
    }
    return etiqueta;
  }

  async findByName(texto: string): Promise<Tag[]> {
    const buscado = normalizar(texto);
    const todas = await this.findAll();
    return todas.filter((t) => normalizar(t.name).includes(buscado));
  }

  async update(id: string, { name }: UpdateTagDto): Promise<Tag> {
    const actual = await this.findOne(id);
    if (!name || name === actual.name) {
      return actual;
    }
    if (normalizar(name) !== normalizar(actual.name)) {
      const reservada = await this.redis.set(claveDeNombre(name), id, 'NX');
      if (!reservada) {
        throw this.repetida();
      }
      await this.redis.del(claveDeNombre(actual.name));
    }
    await this.redis.hset(claveDeEtiqueta(id), { name });
    return { id, name };
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    const etiqueta = await this.findOne(id);
    const recetas = await this.redis.smembers(claveDeRecetas(id));
    const transaccion = this.redis.multi();
    for (const recipeId of recetas) {
      transaccion.srem(claveDeEtiquetas(recipeId), id);
    }
    transaccion
      .del(
        claveDeRecetas(id),
        claveDeEtiqueta(id),
        claveDeNombre(etiqueta.name),
      )
      .srem(TODAS, id);
    await transaccion.exec();
    return { id, deleted: true };
  }

  async leer(ids: string[]): Promise<Tag[]> {
    if (!ids.length) {
      return [];
    }
    const pipeline = this.redis.pipeline();
    ids.forEach((id) => pipeline.hgetall(claveDeEtiqueta(id)));
    const respuestas = (await pipeline.exec()) ?? [];
    return respuestas.flatMap(([, datos]) => {
      const { id, name } = (datos ?? {}) as Partial<Tag>;
      return id && name ? [{ id, name }] : [];
    });
  }

  private repetida() {
    return new RpcException({
      status: 409,
      message: 'Ya existe una etiqueta con ese nombre',
    });
  }
}
