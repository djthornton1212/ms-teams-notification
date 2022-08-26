import * as core from '@actions/core'
import {Octokit} from '@octokit/rest'
import axios from 'axios'
import moment from 'moment-timezone'
import {createMessageCard} from './message-card'
import yaml from 'yaml'
import {Fact} from './models'
import * as github from '@actions/github'

const escapeMarkdownTokens = (text: string) =>
  text
    .replace(/\n\ {1,}/g, '\n ')
    .replace(/\_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\|/g, '\\|')
    .replace(/#/g, '\\#')
    .replace(/-/g, '\\-')
    .replace(/>/g, '\\>')

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', {required: true})
    const msTeamsWebhookUri: string = core.getInput('ms-teams-webhook-uri', {
      required: true
    })

    // Hardcoded event type
    const customFacts = core.getInput('custom-facts')
    let factsObj = [
      new Fact(
        'Event type:',
        '`' + process.env.GITHUB_EVENT_NAME?.toUpperCase() + '`'
      )
    ]

    // Read custom facts from input
    if (customFacts && customFacts.toLowerCase() !== 'null') {
      try {
        let customFactsCounter = 0
        const customFactsList = yaml.parse(customFacts)
        if (Array.isArray(customFactsList)) {
          ;(customFactsList as any[]).forEach(fact => {
            if (fact.name !== undefined && fact.value !== undefined) {
              factsObj.push(new Fact(fact.name + ':', '`' + fact.value + '`'))
              customFactsCounter++
            }
          })
        }
        console.log(`Added ${customFactsCounter} custom facts.`)
      } catch {
        console.log('Invalid custom-facts value.')
      }
    }

    const notificationSummary =
      core.getInput('notification-summary') || 'GitHub Action Notification'
    const notificationColor = core.getInput('notification-color') || '0b93ff'
    const viewChanges = core.getInput('view-commit-changes') ? true : false
    const viewPullRequest = core.getInput('view-pull-request') ? true : false
    const viewWorkflowRun = core.getInput('view-workflow-run') ? true : false
    const timezone = core.getInput('timezone') || 'UTC'

    const timestamp = moment()
      .tz(timezone)
      .format('dddd, MMMM Do YYYY, h:mm:ss a z')

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
    const sha = process.env.GITHUB_SHA || ''
    const runId = process.env.GITHUB_RUN_ID || ''
    const runNum = process.env.GITHUB_RUN_NUMBER || ''
    const params = {owner, repo, ref: sha}

    const pullNumber =
      process.env.GITHUB_EVENT_NAME?.match(/\b(?:issue.*|pull.*)\b/) &&
      viewPullRequest
        ? JSON.stringify(github.context.issue.number)
        : ''

    const repoName = params.owner + '/' + params.repo
    const repoUrl = `https://github.com/${repoName}`

    const octokit = new Octokit({auth: `token ${githubToken}`})
    const commit = await octokit.repos.getCommit(params)
    const author = commit.data.author

    const messageCard = await createMessageCard(
      notificationSummary,
      notificationColor,
      commit,
      author,
      runNum,
      runId,
      repoName,
      sha,
      repoUrl,
      timestamp,
      pullNumber,
      factsObj,
      viewChanges,
      viewWorkflowRun
    )

    console.log(messageCard)

    axios
      .post(msTeamsWebhookUri, messageCard)
      .then(function(response) {
        console.log(response)
        core.debug(response.data)
      })
      .catch(function(error) {
        core.debug(error)
      })
  } catch (error) {
    console.log(error)
    let errorMessage = 'Failed to do something exceptional'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.setFailed(errorMessage)
  }
}

run()
