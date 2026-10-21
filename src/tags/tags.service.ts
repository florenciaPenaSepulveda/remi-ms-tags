import { Injectable, OnModuleInit } from '@nestjs/common';
import { Repository } from 'redis-om';
import { RedisClient } from '../redis/redis.client';
import { tagSchema, Tag } from './schemas/tag.schema';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';


@Injectable()
export class TagsService implements OnModuleInit {
  private tagRepository: Repository;

  constructor(private readonly redisClient: RedisClient) {}

  async onModuleInit() {
    this.tagRepository = this.redisClient.getClient().fetchRepository(tagSchema);
    await this.tagRepository.createIndex();
  }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const entity = await this.tagRepository.save({
      name: createTagDto.name,
    });
    return {
      id: entity.entityId,
      name: entity.name as string,
    };
  }

  async findAll(): Promise<Tag[]> {
    const tags = await this.tagRepository.search().return.all();
    return tags.map((tag) => ({
      id: tag.entityId,
      name: tag.name as string,
    }));
  }

  async findOne(id: string): Promise<Tag | null> {
    const tag = await this.tagRepository.fetch(id);
    if (!tag.entityId) return null;
    return {
      id: tag.entityId,
      name: tag.name as string,
    };
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag | null> {
    const tag = await this.tagRepository.fetch(id);
    if (!tag.entityId) return null;
    
    if (updateTagDto.name) {
      tag.name = updateTagDto.name;
    }
    await this.tagRepository.save(tag);
    
    return {
      id: tag.entityId,
      name: tag.name as string,
    };
  }

  async remove(id: string): Promise<void> {
    await this.tagRepository.remove(id);
  }

  async findByName(name: string): Promise<Tag[]> {
    const tags = await this.tagRepository.search()
      .where('name').equals(name)
      .return.all();
    return tags.map((tag) => ({
      id: tag.entityId,
      name: tag.name as string,
    }));
  }
}