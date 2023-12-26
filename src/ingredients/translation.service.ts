import translate, { DeeplLanguages } from "deepl";

export class TranslationService {
  async translateText(
    text: string,
    targetLang: DeeplLanguages,
    timeout: number
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Translate timed out")), timeout)
    );

    const translatePromise = translate({
      free_api: true,
      text: text,
      target_lang: targetLang,
      auth_key: `${process.env.DEEPL_AUTH as string}`,
    });

    return Promise.race([translatePromise, timeoutPromise]);
  }
}
