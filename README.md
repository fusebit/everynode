# Run Any Node.js Version in AWS Lambda

Everynode allows you to run **any version of Node.js in AWS Lambda**, in any commercial AWS region. We add support for new Node.js versions within **six hours** of the release.

<img width="689" alt="image" src="https://user-images.githubusercontent.com/822369/153952823-df80628b-5d86-467c-b3a5-c4494e28a8b0.png">

- Create and run AWS Lambda functions using any version of Node.js >= 10.
- **New releases of Node.js are supported within 6 hours**.
- Deploy to any commercial AWS region.
- No magic or tricks - open source.
- Free forever, created and maintained for developers like you by developers at [Fusebit](https://fusebit.io).

# Quickstart

Let's deploy a _Hello, World_ Lambda function using Node.js 17.5.0 to us-west-1.

First, create the Lambda deployment package:

```bash
cat > function.js <<EOF
exports.handler = (event, context, callback) => {
  callback(null, { message: "Hello from Node " + process.version });
};
EOF

zip function.zip function.js
```

Next, create the _hello17_ Lambda function in us-west-1 that uses a custom Lambda runtime with Node.js v17.5.0 provided by Fusebit:

```bash
# Get the ARN of the custom runtime layer containg Node.js 17.5.0 for us-west-1
LAYER=$(curl https://cdn.fusebit.io/everynode/layers.txt --no-progress-meter | grep 'us-west-1 17.5.0' | awk '{ print $3 }')

# Create a Lambda function using Node.js 17.5.0
aws lambda create-function --function-name hello17 \
  --layers $LAYER \
  --region us-west-1 \
  --zip-file fileb://function.zip \
  --handler function.handler \
  --runtime provided
  --role {iam-role-arn}
```

Last, call the function:

```bash
aws lambda invoke --function-name hello17 response.json
cat response.json
```

And voila, welcome to Node.js v17.5.0 in AWS Lambda:

```json
{ "message": "Hello from Node v17.5.0" }
```

## Any Region, Any Node.js Version, One Lambda

The Everynode project provides pre-built [AWS Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html) that contain [custom AWS Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html) for every Node.js version >=10 in all commercial AWS regions. When you want to create a Lambda function using a specific Node.js version in a specific AWS region, you need to choose the right AWS layer for it.

Each combination of AWS region and Node.js version has a distinct layer ARN you need to use when deploying a Lambda function to that region. You can find the ARN of the layer you need from the catalog we publish:

- In the JSON format, at [https://cdn.fusebit.io/everynode/layers.json](https://cdn.fusebit.io/everynode/layers.json)
- In the text format, at [https://cdn.fusebit.io/everynode/layers.txt](https://cdn.fusebit.io/everynode/layers.txt)

Lambda layers for new Node.js versions are published generally within 6 hours after the Node.js release.

The JSON format of the catalog is convenient for programmatic use from your application. The text format is convenient for scripting. For example, you can get the AWS Lambda layer ARN for Node.js v17.4.0 in region us-east-1 with:

```bash
LAYER=$(curl https://cdn.fusebit.io/everynode/layers.txt --no-progress-meter | grep 'us-east-1 17.4.0' | awk '{ print $3 }')
echo $LAYER
```

Once you have the ARN of the layer matching your desired Node.js version and AWS region, you can provide it to the `--layers` option of the `aws lambda create-function` call, or specify it in the `Layers` array when making a direct API request.

## FAQ

**Is it really free?**

Yes. Support for any version of Node.js in AWS Lambda is a by-product of the engineering behind [Fusebit](https://fusebit.io), our developer-friendly integration platform that helps devs add integrations to their apps.

**How can I get in touch with feedback, questions, etc?**

You can [join out community Slack, Discord, or e-mail us](https://fusebit.io/contact/). You can also reach us on Twitter [@fusebitio](https://twitter.com/fusebitio).

**How do I report an issue?**

[File an issue](https://github.com/fusebit/everynode/issues). Or better still, submit a PR.

**What's included in the custom runtime?**

Only the Node.js executable of the specific version. In particular, the `aws-sdk` module is **not** included. If you need to use it, you must include it in your Lambda deployment package.

**Are you mining bitcoins in my AWS account?**

We try not to. But since Everynode is OSS, you can check yourself. You can even deploy your own copies of the custom Lambda layers to your own AWS account.

**Do you have cool stickers?**

Yes. Get in touch and we will send you some.
