import { Injectable, Logger } from "@nestjs/common";
import translate, { DeeplLanguages } from "deepl";

import { CacheService } from "../../../config/cache.service";

interface DeepLTranslationResult {
  data: {
    translations: {
      detected_source_language: string;
      text: string;
    }[];
  };
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly cacheService: CacheService) {}

  async translateText(
    text: string,
    targetLang: DeeplLanguages,
    timeout: number
  ): Promise<DeepLTranslationResult> {
    const cacheKey = this.cacheService.generateTranslationKey(text, targetLang);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await this.performTranslation(text, targetLang, timeout);
        // Extract only the serializable parts to avoid circular references
        return {
          data: {
            translations: result.data.translations.map((t) => ({
              detected_source_language: t.detected_source_language,
              text: t.text,
            })),
          },
        };
      },
      7 * 24 * 60 * 60 // Cache translations for 7 days
    );
  }

  private async performTranslation(
    text: string,
    targetLang: DeeplLanguages,
    timeout: number
  ): Promise<DeepLTranslationResult> {
    this.logger.debug(
      `Performing translation for: ${text.substring(0, 50)}...`
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Translate timed out")), timeout)
    );

    const translatePromise = translate({
      free_api: true,
      text: text,
      target_lang: targetLang,
      auth_key: `${process.env.DEEPL_AUTH as string}`,
    }) as Promise<DeepLTranslationResult>;

    return Promise.race([
      translatePromise,
      timeoutPromise,
    ]) as Promise<DeepLTranslationResult>;
  }
}
