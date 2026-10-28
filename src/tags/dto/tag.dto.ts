import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateTagDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre de la etiqueta es obligatorio' })
  @Length(1, 30, {
    message: 'El nombre de la etiqueta debe tener entre 1 y 30 caracteres',
  })
  name: string;
}

export class UpdateTagDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre de la etiqueta debe ser texto' })
  @Length(1, 30, {
    message: 'El nombre de la etiqueta debe tener entre 1 y 30 caracteres',
  })
  name?: string;
}

export class UpdateTagMessage {
  @IsUUID('4', { message: 'ID de etiqueta inválido' })
  id: string;

  @ValidateNested()
  @Type(() => UpdateTagDto)
  updateTagDto: UpdateTagDto;
}

export class SearchTagsMessage {
  @Transform(recortar)
  @IsString({ message: 'El texto de búsqueda es obligatorio' })
  @IsNotEmpty({ message: 'El texto de búsqueda es obligatorio' })
  name: string;
}

export class RecipeTagsMessage {
  @IsMongoId({ message: 'ID de receta inválido' })
  recipeId: string;

  @IsArray({ message: 'Las etiquetas deben ser una lista' })
  @ArrayMaxSize(20, { message: 'Se admiten hasta 20 etiquetas por receta' })
  @IsUUID('4', { each: true, message: 'ID de etiqueta inválido' })
  tagIds: string[];
}

export class RecipeTagMessage {
  @IsMongoId({ message: 'ID de receta inválido' })
  recipeId: string;

  @IsUUID('4', { message: 'ID de etiqueta inválido' })
  tagId: string;
}

export class RecipesTagsMessage {
  @IsArray({ message: 'Las recetas deben ser una lista' })
  @ArrayMaxSize(200, { message: 'Se admiten hasta 200 recetas por consulta' })
  @IsMongoId({ each: true, message: 'ID de receta inválido' })
  recipeIds: string[];
}
