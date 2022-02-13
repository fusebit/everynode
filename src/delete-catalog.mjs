#!/usr/bin/env zx

// Deletes catalog from CDN

// Empty JSON catalog
let upload = $`aws s3 cp - s3://fusebit-io-cdn/everynode/layers.json --content-type application/json --cache-control no-cache --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers full=id=332f10bace808ea274aecc80e667990adc92dc993a597a42622105dc1f0050bf`;
upload.stdin.write("{}");
upload.stdin.end();
await upload;

// Empty TXT catalog
upload = $`aws s3 cp - s3://fusebit-io-cdn/everynode/layers.txt --content-type text/plain --cache-control no-cache --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers full=id=332f10bace808ea274aecc80e667990adc92dc993a597a42622105dc1f0050bf`;
upload.stdin.write("");
upload.stdin.end();
await upload;
