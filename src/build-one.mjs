#!/usr/bin/env zx

// Builds a Node.js runtime layer for the specified Node.js version
// and deploys it to the specified regions (or all regions from regions.json
// if no regions are specified explicitly)

const thisVersion = require("../package.json").version;
let [_, __, ___, version, regions] = process.argv;
if (!version) {
  throw new Error(
    "Usage: build-one.mjs {nodejs-version} [{comma-separated-list-of-aws-regions}]"
  );
}
regions = regions ? regions.split(",") : require("./regions.json");
const dir = `${__dirname}/../build/${version}`;
const zip = `node-${version}-everynode-${thisVersion}.zip`;
const layer = `node-${version.replace(/\./g, "_")}`;

// Download Node.js version and and build Lambda runtime layer ZIP
await $`rm -rf ${dir}; mkdir -p ${dir}`;
process.chdir(dir);
await $`curl https://nodejs.org/dist/v${version}/node-v${version}-linux-x64.tar.gz --output node.tar.gz`;
await $`tar -xvf node.tar.gz; mv node-v${version}-linux-x64 node`;
await $`zip -j ${zip} ../../src/bootstrap; zip -r -y ${zip} node`;

// For each region, upload to S3, create layer version, and set permissions
const results = {};
for (let i = 0; i < regions.length; i++) {
  const region = regions[i];
  const bucket = `everynode.${region}.fusebit.io`;
  console.log(`Deploying ${version} to ${region}...`);
  try {
    let { exitCode } = await nothrow(
      $`aws s3 ls s3://${bucket} --region ${region}`
    );
    if (exitCode) {
      await $`aws s3 mb s3://${bucket} --region ${region}`;
    }
    await $`aws s3 cp ${zip} s3://${bucket}/${zip} --region ${region}`;
    let { stdout: layerVersion } =
      await $`aws lambda publish-layer-version --layer-name ${layer} --content S3Bucket=${bucket},S3Key=${zip} --compatible-runtimes provided --description 'node@${version} @fusebit/everynode@${thisVersion}' --region ${region}`;
    layerVersion = JSON.parse(layerVersion);
    await $`aws lambda add-layer-version-permission --layer-name ${layer} --version-number ${layerVersion.Version}  --principal "*" --statement-id publish --action lambda:GetLayerVersion --region ${region}`;
    results[region] = layerVersion.LayerVersionArn;
  } catch (e) {
    console.log(`Error deploying ${version} to ${region}`);
  }
}

await $`rm -rf ${dir}`;

if (process.env.SLACK_URL) {
  await fetch(process.env.SLACK_URL, {
    method: "post",
    body: JSON.stringify({
      text: `:rocket: Shipped AWS Lambda layers for Node.js *v${version}*:\n${Object.keys(
        results
      )
        .sort()
        .map((region) => `*${region}*: ${results[region]}\n`)}`,
    }),
    headers: { "Content-Type": "application/json" },
  });
}
console.log(JSON.stringify(results, null, 2));
