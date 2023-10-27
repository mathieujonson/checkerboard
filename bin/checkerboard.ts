#!/usr/bin/env node
import 'source-map-support/register'
import { App } from 'aws-cdk-lib'
import { CheckerboardStack } from '../lib/checkerboard-stack'

const app = new App()

new CheckerboardStack(app, 'CheckerboardStack', {
  env: {
    account: process.env.ACCOUNT,
    region: process.env.REGION,
  },
})
