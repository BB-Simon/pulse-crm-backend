import { Transform } from 'class-transformer';

/**
 * Correctly parses "true"/"false" query-string values into booleans.
 * `@Type(() => Boolean)` looks like it should do this but actually coerces
 * via the `Boolean()` constructor, where any non-empty string — including
 * the literal string "false" — is truthy.
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });
}
