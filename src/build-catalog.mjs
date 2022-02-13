#!/usr/bin/env zx

// Builds a catalog of layers across regions and publishes to Fusebit CDN
// at https://cdn.fusebit.io/everynode/layers.json

let [_, __, ___, regions] = process.argv;
regions = regions ? regions.split(",") : require("./regions.json");

const getLayers = async (region) => {
  const versions = {}; // version -> arn
  let nextToken;
  do {
    const result = JSON.parse(
      await $`aws lambda list-layers --region ${region} ${
        (nextToken && `--starting-token ${nextToken}`) || ``
      }`
    );
    if (Array.isArray(result.Layers)) {
      result.Layers.forEach((layer) => {
        if (
          layer.LatestMatchingVersion &&
          layer.LatestMatchingVersion.Description?.match(
            /\@fusebit\/everynode\@/
          )
        ) {
          const version =
            layer.LatestMatchingVersion.Description?.match(
              /node\@([^\s]+)/
            )?.[1];
          if (version) {
            versions[version] = layer.LatestMatchingVersion.LayerVersionArn;
          }
        }
      });
      nextToken = result.NextToken;
    }
  } while (nextToken);
  return versions;
};

const catalogUpdate = {}; // region -> version -> arn
for (const region of regions) {
  catalogUpdate[region] = await getLayers(region);
}

// Upload JSON catalog
let upload = $`aws s3 cp - s3://fusebit-io-cdn/everynode/layers.json --content-type application/json --cache-control no-cache --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers full=id=332f10bace808ea274aecc80e667990adc92dc993a597a42622105dc1f0050bf`;
upload.stdin.write(JSON.stringify(catalogUpdate, null, 2));
upload.stdin.end();
await upload;

// Upload TXT catalog to be used for scripting
// curl https://cdn.fusebit.io/everynode/layers.txt --no-progress-meter | grep 'us-west-1 17.4.0' | awk '{ print $3 }'
const lines = [];
Object.keys(catalogUpdate).forEach((region) =>
  Object.keys(catalogUpdate[region]).forEach((version) => {
    lines.push(`${region} ${version} ${catalogUpdate[region][version]}`);
  })
);
upload = $`aws s3 cp - s3://fusebit-io-cdn/everynode/layers.txt --content-type text/plain --cache-control no-cache --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers full=id=332f10bace808ea274aecc80e667990adc92dc993a597a42622105dc1f0050bf`;
upload.stdin.write(lines.join("\n"));
upload.stdin.end();
await upload;

await sleep(2000); // Give CDN a chance to catch up

console.log(catalogUpdate);
