#!/usr/bin/env zx

// Checks for new releases of Node.js and publishes a layer for them across regions

try {
  const Semver = require("semver");
  let [_, __, ___, versionSelector, regions] = process.argv;
  versionSelector = versionSelector || ">=10";
  regions = regions ? regions.split(",") : require("./regions.json");

  const sendToSlack = async (text) => {
    if (process.env.SLACK_URL) {
      return fetch(process.env.SLACK_URL, {
        method: "post",
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  const getMissingLayers = async (availableVersions) => {
    // Get current catalog
    let publishedLayers = await fetch(
      "https://cdn.fusebit.io/everynode/layers.json"
    );
    if (publishedLayers.ok) {
      publishedLayers = JSON.parse(await publishedLayers.text());
    } else {
      throw new Error("Error getting published layers");
    }
    console.log("Published layers:", JSON.stringify(publishedLayers, null, 2));

    // Compute missing layers and regions
    const missingLayers = {};
    regions.forEach((region) =>
      availableVersions.forEach((version) => {
        if (!publishedLayers[region]?.[version]) {
          missingLayers[version] = missingLayers[version] || [];
          missingLayers[version].push(region);
        }
      })
    );

    return missingLayers;
  };

  // Get available Node.js versions
  let listing = await fetch("https://nodejs.org/dist/");
  if (listing.ok) {
    listing = await listing.text();
  } else {
    throw new Error("Error getting Node.js listing");
  }
  let availableVersions = {};
  listing.match(/v\d+\.\d+\.\d+\//g).forEach((v) => {
    const version = v.match(/(\d+\.\d+\.\d+)/)[1];
    if (Semver.satisfies(version, versionSelector)) {
      availableVersions[version] = 1;
    }
  });
  availableVersions = Object.keys(availableVersions);
  console.log("Published Node.js versions:", JSON.stringify(availableVersions));

  // Get missing layers
  const missingLayers = await getMissingLayers(availableVersions);
  console.log(
    "Missing layers and regions:",
    JSON.stringify(missingLayers, null, 2)
  );

  // Build missing layers
  let progress = 0;
  const missingVersions = Object.keys(missingLayers);
  for (let version of missingVersions) {
    const missingRegions = missingLayers[version].join(",");
    const percent = Math.floor((progress++ / missingVersions.length) * 100);
    console.log(`${percent}% Building v${version} for ${missingRegions}...`);
    const { exitCode } = await nothrow(
      $`${__dirname}/build-one.mjs ${version} ${missingRegions}`
    );
  }

  // Update catalog

  if (missingVersions.length > 0) {
    console.log("Updating catalog...");
    await nothrow($`${__dirname}/build-catalog.mjs`);
  }

  // Get missing layers again to cross-check
  const stillMissingLayers = await getMissingLayers(availableVersions);
  const newLayers = missingLayers;
  Object.keys(stillMissingLayers).forEach((version) => {
    const stillMissingRegions = stillMissingLayers[version];
    stillMissingRegions.forEach((region) => {
      if (newLayers[version]) {
        const index = newLayers[version].indexOf(region);
        if (index > -1) {
          newLayers[version].splice(index, 1);
        }
      }
      if (newLayers[version].length === 0) {
        delete newLayers[version];
      }
    });
  });

  if (Object.keys(newLayers).length > 0) {
    console.log("Newly published layers", JSON.stringify(newLayers, null, 2));
  } else {
    await sendToSlack(
      `:information_source: There are no new Node.js releases since the last run. Latest Node.js version is *v${
        Semver.sort(availableVersions)[availableVersions.length - 1]
      }*.`
    );
    console.log("No new layers were published");
  }
  if (Object.keys(stillMissingLayers).length > 0) {
    console.log(
      "Error publishing layers",
      JSON.stringify(stillMissingLayers, null, 2)
    );
    await sendToSlack(
      `:sos: There was an error publishing the following layers:\n${JSON.stringify(
        stillMissingLayers,
        null,
        2
      )}`
    );
    process.exit(1);
  } else {
    console.log("Completed with no errors");
  }
} catch (e) {
  await sendToSlack(
    `:sos: Error running the script:\n${
      e?.stack || e?.message || e || "Unknown error"
    }`
  );
  throw e;
}
