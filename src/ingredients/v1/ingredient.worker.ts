import { parentPort, workerData } from "node:worker_threads";

import { sophisticatedMatch } from "../shared/utils/ingredient-processing";

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
      !(
        sophisticatedMatch(item, isNotVegan) ||
        sophisticatedMatch(item, isMaybeNotVegan) ||
        sophisticatedMatch(item, isVegan)
      )
  );

  parentPort.postMessage({
    maybeNotVeganResult,
    notVeganResult,
    unknownResult,
    veganResult,
  });
}
