import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '../dto/page.dto';

/**
 * Documents a paginated response as `PageDto<T>` for a concrete `T`.
 *
 * Generics are erased before the Swagger plugin ever sees them, so
 * `@ApiOkResponse({ type: PageDto<ProductDto> })` documents `items` as an array
 * of nothing at all. Composing the schema by hand is the standard way round it,
 * and putting it in one decorator means the incantation is written once rather
 * than at each of the five list endpoints.
 */
export const ApiPageResponse = <T extends Type<unknown>>(
  model: T,
  description?: string,
) =>
  applyDecorators(
    /** Both must be registered, or `$ref` points at a definition Swagger never emitted. */
    ApiExtraModels(PageDto, PageMetaDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          {
            properties: {
              items: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
  );
