import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager'

import { Comment } from './types'

let secretsManagerClient: SecretsManagerClient
let shortcutSecretOutput: GetSecretValueCommandOutput
let shortcutSecrets: any

const BASE_URL = 'https://api.app.shortcut.com/api/v3'

const WARNING_MESSAGE = `**AUTOMATED MESSAGE:** This story is more than 6 months old, and it hasn't been prioritized. Stakeholders will be notified in one week of an intent to archive.`
const TAGGING_MESSAGE = `**AUTOMATED MESSAGE:** This story will be archived in one week. If we would like to keep this card, we should move it to the appropriate column.`

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

const getColumnStories = async () => {
  const { columnStateId, shortcutToken } = await getSecrets()

  // TODO: handle pagination
  const columnStoriesResponse = await fetch(`${BASE_URL}/search/stories?query=state:${columnStateId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Shortcut-Token': shortcutToken,
    },
  })

  const { data: columnStories, next: nextStoriesUrl } = await columnStoriesResponse.json()

  console.log({ nextStoriesUrl })

  return { columnStories, nextStoriesUrl }
}

const commentOnStory = async (storyId: string, comment: string) => {
  const { shortcutToken } = await getSecrets()

  return await fetch(`${BASE_URL}/stories/${storyId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shortcut-Token': shortcutToken,
    },
    body: JSON.stringify({
      text: comment,
    }),
  })
}

const processComments = (comments: Comment[]) => {
  const oneWeekAgo = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7)

  let hasWarningComment = false
  let warningCommentOlderThanOneWeek = false
  let hasTaggingComment = false
  let taggingCommentOlderThanOneWeek = false

  for (const comment of comments) {
    if (comment.deleted) {
      continue
    }

    if (comment.text === WARNING_MESSAGE) {
      hasWarningComment = true
      warningCommentOlderThanOneWeek = new Date(comment.created_at) < oneWeekAgo
    } else if (comment.text?.startsWith(TAGGING_MESSAGE)) {
      hasTaggingComment = true
      taggingCommentOlderThanOneWeek = new Date(comment.created_at) < oneWeekAgo
    }
  }

  return {
    hasWarningComment,
    warningCommentOlderThanOneWeek,
    hasTaggingComment,
    taggingCommentOlderThanOneWeek,
  }
}

const generateTaggingMessage = async () => {
  const { stakeholderUserNames } = await getSecrets()

  if (!stakeholderUserNames) {
    return TAGGING_MESSAGE
  }

  const stakeholderUserNamesArray = stakeholderUserNames.split(',')

  let stakeholderUserNamesString = stakeholderUserNamesArray.map((name: string) => `@${name}`).join(', ')

  stakeholderUserNamesString &&= ` cc: ${stakeholderUserNamesString}`

  return `${TAGGING_MESSAGE}${stakeholderUserNamesString}`
}

export const handler = async () => {
  const { testStoryId } = await getSecrets()
  const { columnStories, nextStoriesUrl } = await getColumnStories()

  const generatedTaggingMessage = await generateTaggingMessage()

  const columnStoryPromises: Promise<any>[] = []

  for (const story of columnStories) {
    if (story.archived) {
      continue
    }

    // Replace the condition here with `new Date(story.created_at) > sixMonthsAgo` when ready
    if (story.id === parseInt(testStoryId, 10)) {
      console.log(story)

      const { hasWarningComment, warningCommentOlderThanOneWeek, hasTaggingComment, taggingCommentOlderThanOneWeek } =
        processComments(story.comments)

      if (hasWarningComment && hasTaggingComment && taggingCommentOlderThanOneWeek) {
        // TODO: actually archive the story
        columnStoryPromises.push(commentOnStory(story.id, 'archived'))
      } else if (hasWarningComment && !hasTaggingComment && warningCommentOlderThanOneWeek) {
        columnStoryPromises.push(commentOnStory(story.id, generatedTaggingMessage))
      } else if (!hasWarningComment) {
        columnStoryPromises.push(commentOnStory(story.id, WARNING_MESSAGE))
      }
    }
  }

  await Promise.all(columnStoryPromises)
}
