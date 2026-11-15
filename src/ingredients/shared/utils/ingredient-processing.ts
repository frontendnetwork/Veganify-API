export function parseIngredients(ingredientsString: string): string[] {
  let decoded: string;
  try {
    decoded = decodeURIComponent(ingredientsString);
  } catch {
    decoded = ingredientsString;
  }

  return decoded
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== "");
}

export function normalizeIngredientList(ingredients: string[]): string[] {
  return ingredients.map((ingredient) => ingredient.toLowerCase());
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sophisticatedMatch(
  ingredient: string,
  list: string[]
): boolean {
  const normalizedIngredient = ingredient.toLowerCase().replace(/\s+/g, "");

  if (list.includes(normalizedIngredient)) {
    return true;
  }

  const escaped = escapeRegex(normalizedIngredient);
  const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`);
  return list.some((item) => wordBoundaryRegex.test(item.replace(/\s+/g, "")));
}
