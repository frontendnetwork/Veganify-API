const assert = require("node:assert/strict");
const path = require("node:path");
const { once } = require("node:events");
const { Worker } = require("node:worker_threads");

async function main() {
  const worker = new Worker(
    path.resolve(__dirname, "../dist/ingredients/v1/ingredient.worker.js"),
    {
      workerData: {
        ingredients: ["milk", "sugar", "tofu", "unknown"],
        isMaybeNotVegan: ["sugar"],
        isNotVegan: ["milk"],
        isVegan: ["tofu"],
      },
    }
  );

  let timeout;
  const timedOut = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      void worker.terminate();
      reject(new Error("Compiled ingredient worker did not respond within 5s"));
    }, 5000);
  });

  try {
    const [[message], [exitCode]] = await Promise.race([
      Promise.all([once(worker, "message"), once(worker, "exit")]),
      timedOut,
    ]);

    assert.equal(exitCode, 0, "Compiled ingredient worker exited unsuccessfully");
    assert.deepEqual(message, {
      maybeNotVeganResult: ["sugar"],
      notVeganResult: ["milk"],
      unknownResult: ["unknown"],
      veganResult: ["tofu"],
    });
    console.log("Compiled ingredient worker smoke check passed");
  } finally {
    clearTimeout(timeout);
    await worker.terminate();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
