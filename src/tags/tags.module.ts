import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagsRecetaService } from './tagsReceta.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TagsRecetaService],
})
export class TagsModule {}
