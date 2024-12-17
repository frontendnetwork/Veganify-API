import { parentPort, workerData } from "worker_threads";

function sophisticatedMatch(ingredient: string, list: string[]): boolean {
  const normalizedIngredient = ingredient.toLowerCase().replace(/\s+/g, "");

  if (list.includes(normalizedIngredient)) return true;

  const wordBoundaryRegex = new RegExp(`\\b${normalizedIngredient}\\b`);
  if (list.some((item) => wordBoundaryRegex.test(item.replace(/\s+/g, ""))))
    return true;

  return false;
}

if (parentPort) {
  const { ingredients, isNotVegan, isMaybeNotVegan, isVegan } = workerData;

  const notVeganResult = ingredients.filter((item: string) =>
    sophisticatedMatch(item, isNotVegan)
  );

  const maybeNotVeganResult = ingredients.filter(
    (item: string) =>
      !sophisticatedMatch(item, isNotVegan) &&
      sophisticatedMatch(item, isMaybeNotVegan)
  );

  const veganResult = ingredients.filter((item: string) =>
    sophisticatedMatch(item, isVegan)
  );

  const unknownResult = ingredients.filter(
    (item: string) =>
      !sophisticatedMatch(item, isNotVegan) &&
      !sophisticatedMatch(item, isMaybeNotVegan) &&
      !sophisticatedMatch(item, isVegan)
  );

  parentPort.postMessage({
    notVeganResult,
    maybeNotVeganResult,
    veganResult,
    unknownResult,
  });
}
