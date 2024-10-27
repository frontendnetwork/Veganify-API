import translate, { DeeplLanguages } from "deepl";

interface DeepLTranslationResult {
  data: {
    translations: {
      detected_source_language: string;
      text: string;
    }[];
  };
}

export class TranslationService {
  async translateText(
    text: string,
    targetLang: DeeplLanguages,
    timeout: number
  ): Promise<DeepLTranslationResult> {
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
