import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export class CheckerboardStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const shortcutSecrets = Secret.fromSecretNameV2(this, 'shortcut-secrets', 'shortcut')

    const checkerboardRunEvent = new Rule(this, 'checkerboard-rule', {
      schedule: Schedule.cron({ hour: '13', minute: '0' }),
    })

    const checkerboardLambda = new NodejsFunction(this, 'checkerboard-lambda', {
      entry: 'lambdas/checkerboard/index.ts',
      description: 'Lambda to search, comment, and delete stories from Shortcut',
      functionName: 'checkerboard',
      handler: 'handler',
      logRetention: RetentionDays.THIRTEEN_MONTHS,
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(5),
      environment: {
        REGION: process.env.REGION || 'us-east-1',
      },
    })

    shortcutSecrets.grantRead(checkerboardLambda)

    checkerboardRunEvent.addTarget(new LambdaFunction(checkerboardLambda))
  }
}
