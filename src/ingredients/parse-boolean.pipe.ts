import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ParseBooleanPipe implements PipeTransform {
  transform(value: string | undefined, metadata: ArgumentMetadata): boolean {
    // If value is not provided or not 'false', return true (default behavior)
    return !value || value.toLowerCase() !== 'false';
  }
}
