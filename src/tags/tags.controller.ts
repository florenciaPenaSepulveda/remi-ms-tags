import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateTagDto,
  RecipeTagMessage,
  RecipeTagsMessage,
  RecipesTagsMessage,
  SearchTagsMessage,
  UpdateTagMessage,
} from './dto/tag.dto';
import { TagsService } from './tags.service';
import { TagsRecetaService } from './tagsReceta.service';

@Controller()
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly tagsRecetaService: TagsRecetaService,
  ) {}

  @MessagePattern({ cmd: 'create_tag' })
  create(@Payload() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @MessagePattern({ cmd: 'get_all_tags' })
  findAll() {
    return this.tagsService.findAll();
  }

  @MessagePattern({ cmd: 'find_tag_by_id' })
  findOne(@Payload() id: string) {
    return this.tagsService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_tag' })
  update(@Payload() { id, updateTagDto }: UpdateTagMessage) {
    return this.tagsService.update(id, updateTagDto);
  }

  @MessagePattern({ cmd: 'delete_tag' })
  remove(@Payload() id: string) {
    return this.tagsService.remove(id);
  }

  @MessagePattern({ cmd: 'find_tags_by_name' })
  findByName(@Payload() { name }: SearchTagsMessage) {
    return this.tagsService.findByName(name);
  }

  @MessagePattern({ cmd: 'add_tags_to_recipe' })
  addTagsToRecipe(@Payload() { recipeId, tagIds }: RecipeTagsMessage) {
    return this.tagsRecetaService.addTagsToRecipe(recipeId, tagIds);
  }

  @MessagePattern({ cmd: 'set_recipe_tags' })
  setRecipeTags(@Payload() { recipeId, tagIds }: RecipeTagsMessage) {
    return this.tagsRecetaService.setRecipeTags(recipeId, tagIds);
  }

  @MessagePattern({ cmd: 'remove_tag_from_recipe' })
  removeTagFromRecipe(@Payload() { recipeId, tagId }: RecipeTagMessage) {
    return this.tagsRecetaService.removeTagRecipe(recipeId, tagId);
  }

  @MessagePattern({ cmd: 'remove_all_tags_from_recipe' })
  removeAllTagsFromRecipe(@Payload() recipeId: string) {
    return this.tagsRecetaService.removeAllTagsRecipe(recipeId);
  }

  @MessagePattern({ cmd: 'get_recipe_tags' })
  getRecipeTags(@Payload() recipeId: string) {
    return this.tagsRecetaService.getRecipeTags(recipeId);
  }

  @MessagePattern({ cmd: 'get_recipe_tag_ids' })
  getRecipeTagIds(@Payload() recipeId: string) {
    return this.tagsRecetaService.getRecipeTag(recipeId);
  }

  @MessagePattern({ cmd: 'get_tags_of_recipes' })
  getTagsOfRecipes(@Payload() { recipeIds }: RecipesTagsMessage) {
    return this.tagsRecetaService.getTagsOfRecipes(recipeIds);
  }

  @MessagePattern({ cmd: 'get_recipes_by_tag' })
  getRecipesByTag(@Payload() tagId: string) {
    return this.tagsRecetaService.getRecipesByTag(tagId);
  }

  @MessagePattern({ cmd: 'recipe_has_tag' })
  recipeHasTag(@Payload() { recipeId, tagId }: RecipeTagMessage) {
    return this.tagsRecetaService.recipeHasTag(recipeId, tagId);
  }
}
