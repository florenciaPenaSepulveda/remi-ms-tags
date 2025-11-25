import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TagsService } from './tags.service';
import { TagsRecetaService } from './tagsReceta.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller()
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly tagsRecetaService: TagsRecetaService,
  ) {}

  // ========== OPERACIONES DE TAGS ==========
  
  @MessagePattern({ cmd: 'create_tag' })
  create(@Payload() createTagDto: CreateTagDto) {
    console.log('📩 Mensaje recibido para crear tag:', createTagDto.name);
    return this.tagsService.create(createTagDto);
  }

  @MessagePattern({ cmd: 'get_all_tags' })
  findAll() {
    console.log('📩 Mensaje recibido para obtener todos los tags');
    return this.tagsService.findAll();
  }

  @MessagePattern({ cmd: 'find_tag_by_id' })
  findOne(@Payload() id: string) {
    console.log('📩 Mensaje recibido para obtener tag con ID:', id);
    return this.tagsService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_tag' })
  update(@Payload() payload: { id: string; updateTagDto: UpdateTagDto }) {
    console.log('📩 Mensaje recibido para actualizar tag:', payload.id);
    return this.tagsService.update(payload.id, payload.updateTagDto);
  }

  @MessagePattern({ cmd: 'delete_tag' })
  remove(@Payload() id: string) {
    console.log('📩 Mensaje recibido para eliminar tag:', id);
    return this.tagsService.remove(id);
  }

  @MessagePattern({ cmd: 'find_tags_by_name' })
  findByName(@Payload() name: string) {
    console.log('📩 Mensaje recibido para buscar tags por nombre:', name);
    return this.tagsService.findByName(name);
  }

  // ========== OPERACIONES DE TAGS EN RECETAS ==========

  @MessagePattern({ cmd: 'add_tags_to_recipe' })
  addTagsToRecipe(@Payload() payload: { recipeId: string; tagIds: string[] }) {
    console.log('📩 Mensaje recibido para agregar tags a receta:', payload.recipeId);
    return this.tagsRecetaService.addTagsToRecipe(payload.recipeId, payload.tagIds);
  }

  @MessagePattern({ cmd: 'remove_tag_from_recipe' })
  removeTagFromRecipe(@Payload() payload: { recipeId: string; tagId: string }) {
    console.log('📩 Mensaje recibido para remover tag de receta:', payload.recipeId);
    return this.tagsRecetaService.removeTagRecipe(payload.recipeId, payload.tagId);
  }

  @MessagePattern({ cmd: 'get_recipe_tags' })
  getRecipeTags(@Payload() recipeId: string) {
    console.log('📩 Mensaje recibido para obtener tags de receta:', recipeId);
    return this.tagsRecetaService.getRecipeTags(recipeId);
  }

  @MessagePattern({ cmd: 'get_recipe_tag_ids' })
  getRecipeTagIds(@Payload() recipeId: string) {
    console.log('📩 Mensaje recibido para obtener IDs de tags de receta:', recipeId);
    return this.tagsRecetaService.getRecipeTag(recipeId);
  }

  @MessagePattern({ cmd: 'set_recipe_tags' })
  setRecipeTags(@Payload() payload: { recipeId: string; tagIds: string[] }) {
    console.log('📩 Mensaje recibido para agregar tags de receta:', payload.recipeId);
    return this.tagsRecetaService.addTagsToRecipe(payload.recipeId, payload.tagIds);
  }

  @MessagePattern({ cmd: 'remove_all_tags_from_recipe' })
  removeAllTagsFromRecipe(@Payload() recipeId: string) {
    console.log('📩 Mensaje recibido para remover todos los tags de receta:', recipeId);
    return this.tagsRecetaService.removeAllTagsRecipe(recipeId);
  }

  @MessagePattern({ cmd: 'get_recipes_by_tag' })
  getRecipesByTag(@Payload() tagId: string) {
    console.log('📩 Mensaje recibido para obtener recetas por tag:', tagId);
    return this.tagsRecetaService.getRecipesByTag(tagId);
  }

  @MessagePattern({ cmd: 'recipe_has_tag' })
  recipeHasTag(@Payload() payload: { recipeId: string; tagId: string }) {
    console.log('📩 Mensaje recibido para verificar si receta tiene tag');
    return this.tagsRecetaService.recipeHasTag(payload.recipeId, payload.tagId);
  }

}
