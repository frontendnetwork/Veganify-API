const fs = require('fs');
const path = require('path');

const filename = process.argv[2];

if (!filename) {
  console.error('Error: Please provide a filename as an argument.');
  console.error('Usage: node processIngredients.js <filename>');
  process.exit(1);
}

const inputFile = path.join(__dirname, filename);
const outputFile = path.join(__dirname, filename);

let ingredients;
try {
  ingredients = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
} catch (error) {
  console.error(`Error reading file ${inputFile}: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(ingredients)) {
  console.error('Error: The input file does not contain a JSON array.');
  process.exit(1);
}

let processedIngredients = new Set();

ingredients.forEach(ingredient => {
  let lowercaseIngredient = ingredient.toLowerCase();

  processedIngredients.add(lowercaseIngredient);

  if (lowercaseIngredient.includes(' ')) {
    processedIngredients.add(lowercaseIngredient.replace(/ /g, ''));
  }
});

processedIngredients = Array.from(processedIngredients).sort();

try {
  fs.writeFileSync(outputFile, JSON.stringify(processedIngredients, null, 2));
  console.log(`Processing complete. ${processedIngredients.length} ingredients saved in ${outputFile}`);
} catch (error) {
  console.error(`Error writing to file ${outputFile}: ${error.message}`);
  process.exit(1);
}