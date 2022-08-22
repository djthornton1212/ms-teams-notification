import {Fact} from './models'

export function createMessageCard(
  notificationSummary: string,
  notificationColor: string,
  commit: any,
  author: any,
  runNum: string,
  runId: string,
  repoName: string,
  sha: string,
  repoUrl: string,
  timestamp: string,
  pullNumber: string,
  factsObj: Fact[],
  viewChanges: boolean,
  viewWorkflowRun: boolean
): any {
  let avatar_url =
    'https://www.gravatar.com/avatar/05b6d8cc7c662bf81e01b39254f88a48?d=identicon'
  if (author) {
    if (author.avatar_url) {
      avatar_url = author.avatar_url
    }
  }

  let potentialAction = []

  if (viewChanges) {
    potentialAction.push({
      '@context': 'http://schema.org',
      target: [commit.data.html_url],
      '@type': 'ViewAction',
      name: 'View Commit Changes'
    })
  }

  if (viewWorkflowRun) {
    potentialAction.push({
      '@context': 'http://schema.org',
      target: [`${repoUrl}/actions/runs/${runId}`],
      '@type': 'ViewAction',
      name: 'View Workflow Run'
    })
  }

  if (pullNumber) {
    potentialAction.push({
      '@context': 'http://schema.org',
      target: [`${repoUrl}/pull/${pullNumber}`],
      '@type': 'ViewAction',
      name: 'View Pull Request'
    })
  }

  const messageCard = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: notificationSummary,
    themeColor: notificationColor,
    title: notificationSummary,
    sections: [
      {
        activityTitle: `**CI #${runNum} (commit ${sha.substring(
          0,
          7
        )})** on [${repoName}](${repoUrl})`,
        activityImage: avatar_url,
        activitySubtitle: `by ${commit.data.commit.author.name}
          [(@${author.login})](${author.html_url}) on ${timestamp}`,
        facts: factsObj
      }
    ],
    potentialAction: potentialAction
  }

  if (potentialAction.length > 0) {
    messageCard.potentialAction = potentialAction
  }
  return messageCard
}
