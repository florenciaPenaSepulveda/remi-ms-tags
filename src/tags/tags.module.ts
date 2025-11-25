import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagsRecetaService } from './tagsReceta.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [TagsController],
  providers: [TagsService, TagsRecetaService],
  exports: [TagsService, TagsRecetaService],
})
export class TagsModule {}
