import { APIGatewayProxyHandler } from 'aws-lambda'

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager'

let secretsManagerClient: SecretsManagerClient
let shortcutSecretOutput: GetSecretValueCommandOutput
let shortcutSecrets: any

const BASE_URL = 'https://api.app.shortcut.com/api/v3'

const WARNING_MESSAGE = `This story is more than 6 months old, and isn't prioritized. Stakeholders will be notified in one week of an intent to archive.`

const getSecrets = async () => {
  if (shortcutSecrets) {
    return shortcutSecrets
  }

  secretsManagerClient ??= new SecretsManagerClient({ region: process.env.REGION || 'us-east-1' })

  shortcutSecretOutput ??= await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: 'shortcut',
    })
  )

  shortcutSecrets = JSON.parse(shortcutSecretOutput.SecretString || '')

  return shortcutSecrets
}

const getIdeasStories = async () => {
  const { ideasStateId, shortcutToken } = await getSecrets()

  const ideasStoriesResponse = await fetch(`${BASE_URL}/search/stories?query=state:${ideasStateId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Shortcut-Token': shortcutToken,
    },
  })

  const ideasStoriesJson = await ideasStoriesResponse.json()
  const { data: ideasStories, next: nextIdeasUrl } = ideasStoriesJson

  return { ideasStories, nextIdeasUrl }
}

const commentOnStory = async (storyId: string, comment: string) => {
  const { shortcutToken } = await getSecrets()

  const commentResponse = await fetch(`${BASE_URL}/stories/${storyId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shortcut-Token': shortcutToken,
    },
    body: JSON.stringify({
      text: comment,
    }),
  })
  console.log({ commentResponse })
  const commentJson = await commentResponse.json()

  return commentJson
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { testStoryId } = await getSecrets()
  const { ideasStories, nextIdeasUrl } = await getIdeasStories()

  const sixMonthsAgo = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30 * 6)

  const ideasStoryPromises: Promise<any>[] = []

  ideasStories.forEach((story: any) => {
    console.log(new Date(story.created_at) > sixMonthsAgo)
    if (story.id === parseInt(testStoryId, 10)) {
      ideasStoryPromises.push(commentOnStory(story.id, WARNING_MESSAGE))
    }
  })

  await Promise.all(ideasStoryPromises)

  return {
    statusCode: 200,
    headers: {},
    body: 'LLFG',
  }
}
