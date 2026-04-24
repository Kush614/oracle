---
name: Guild Agent Development
description: Local agent development using the Guild CLI. Activated when user mentions creating agents, guild agent commands, saving/publishing agents, or agent development workflow. Handles proper CLI workflow and prevents direct git operations.
---

# Guild Agent Development

Build agents for Guild using the CLI. **Always use the Guild CLI for agent operations - never use raw git commands.**

## MCP vs CLI

If Guild MCP tools are available (check for tools prefixed with `guild_`), use them for **read operations**: searching agents, listing workspaces, reading contexts, checking sessions, viewing credentials. MCP tools are faster and don't require shell execution.

Use the **CLI** (via Bash) for **local development operations**: `guild agent init`, `guild agent save`, `guild agent test`, `guild agent pull`, `guild agent clone`. These involve the local filesystem and git, which MCP can't do.

## When to Use This

Activate when user:

- Mentions "guild agent" commands
- Wants to create, save, or publish an agent
- Is working in an agent directory
- Mentions agent development workflow
- Asks about agent versioning or publishing
- Wants to build a new agent

## Quick Reference

### Project Setup

```bash
# Install Guild CLI skills for coding assistants
guild setup

# Also create a CLAUDE.md template
guild setup --claude-md
```

### Creating Agents

```bash
# Create and initialize a new agent (interactive - prompts for name and template)
guild agent init

# Create with specific name and template
guild agent init --name my-agent --template LLM
guild agent init --name my-agent --template AUTO_MANAGED_STATE
guild agent init --name my-agent --template BLANK

# Initialize with fork of existing agent
guild agent init --fork owner/agent-name

# Clone to work on existing agent
guild agent clone owner/agent-name
```

### Syncing and Saving

Git owns the working tree, Guild owns the remote. Use normal git commands to stage and commit, then `guild agent save` to push and create a version.

```bash
# Pull remote changes (e.g., edits from other collaborators)
guild agent pull

# Commit with git, then push via Guild (creates draft)
git add . && git commit -m "Description of changes"
guild agent save

# Or stage+commit+push in one step
guild agent save -A --message "Description of changes"

# Save and wait for validation
guild agent save --message "Fix bug" --wait

# Save, validate, and publish
guild agent save -A --message "Release v1.0" --wait --publish
```

### Testing

```bash
# Interactive test session
guild agent test

# Ephemeral test (no persistent storage)
guild agent test --ephemeral

# Test with specific input
guild agent chat "Hello, can you help me?"
```

## Guild CLI Is the ONLY Tool for Agent Operations

**ALL agent work — creating, saving, testing, debugging, investigating — goes through Guild CLI.**

### For Creating and Modifying

- ✅ `guild agent init`, `guild agent clone`
- ✅ `git add`, `git commit` (manage your own working tree)
- ✅ `guild agent save` (push commits and create a version)
- ✅ `guild agent save -A --message "desc"` (stage+commit+push in one step)
- ✅ `guild agent pull` (sync remote changes into local directory)
- ✅ `guild agent test`, `guild agent chat`
- ❌ NEVER use `git push` directly (a pre-push hook blocks this — use `guild agent save`)
- ❌ NEVER use `gh repo` for agent operations
- ❌ NEVER manually create `package.json`, `tsconfig.json`, or `guild.json`

### For Investigating and Debugging

- ✅ `guild agent clone <id>` to get agent source locally
- ✅ `guild agent versions <id>` to check version history
- ✅ `guild agent code <id>` to view source
- ✅ `guild agent get <id>` to view agent info
- ✅ `guild agent grep <pattern>` to search across all agent code
- ✅ Read local clones created by `guild agent clone`
- ❌ NEVER use `git clone`, `gh repo`, or direct API calls for agent source — always use Guild CLI

### If Guild CLI Can't Do Something

**STOP and tell the user:**

1. What you need to do
2. Why Guild CLI can't do it
3. Why you think `gh`/`git` is needed
4. Let the user decide — never reach for `gh`/`git` on your own

---

## SDK Reference

### Imports

The SDK core comes from `@guildai/agents-sdk`. Service tools are in separate `@guildai-services/*` packages.

```typescript
// Agent factories
import { agent, llmAgent } from '@guildai/agents-sdk';

// Types
import type {
  Task,
  AgentResult,
  TypedToolResult,
  TypedToolError,
} from '@guildai/agents-sdk';

// Result helpers (for self-managed state agents)
import { ask, output, callTools } from '@guildai/agents-sdk';

// Platform tools (from SDK)
import { guildTools, userInterfaceTools } from '@guildai/agents-sdk';

// Service tools (from separate packages - NOT from SDK)
import { azureDevOpsTools } from '@guildai-services/guildai~azure-devops';
import { bitbucketTools } from '@guildai-services/guildai~bitbucket';
import { confluenceTools } from '@guildai-services/guildai~confluence';
import { cypressTools } from '@guildai-services/guildai~cypress';
import { figmaTools } from '@guildai-services/guildai~figma';
import { gitHubTools } from '@guildai-services/guildai~github';
import { googleComputeTools } from '@guildai-services/guildai~google-compute';
import { googleLoggingTools } from '@guildai-services/guildai~google-logging';
import { jiraTools } from '@guildai-services/guildai~jira';
import { pipedreamTools } from '@guildai-services/guildai~pipedream';
import { slackTools } from '@guildai-services/guildai~slack';
import { testrailTools } from '@guildai-services/guildai~testrail';
import { zendeskTools } from '@guildai-services/guildai~zendesk';

// Utilities
import { pick, omit, progressLogNotifyEvent } from '@guildai/agents-sdk';

// Advanced (for compiled agents with LLM tool loops)
import { delegatedCallsOf, asToolResultContent } from '@guildai/agents-sdk';

// Zod (provided by runtime, do NOT add to dependencies)
import { z } from 'zod';
```

### Service Packages Table

Service tools are in separate `@guildai-services/*` packages. The runtime resolves them automatically.

| Service        | Package                                    | Export               | Tool Name Prefix  |
| -------------- | ------------------------------------------ | -------------------- | ----------------- |
| Azure DevOps   | `@guildai-services/guildai~azure-devops`   | `azureDevOpsTools`   | `azure_devops_`   |
| Bitbucket      | `@guildai-services/guildai~bitbucket`      | `bitbucketTools`     | `bitbucket_`      |
| Confluence     | `@guildai-services/guildai~confluence`     | `confluenceTools`    | `confluence_`     |
| Cypress        | `@guildai-services/guildai~cypress`        | `cypressTools`       | `cypress_`        |
| Figma          | `@guildai-services/guildai~figma`          | `figmaTools`         | `figma_`          |
| GitHub         | `@guildai-services/guildai~github`         | `gitHubTools`        | `github_`         |
| Google Compute | `@guildai-services/guildai~google-compute` | `googleComputeTools` | `google_compute_` |
| Google Logging | `@guildai-services/guildai~google-logging` | `googleLoggingTools` | `google_logging_` |
| Guild          | `@guildai/agents-sdk`                      | `guildTools`         | `guild_`          |
| Jira           | `@guildai-services/guildai~jira`           | `jiraTools`          | `jira_`           |
| Linear         | `@guildai-services/guildai~linear`         | `linearTools`        | `linear_`         |
| NewRelic       | `@guildai-services/guildai~newrelic`       | `newrelicTools`      | `newrelic_`       |
| Pipedream      | `@guildai-services/guildai~pipedream`      | `pipedreamTools`     | `pipedream_`      |
| Slack          | `@guildai-services/guildai~slack`          | `slackTools`         | `slack_`          |
| TestRail       | `@guildai-services/guildai~testrail`       | `testrailTools`      | `testrail_`       |
| User Interface | `@guildai/agents-sdk`                      | `userInterfaceTools` | `ui_`             |
| Zendesk        | `@guildai-services/guildai~zendesk`        | `zendeskTools`       | `zendesk_`        |

### Tool Access via `task.tools.*`

All tool calls go through `task.tools.<toolName>(args)`. This is the primary API.

```typescript
// GitHub
const pr = await task.tools.github_pulls_get({ owner, repo, pull_number: 123 });
const results = await task.tools.github_search_issues_and_pull_requests({
  q: 'is:pr is:open repo:owner/name',
});

// Slack
await task.tools.slack_chat_post_message({ channel: 'C1234567890', text: 'Hello!' });

// Jira
const issues = await task.tools.jira_search_and_reconsile_issues_using_jql({
  jql: 'project = MYPROJ AND status = Open',
});

// User interface
const response = await task.tools.ui_prompt({
  type: 'text',
  text: 'What repo?',
});
await task.tools.ui_notify(progressLogNotifyEvent('Processing...'));

// Guild
const me = await task.tools.guild_get_me({});
await task.tools.guild_credentials_request({ service: 'GITHUB' });
```

### Task Properties

| Property         | Description                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `task.sessionId` | Session ID for correlating operations                                                       |
| `task.tools`     | Primary API for calling all tools                                                           |
| `task.llm`       | LLM service — call `task.llm.generateText({ messages, system, tools })` for AI model access |
| `task.console`   | Debug logging (`task.console.debug(...)`, `.info(...)`, `.warn(...)`, `.error(...)`)        |
| `task.save()`    | Persist agent state (self-managed state agents only)                                        |
| `task.restore()` | Retrieve previously saved state (self-managed state agents only)                            |
| `task.guild`     | **Deprecated** — use `task.tools.guild_*` instead                                           |
| `task.ui`        | **Deprecated** — use `task.tools.ui_*` instead                                              |

---

## Agent Patterns

Three patterns, ordered by simplicity:

### 1. LLM Agent (`llmAgent()`) — Simplest

For conversational/prompt-driven agents where the LLM IS the logic. No `run()` or `start()` needed.

```typescript
import { guildTools, llmAgent, pick } from '@guildai/agents-sdk';
import { gitHubTools } from '@guildai-services/guildai~github';

export default llmAgent({
  description: 'Helps users with GitHub questions',
  tools: {
    ...pick(gitHubTools, ['github_issues_list_for_repo', 'github_issues_get']),
    ...guildTools, // ALWAYS spread fully — never pick() from guildTools
  },
  systemPrompt: `
    You are a helpful assistant that answers questions about GitHub repositories.
    Use the GitHub tools to look up information when asked.
  `,
  mode: 'multi-turn', // "one-shot" (default) or "multi-turn"
});
```

**Config options:**

```typescript
llmAgent({
  // ...
  config: {
    provider: 'anthropic', // "anthropic" | "openai" | "gemini"
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
  },
});
```

### 2. Automatic State Agent (`run()`) — Recommended for Code-First

Runtime manages state via continuations. Return the output object directly. Use `task.tools.*` for all tool calls. Requires `"use agent"` directive.

```typescript
'use agent';

import {
  type Task,
  agent,
  guildTools,
  pick,
  userInterfaceTools,
} from '@guildai/agents-sdk';
import { gitHubTools } from '@guildai-services/guildai~github';
import { z } from 'zod';

const inputSchema = z.object({
  type: z.literal('text'),
  text: z.string().describe('Repository in owner/repo format'),
});

type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal('text'),
  text: z.string().describe('Summary of open PRs'),
});

type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(gitHubTools, ['github_search_issues_and_pull_requests']),
  ...guildTools, // ALWAYS spread fully — never pick() from guildTools
  ...userInterfaceTools,
};

type Tools = typeof tools;

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const repo = input.text.trim();

  const results = await task.tools.github_search_issues_and_pull_requests({
    q: `is:pr is:open repo:${repo}`,
    per_page: 20,
  });

  if (!results.items?.length) {
    return { type: 'text', text: `No open PRs found in ${repo}` };
  }

  const summary = results.items
    .map((pr) => `- #${pr.number}: ${pr.title} (by ${pr.user?.login})`)
    .join('\n');

  return { type: 'text', text: `## Open PRs in ${repo}\n\n${summary}` };
}

export default agent({
  description: 'Lists open PRs in a GitHub repository',
  inputSchema,
  outputSchema,
  tools,
  run,
});
```

**Key points:**

- `run()` returns the OUTPUT directly (not wrapped in `{ type: "output", output: ... }`)
- The runtime handles continuations — you can `await` tool calls inline
- `"use agent"` directive at top of file is optional (the Babel compiler recognizes it but strips it)
- No `identifier` field needed

### 3. Self-Managed State Agent (`start()`/`onToolResults()`)

For explicit state control. Uses `ask()`, `output()`, `callTools()` helpers and `task.save()`/`task.restore()`.

```typescript
import {
  agent,
  ask,
  output,
  callTools,
  userInterfaceTools,
  type Task,
  type AgentResult,
  type TypedToolResult,
  type TypedToolError,
} from '@guildai/agents-sdk';
import { z } from 'zod';

const inputSchema = z.object({
  type: z.literal('text'),
  text: z.string().describe("The user's input"),
});

const outputSchema = z.object({
  type: z.literal('text'),
  text: z.string().describe("The agent's response"),
});

const stateSchema = z.object({
  count: z.number(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;
type State = z.infer<typeof stateSchema>;
const tools = { ...userInterfaceTools };
type Tools = typeof tools;

async function start(
  input: Input,
  task: Task<Tools, State>
): Promise<AgentResult<Output, Tools>> {
  await task.save({ count: 1 });
  return ask(`Got: ${input.text}`);
}

async function onToolResults(
  results: Array<TypedToolResult<Tools> | TypedToolError<Tools>>,
  task: Task<Tools, State>
): Promise<AgentResult<Output, Tools>> {
  const state = await task.restore();
  const result = results[0];
  if (result.type === 'tool-result' && result.output.text === 'done') {
    return output({ type: 'text', text: `Final count: ${state!.count}` });
  }
  await task.save({ count: state!.count + 1 });
  return ask(`Count: ${state!.count + 1}`);
}

export default agent({
  description: 'Tracks conversation state explicitly',
  inputSchema,
  outputSchema,
  stateSchema,
  tools,
  start,
  onToolResults,
});
```

**Key points:**

- `start()` and `onToolResults()` return `AgentResult<Output, Tools>`
- `ask(prompt)` — sends a `ui_prompt` tool call to get user input
- `output(value)` — wraps your output as `{ type: "output", output: value }`
- `callTools([...])` — requests the runtime to execute tool calls
- `task.save(state)` / `task.restore()` — persist state between invocations

---

## Agent-to-Agent Delegation

Tools without an `execute` function are dispatched as child agents by the runtime. Define a tool that delegates to another agent:

```typescript
'use agent';

import { agent, userInterfaceTools } from '@guildai/agents-sdk';
import { z } from 'zod';
import { tool } from 'ai';

const summarizeAgent = tool({
  description: 'Summarize a document (dispatched to summarize-agent)',
  parameters: z.object({
    type: z.literal('text'),
    text: z.string().describe('The document to summarize'),
  }),
  // No execute function — runtime dispatches to the agent named "summarize-agent"
});

export default agent({
  description: 'Orchestrates document processing',
  tools: {
    ...userInterfaceTools,
    summarize_agent: summarizeAgent, // tool name maps to agent
  },
  // ...
});
```

---

## Advanced: Compiled Agent Patterns

For agents that need an LLM tool-calling loop with fine-grained control over which tool calls the LLM handles vs which get delegated to the runtime:

```typescript
import {
  agent,
  callTools,
  output,
  delegatedCallsOf,
  asToolResultContent,
  userInterfaceTools,
  type Task,
  type AgentResult,
  type TypedToolResult,
  type TypedToolError,
} from '@guildai/agents-sdk';
import { gitHubTools } from '@guildai-services/guildai~github';
import { slackTools } from '@guildai-services/guildai~slack';
import type { ModelMessage } from 'ai';
import { z } from 'zod';

const tools = { ...gitHubTools, ...slackTools, ...userInterfaceTools };
type Tools = typeof tools;

// Separate tools the LLM can execute directly from those needing delegation
const llmTools = { ...gitHubTools }; // LLM gets execute access to these
const agentTools = { ...slackTools, ...userInterfaceTools }; // These get delegated

async function start(input, task: Task<Tools>) {
  const messages: ModelMessage[] = [{ role: 'user', content: input.text }];

  const result = await task.llm.generateText({
    system: 'You are a helpful assistant.',
    messages,
    tools: llmTools, // Only give LLM the tools it can execute
  });

  // Check for delegated (unexecuted) tool calls
  const delegated = delegatedCallsOf<Tools>(result.content);
  if (delegated.length > 0) {
    // Save conversation state for onToolResults
    await task.save({ messages: [...messages, ...result.response.messages] });
    return callTools(delegated);
  }

  return output({ type: 'text', text: result.text });
}

async function onToolResults(
  results: Array<TypedToolResult<Tools> | TypedToolError<Tools>>,
  task: Task<Tools>
) {
  const state = await task.restore();
  // Convert results back into LLM message format
  state.messages.push({
    role: 'tool',
    content: asToolResultContent(results),
  });

  // Continue the conversation
  // ...
}
```

**Key utilities:**

- `task.llm.generateText({ messages, system, tools })` — call the LLM with automatic authentication and provider selection. The runtime handles model selection and credential injection.
- `delegatedCallsOf<Tools>(content)` — extracts unexecuted tool calls from `generateText` results that need runtime delegation
- `asToolResultContent(results)` — converts `TypedToolResult[]` into LLM message format for conversation history

### Slack-Specific Patterns

When posting to Slack, convert markdown to Slack's mrkdwn format. Use an inline converter
(`slackify-markdown` is CJS and breaks in the ESM agent runtime):

```typescript
// Simple markdown-to-Slack-mrkdwn converter (inline — do NOT use slackify-markdown)
function slackifyMarkdown(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // bold: **text** → *text*
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_') // italic: *text* → _text_
    .replace(/~~(.+?)~~/g, '~$1~') // strikethrough
    .replace(/^### (.+)$/gm, '*$1*') // h3 → bold
    .replace(/^## (.+)$/gm, '*$1*') // h2 → bold
    .replace(/^# (.+)$/gm, '*$1*') // h1 → bold
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>') // links
    .replace(/^> (.+)$/gm, '> $1') // blockquotes (same syntax)
    .replace(/`([^`]+)`/g, '`$1`'); // inline code (same syntax)
}

// In your agent:
const responseText = '## Summary\n- Item 1\n- Item 2';
const slackText = slackifyMarkdown(responseText);

await task.tools.slack_chat_post_message({
  channel: 'C1234567890',
  text: slackText,
});
```

---

## Anti-Hallucination Guide

**Only use methods and patterns that actually exist.**

<!-- BEGIN GENERATED TOOL CATALOG -->
<!-- Generated by: cli/scripts/generate-tool-catalog.sh -->
<!-- Do NOT edit manually — re-run the script after changing endpoints.txt -->

### Available Service Tools (914 tools)

**CRITICAL: Only use tool names listed below.** If a tool isn't listed here, it doesn't exist. Do not guess tool names based on API patterns.

Use `pick()` to select specific tools, or `omit()` to exclude specific tools:

```typescript
// Include only specific tools
const tools = {
  ...pick(gitHubTools, ['github_repos_get', 'github_pulls_list']),
  ...guildTools,
};

// Include all tools except specific ones
const tools = {
  ...omit(gitHubTools, ['github_repos_delete', 'github_repos_update']),
  ...guildTools,
};
```

#### Azure DevOps (`azure_devops_` prefix, 122 tools)

```
azure_devops_builds_list — Gets a list of builds.
azure_devops_builds_queue — Queues a build
azure_devops_builds_update_builds — Updates multiple builds.
azure_devops_builds_get — Gets a build
azure_devops_builds_update_build — Updates a build.
azure_devops_builds_delete — Deletes a build.
azure_devops_artifacts_list — Gets all artifacts for a build.
azure_devops_artifacts_create — Associates an artifact with a build.
azure_devops_builds_get_build_changes — Gets the changes associated with a build
azure_devops_builds_get_build_logs — Gets the logs for a build.
azure_devops_builds_get_build_log — Gets an individual log file for a build.
azure_devops_stages_update — Update a build stage
azure_devops_timeline_get — Gets details for a build
azure_devops_definitions_list — Gets a list of definitions.
azure_devops_definitions_create — Creates a new definition.
azure_devops_definitions_get — Gets a definition, optionally at a specific revision.
azure_devops_definitions_update — Updates an existing build definition.  In order for this operation to succeed, the value of the "Revision" property of the request body must match the existing build definition's. It is recommended that you obtain the existing build definition by using GET, modify the build definition as necessary, and then submit the modified definition with PUT.
azure_devops_definitions_restore_definition — Restores a deleted definition
azure_devops_definitions_delete — Deletes a definition and all associated builds.
azure_devops_policy_configurations_get — Retrieve a list of policy configurations by a given set of scope/filtering criteria.
azure_devops_pull_requests_get_pull_requests_by_project — Retrieve all pull requests matching a specified criteria.
azure_devops_pull_requests_get_pull_request_by_id — Retrieve a pull request.
azure_devops_repositories_list — Retrieve git repositories.
azure_devops_repositories_create — Create a git repository in a team project.
azure_devops_repositories_get_repository — Retrieve a git repository.
azure_devops_repositories_update — Updates the Git repository with either a new repo name or a new default branch.
azure_devops_repositories_delete — Delete a git repository
azure_devops_commits_get_push_commits — Retrieve a list of commits associated with a particular push.
azure_devops_commits_get — Retrieve a particular commit.
azure_devops_commits_get_changes — Retrieve changes for a particular commit.
azure_devops_statuses_list — Get statuses associated with the Git commit.
azure_devops_statuses_create — Create Git commit status.
azure_devops_commits_get_commits_batch — Retrieve git commits for a project matching the search criteria
azure_devops_items_list — Get Item Metadata and/or Content for a collection of items. The download parameter is to indicate whether the content should be available as a download or just sent as a stream in the response. Doesn't apply to zipped content which is always returned as a download.
azure_devops_items_get_items_batch — Retrieves a batch of items in a repo / project for a given list of paths or a long path
azure_devops_pull_requests_get_pull_requests — Retrieve all pull requests matching a specified criteria.
azure_devops_pull_requests_create — Create a pull request.
azure_devops_pull_requests_get_pull_request — Retrieve a pull request.
azure_devops_pull_requests_update — Update a pull request
azure_devops_pull_request_statuses_list — Get all the statuses associated with a pull request.
azure_devops_pull_request_statuses_create — Create a pull request status.
azure_devops_pull_request_statuses_update — Update pull request statuses collection. The only supported operation type is `remove`.
azure_devops_pull_request_statuses_get — Get the specific pull request status by ID. The status ID is unique within the pull request across all iterations.
azure_devops_pull_request_statuses_delete — Delete pull request status.
azure_devops_refs_list — Queries the provided repository for its refs and returns them.
azure_devops_refs_update_refs — Creating, updating, or deleting refs(branches).
azure_devops_refs_update_ref — Lock or Unlock a branch.
azure_devops_stats_list — Retrieve statistics about all branches within a repository.
azure_devops_pipelines_list — Get a list of pipelines.
azure_devops_pipelines_create — Create a pipeline.
azure_devops_pipelines_get — Gets a pipeline, optionally at the specified version
azure_devops_runs_list — Gets top 10000 runs for a particular pipeline.
azure_devops_runs_run_pipeline — Runs a pipeline.
azure_devops_runs_get — Gets a run for a particular pipeline.
azure_devops_artifacts_get — Get a specific artifact from a pipeline run
azure_devops_logs_list — Get a list of logs from a pipeline run.
azure_devops_logs_get — Get a specific log from a pipeline run
azure_devops_attachments_create — Uploads an attachment.
azure_devops_attachments_get — Downloads an attachment.
azure_devops_attachments_upload_chunk — Uploads an attachment chunk.
azure_devops_fields_list — Returns information for all fields. The project ID/name parameter is optional.
azure_devops_fields_create — Create a new field.
azure_devops_fields_get — Gets information on a specific field.
azure_devops_fields_update — Update a field.
azure_devops_fields_delete — Deletes the field. To undelete a filed, see "Update Field" API.
azure_devops_queries_list — Gets the root queries and their children
azure_devops_queries_get — Retrieves an individual query and its children
azure_devops_queries_create — Creates a query, or moves a query.
azure_devops_queries_update — Update a query or a folder. This allows you to update, rename and move queries and folders.
azure_devops_queries_delete — Delete a query or a folder. This deletes any permission change on the deleted query or folder and any of its descendants if it is a folder. It is important to note that the deleted permission changes cannot be recovered upon undeleting the query or folder.
azure_devops_work_items_list — Returns a list of work items (Maximum 200)
azure_devops_work_items_get_work_item_template — Returns a single work item from a template.
azure_devops_work_items_create — Creates a single work item.
azure_devops_work_items_get_work_item — Returns a single work item.
azure_devops_work_items_update — Updates a single work item.
azure_devops_work_items_delete — Deletes the specified work item and sends it to the Recycle Bin, so that it can be restored back, if required. Optionally, if the destroy parameter has been set to true, it destroys the work item permanently. WARNING: If the destroy parameter is set to true, work items deleted by this command will NOT go to recycle-bin and there is no way to restore/recover them after deletion. It is recommended NOT to use this parameter. If you do, please use this parameter with extreme caution.
azure_devops_work_items_get_work_items_batch — Gets work items for a list of work item ids (Maximum 200)
azure_devops_work_item_types_list — Returns the list of work item types
azure_devops_work_item_types_get — Returns a work item type definition.
azure_devops_approvals_query — List Approvals. This can be used to get a set of pending approvals in a pipeline, on an user or for a resource..
azure_devops_approvals_update — Update approvals.
azure_devops_approvals_get — Get an approval.
azure_devops_check_configurations_list — Get Check configuration by resource type and id
azure_devops_check_configurations_add — Add a check configuration
azure_devops_check_configurations_get — Get Check configuration by Id
azure_devops_check_configurations_update — Update check configuration
azure_devops_check_configurations_delete — Delete check configuration by id
azure_devops_check_configurations_query — Get check configurations for multiple resources by resource type and id.
azure_devops_check_evaluations_evaluate — Initiate an evaluation for a check in a pipeline
azure_devops_check_evaluations_get — Get details for a specific check evaluation
azure_devops_environments_list — Get all environments.
azure_devops_environments_add — Create an environment.
azure_devops_environments_get — Get an environment by its ID.
azure_devops_environments_update — Update the specified environment.
azure_devops_environments_delete — Delete the specified environment.
azure_devops_environmentdeploymentrecords_list — Get environment deployment execution history
azure_devops_pools_get_agent_pools_by_ids — Get a list of agent pools.
azure_devops_pools_add — Create an agent pool.
azure_devops_pools_get — Get information about an agent pool.
azure_devops_pools_update — Update properties on an agent pool
azure_devops_pools_delete — Delete an agent pool.
azure_devops_agents_list — Get a list of agents.
azure_devops_agents_add — Adds an agent to a pool.  You probably don't want to call this endpoint directly. Instead, [configure an agent](https://docs.microsoft.com/azure/devops/pipelines/agents/agents) using the agent download package.
azure_devops_agents_get_pool_permission — Get Permissions on Pool.
azure_devops_agents_replace_agent — Replace an agent.  You probably don't want to call this endpoint directly. Instead, [use the agent configuration script](https://docs.microsoft.com/azure/devops/pipelines/agents/agents) to remove and reconfigure an agent from your organization.
azure_devops_agents_update — Update agent details.
azure_devops_agents_delete — Delete an agent.  You probably don't want to call this endpoint directly. Instead, [use the agent configuration script](https://docs.microsoft.com/azure/devops/pipelines/agents/agents) to remove an agent from your organization.
azure_devops_variablegroups_add — Add a variable group.
azure_devops_variablegroups_share_variable_group — Add a variable group.
azure_devops_variablegroups_update — Update a variable group.
azure_devops_variablegroups_delete — Delete a variable group
azure_devops_deploymentgroups_list — Get a list of deployment groups by name or IDs.
azure_devops_deploymentgroups_add — Create a deployment group.
azure_devops_deploymentgroups_get — Get a deployment group by its ID.
azure_devops_deploymentgroups_update — Update a deployment group.
azure_devops_deploymentgroups_delete — Delete a deployment group.
azure_devops_targets_list — Get a list of deployment targets in a deployment group.
azure_devops_targets_update — Update tags of a list of deployment targets in a deployment group.
azure_devops_targets_get — Get a deployment target by its ID in a deployment group
azure_devops_targets_delete — Delete a deployment target in a deployment group. This deletes the agent from associated deployment pool too.
azure_devops_variablegroups_get_variable_groups_by_id — Get variable groups by ids.
azure_devops_variablegroups_get — Get a variable group.
```

#### Bitbucket (`bitbucket_` prefix, 91 tools)

```
bitbucket_get_repositories_workspace — List repositories in a workspace
bitbucket_get_repositories_workspace_repo_slug — Get a repository
bitbucket_post_repositories_workspace_repo_slug — Create a repository
bitbucket_put_repositories_workspace_repo_slug — Update a repository
bitbucket_delete_repositories_workspace_repo_slug — Delete a repository
bitbucket_get_repositories_workspace_repo_slug_branch_restrictions — List branch restrictions
bitbucket_post_repositories_workspace_repo_slug_branch_restrictions — Create a branch restriction rule
bitbucket_get_repositories_workspace_repo_slug_branch_restrictions_id — Get a branch restriction rule
bitbucket_put_repositories_workspace_repo_slug_branch_restrictions_id — Update a branch restriction rule
bitbucket_delete_repositories_workspace_repo_slug_branch_restrictions_id — Delete a branch restriction rule
bitbucket_get_repositories_workspace_repo_slug_branching_model — Get the branching model for a repository
bitbucket_get_repositories_workspace_repo_slug_branching_model_settings — Get the branching model config for a repository
bitbucket_put_repositories_workspace_repo_slug_branching_model_settings — Update the branching model config for a repository
bitbucket_get_repositories_workspace_repo_slug_commit_commit — Get a commit
bitbucket_get_repositories_workspace_repo_slug_commit_commit_comments — List a commit's comments
bitbucket_post_repositories_workspace_repo_slug_commit_commit_comments — Create comment for a commit
bitbucket_get_repositories_workspace_repo_slug_commit_commit_comments_comment_id — Get a commit comment
bitbucket_put_repositories_workspace_repo_slug_commit_commit_comments_comment_id — Update a commit comment
bitbucket_delete_repositories_workspace_repo_slug_commit_commit_comments_comment_id — Delete a commit comment
bitbucket_get_repositories_workspace_repo_slug_commit_commit_statuses — List commit statuses for a commit
bitbucket_get_repositories_workspace_repo_slug_commits — List commits
bitbucket_post_repositories_workspace_repo_slug_commits — List commits with include/exclude
bitbucket_get_repositories_workspace_repo_slug_default_reviewers — List default reviewers
bitbucket_get_repositories_workspace_repo_slug_default_reviewers_target_username — Get a default reviewer
bitbucket_put_repositories_workspace_repo_slug_default_reviewers_target_username — Add a user to the default reviewers
bitbucket_delete_repositories_workspace_repo_slug_default_reviewers_target_username — Remove a user from the default reviewers
bitbucket_get_repositories_workspace_repo_slug_diff_spec — Compare two commits
bitbucket_get_repositories_workspace_repo_slug_diffstat_spec — Compare two commit diff stats
bitbucket_get_repositories_workspace_repo_slug_filehistory_commit_path — List commits that modified a file
bitbucket_get_repositories_workspace_repo_slug_hooks — List webhooks for a repository
bitbucket_post_repositories_workspace_repo_slug_hooks — Create a webhook for a repository
bitbucket_get_repositories_workspace_repo_slug_hooks_uid — Get a webhook for a repository
bitbucket_put_repositories_workspace_repo_slug_hooks_uid — Update a webhook for a repository
bitbucket_delete_repositories_workspace_repo_slug_hooks_uid — Delete a webhook for a repository
bitbucket_get_repositories_workspace_repo_slug_issues — List issues
bitbucket_post_repositories_workspace_repo_slug_issues — Create an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id — Get an issue
bitbucket_put_repositories_workspace_repo_slug_issues_issue_id — Update an issue
bitbucket_delete_repositories_workspace_repo_slug_issues_issue_id — Delete an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id_attachments — List attachments for an issue
bitbucket_post_repositories_workspace_repo_slug_issues_issue_id_attachments — Upload an attachment to an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id_attachments_path — Get attachment for an issue
bitbucket_delete_repositories_workspace_repo_slug_issues_issue_id_attachments_path — Delete an attachment for an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id_comments — List comments on an issue
bitbucket_post_repositories_workspace_repo_slug_issues_issue_id_comments — Create a comment on an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id_comments_comment_id — Get a comment on an issue
bitbucket_put_repositories_workspace_repo_slug_issues_issue_id_comments_comment_id — Update a comment on an issue
bitbucket_delete_repositories_workspace_repo_slug_issues_issue_id_comments_comment_id — Delete a comment on an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id_vote — Check if current user voted for an issue
bitbucket_put_repositories_workspace_repo_slug_issues_issue_id_vote — Vote for an issue
bitbucket_delete_repositories_workspace_repo_slug_issues_issue_id_vote — Remove vote for an issue
bitbucket_get_repositories_workspace_repo_slug_issues_issue_id_watch — Check if current user is watching a issue
bitbucket_put_repositories_workspace_repo_slug_issues_issue_id_watch — Watch an issue
bitbucket_delete_repositories_workspace_repo_slug_issues_issue_id_watch — Stop watching an issue
bitbucket_get_repositories_workspace_repo_slug_pullrequests — List pull requests
bitbucket_post_repositories_workspace_repo_slug_pullrequests — Create a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_activity — List a pull request activity log
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id — Get a pull request
bitbucket_put_repositories_workspace_repo_slug_pullrequests_pull_request_id — Update a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_activity — List a pull request activity log
bitbucket_post_repositories_workspace_repo_slug_pullrequests_pull_request_id_approve — Approve a pull request
bitbucket_delete_repositories_workspace_repo_slug_pullrequests_pull_request_id_approve — Unapprove a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_comments — List comments on a pull request
bitbucket_post_repositories_workspace_repo_slug_pullrequests_pull_request_id_comments — Create a comment on a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_comments_comment_id — Get a comment on a pull request
bitbucket_put_repositories_workspace_repo_slug_pullrequests_pull_request_id_comments_comment_id — Update a comment on a pull request
bitbucket_delete_repositories_workspace_repo_slug_pullrequests_pull_request_id_comments_comment_id — Delete a comment on a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_commits — List commits on a pull request
bitbucket_post_repositories_workspace_repo_slug_pullrequests_pull_request_id_decline — Decline a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_diff — List changes in a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_diffstat — Get the diff stat for a pull request
bitbucket_post_repositories_workspace_repo_slug_pullrequests_pull_request_id_merge — Merge a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_patch — Get the patch for a pull request
bitbucket_post_repositories_workspace_repo_slug_pullrequests_pull_request_id_request_changes — Request changes for a pull request
bitbucket_delete_repositories_workspace_repo_slug_pullrequests_pull_request_id_request_changes — Remove change request for a pull request
bitbucket_get_repositories_workspace_repo_slug_pullrequests_pull_request_id_statuses — List commit statuses for a pull request
bitbucket_get_repositories_workspace_repo_slug_refs_branches — List open branches
bitbucket_post_repositories_workspace_repo_slug_refs_branches — Create a branch
bitbucket_get_repositories_workspace_repo_slug_refs_branches_name — Get a branch
bitbucket_delete_repositories_workspace_repo_slug_refs_branches_name — Delete a branch
bitbucket_get_repositories_workspace_repo_slug_src — Get the root directory of the main branch
bitbucket_post_repositories_workspace_repo_slug_src — Create a commit by uploading a file
bitbucket_get_repositories_workspace_repo_slug_src_commit_path — Get file or directory contents
bitbucket_get_workspaces — List workspaces for user
bitbucket_get_workspaces_workspace — Get a workspace
bitbucket_get_workspaces_workspace_members — List users in a workspace
bitbucket_get_workspaces_workspace_projects — List projects in a workspace
bitbucket_post_workspaces_workspace_projects — Create a project in a workspace
bitbucket_get_workspaces_workspace_projects_project_key — Get a project for a workspace
bitbucket_put_workspaces_workspace_projects_project_key — Update a project for a workspace
bitbucket_delete_workspaces_workspace_projects_project_key — Delete a project for a workspace
```

#### Confluence (`confluence_` prefix, 212 tools)

```
confluence_get_admin_key — Get Admin Key
confluence_enable_admin_key — Enable Admin Key
confluence_disable_admin_key — Disable Admin Key
confluence_get_attachments — Get attachments
confluence_get_attachment_by_id — Get attachment by id
confluence_delete_attachment — Delete attachment
confluence_get_attachment_labels — Get labels for attachment
confluence_get_attachment_operations — Get permitted operations for attachment
confluence_get_attachment_content_properties — Get content properties for attachment
confluence_create_attachment_property — Create content property for attachment
confluence_get_attachment_content_properties_by_id — Get content property for attachment by id
confluence_update_attachment_property_by_id — Update content property for attachment by id
confluence_delete_attachment_property_by_id — Delete content property for attachment by id
confluence_get_attachment_versions — Get attachment versions
confluence_get_attachment_version_details — Get version details for attachment version
confluence_get_attachment_comments — Get attachment comments
confluence_get_blog_posts — Get blog posts
confluence_create_blog_post — Create blog post
confluence_get_blog_post_by_id — Get blog post by id
confluence_update_blog_post — Update blog post
confluence_delete_blog_post — Delete blog post
confluence_get_blogpost_attachments — Get attachments for blog post
confluence_get_custom_content_by_type_in_blog_post — Get custom content by type in blog post
confluence_get_blog_post_labels — Get labels for blog post
confluence_get_blog_post_like_count — Get like count for blog post
confluence_get_blog_post_like_users — Get account IDs of likes for blog post
confluence_get_blogpost_content_properties — Get content properties for blog post
confluence_create_blogpost_property — Create content property for blog post
confluence_get_blogpost_content_properties_by_id — Get content property for blog post by id
confluence_update_blogpost_property_by_id — Update content property for blog post by id
confluence_delete_blogpost_property_by_id — Delete content property for blogpost by id
confluence_get_blog_post_operations — Get permitted operations for blog post
confluence_get_blog_post_versions — Get blog post versions
confluence_get_blog_post_version_details — Get version details for blog post version
confluence_convert_content_ids_to_content_types — Convert content ids to content types
confluence_get_custom_content_by_type — Get custom content by type
confluence_create_custom_content — Create custom content
confluence_get_custom_content_by_id — Get custom content by id
confluence_update_custom_content — Update custom content
confluence_delete_custom_content — Delete custom content
confluence_get_custom_content_attachments — Get attachments for custom content
confluence_get_custom_content_comments — Get custom content comments
confluence_get_custom_content_labels — Get labels for custom content
confluence_get_custom_content_operations — Get permitted operations for custom content
confluence_get_custom_content_content_properties — Get content properties for custom content
confluence_create_custom_content_property — Create content property for custom content
confluence_get_custom_content_content_properties_by_id — Get content property for custom content by id
confluence_update_custom_content_property_by_id — Update content property for custom content by id
confluence_delete_custom_content_property_by_id — Delete content property for custom content by id
confluence_get_labels — Get labels
confluence_get_label_attachments — Get attachments for label
confluence_get_label_blog_posts — Get blog posts for label
confluence_get_label_pages — Get pages for label
confluence_get_pages — Get pages
confluence_create_page — Create page
confluence_get_page_by_id — Get page by id
confluence_update_page — Update page
confluence_delete_page — Delete page
confluence_get_page_attachments — Get attachments for page
confluence_get_custom_content_by_type_in_page — Get custom content by type in page
confluence_get_page_labels — Get labels for page
confluence_get_page_like_count — Get like count for page
confluence_get_page_like_users — Get account IDs of likes for page
confluence_get_page_operations — Get permitted operations for page
confluence_get_page_content_properties — Get content properties for page
confluence_create_page_property — Create content property for page
confluence_get_page_content_properties_by_id — Get content property for page by id
confluence_update_page_property_by_id — Update content property for page by id
confluence_delete_page_property_by_id — Delete content property for page by id
confluence_post_redact_page — Redact Content in a Confluence Page
confluence_post_redact_blog — Redact Content in a Confluence Blog Post
confluence_update_page_title — Update page title
confluence_get_page_versions — Get page versions
confluence_create_whiteboard — Create whiteboard
confluence_get_whiteboard_by_id — Get whiteboard by id
confluence_delete_whiteboard — Delete whiteboard
confluence_get_whiteboard_content_properties — Get content properties for whiteboard
confluence_create_whiteboard_property — Create content property for whiteboard
confluence_get_whiteboard_content_properties_by_id — Get content property for whiteboard by id
confluence_update_whiteboard_property_by_id — Update content property for whiteboard by id
confluence_delete_whiteboard_property_by_id — Delete content property for whiteboard by id
confluence_get_whiteboard_operations — Get permitted operations for a whiteboard
confluence_get_whiteboard_direct_children — Get direct children of a whiteboard
confluence_get_whiteboard_descendants — Get descendants of a whiteboard
confluence_get_whiteboard_ancestors — Get all ancestors of whiteboard
confluence_create_database — Create database
confluence_get_database_by_id — Get database by id
confluence_delete_database — Delete database
confluence_get_database_content_properties — Get content properties for database
confluence_create_database_property — Create content property for database
confluence_get_database_content_properties_by_id — Get content property for database by id
confluence_update_database_property_by_id — Update content property for database by id
confluence_delete_database_property_by_id — Delete content property for database by id
confluence_get_database_operations — Get permitted operations for a database
confluence_get_database_direct_children — Get direct children of a database
confluence_get_database_descendants — Get descendants of a database
confluence_get_database_ancestors — Get all ancestors of database
confluence_create_smart_link — Create Smart Link in the content tree
confluence_get_smart_link_by_id — Get Smart Link in the content tree by id
confluence_delete_smart_link — Delete Smart Link in the content tree
confluence_get_smart_link_content_properties — Get content properties for Smart Link in the content tree
confluence_create_smart_link_property — Create content property for Smart Link in the content tree
confluence_get_smart_link_content_properties_by_id — Get content property for Smart Link in the content tree by id
confluence_update_smart_link_property_by_id — Update content property for Smart Link in the content tree by id
confluence_delete_smart_link_property_by_id — Delete content property for Smart Link in the content tree by id
confluence_get_smart_link_operations — Get permitted operations for a Smart Link in the content tree
confluence_get_smart_link_direct_children — Get direct children of a Smart Link
confluence_get_smart_link_descendants — Get descendants of a smart link
confluence_get_smart_link_ancestors — Get all ancestors of Smart Link in content tree
confluence_create_folder — Create folder
confluence_get_folder_by_id — Get folder by id
confluence_delete_folder — Delete folder
confluence_get_folder_content_properties — Get content properties for folder
confluence_create_folder_property — Create content property for folder
confluence_get_folder_content_properties_by_id — Get content property for folder by id
confluence_update_folder_property_by_id — Update content property for folder by id
confluence_delete_folder_property_by_id — Delete content property for folder by id
confluence_get_folder_operations — Get permitted operations for a folder
confluence_get_folder_direct_children — Get direct children of a folder
confluence_get_folder_descendants — Get descendants of folder
confluence_get_folder_ancestors — Get all ancestors of folder
confluence_get_page_version_details — Get version details for page version
confluence_get_custom_content_versions — Get custom content versions
confluence_get_custom_content_version_details — Get version details for custom content version
confluence_get_spaces — Get spaces
confluence_create_space — Create space
confluence_get_space_by_id — Get space by id
confluence_get_blog_posts_in_space — Get blog posts in space
confluence_get_space_labels — Get labels for space
confluence_get_space_content_labels — Get labels for space content
confluence_get_custom_content_by_type_in_space — Get custom content by type in space
confluence_get_space_operations — Get permitted operations for space
confluence_get_pages_in_space — Get pages in space
confluence_get_space_properties — Get space properties in space
confluence_create_space_property — Create space property in space
confluence_get_space_property_by_id — Get space property by id
confluence_update_space_property_by_id — Update space property by id
confluence_delete_space_property_by_id — Delete space property by id
confluence_get_space_permissions_assignments — Get space permissions assignments
confluence_get_available_space_permissions — Get available space permissions
confluence_get_available_space_roles — Get available space roles
confluence_create_space_role — Create a space role
confluence_get_space_roles_by_id — Get space role by ID
confluence_update_space_role — Update a space role
confluence_delete_space_role — Delete a space role
confluence_get_space_role_mode — Get space role mode
confluence_get_space_role_assignments — Get space role assignments
confluence_set_space_role_assignments — Set space role assignments
confluence_get_page_footer_comments — Get footer comments for page
confluence_get_page_inline_comments — Get inline comments for page
confluence_get_blog_post_footer_comments — Get footer comments for blog post
confluence_get_blog_post_inline_comments — Get inline comments for blog post
confluence_get_footer_comments — Get footer comments
confluence_create_footer_comment — Create footer comment
confluence_get_footer_comment_by_id — Get footer comment by id
confluence_update_footer_comment — Update footer comment
confluence_delete_footer_comment — Delete footer comment
confluence_get_footer_comment_children — Get children footer comments
confluence_get_footer_like_count — Get like count for footer comment
confluence_get_footer_like_users — Get account IDs of likes for footer comment
confluence_get_footer_comment_operations — Get permitted operations for footer comment
confluence_get_footer_comment_versions — Get footer comment versions
confluence_get_footer_comment_version_details — Get version details for footer comment version
confluence_get_inline_comments — Get inline comments
confluence_create_inline_comment — Create inline comment
confluence_get_inline_comment_by_id — Get inline comment by id
confluence_update_inline_comment — Update inline comment
confluence_delete_inline_comment — Delete inline comment
confluence_get_inline_comment_children — Get children inline comments
confluence_get_inline_like_count — Get like count for inline comment
confluence_get_inline_like_users — Get account IDs of likes for inline comment
confluence_get_inline_comment_operations — Get permitted operations for inline comment
confluence_get_inline_comment_versions — Get inline comment versions
confluence_get_inline_comment_version_details — Get version details for inline comment version
confluence_get_comment_content_properties — Get content properties for comment
confluence_create_comment_property — Create content property for comment
confluence_get_comment_content_properties_by_id — Get content property for comment by id
confluence_update_comment_property_by_id — Update content property for comment by id
confluence_delete_comment_property_by_id — Delete content property for comment by id
confluence_get_tasks — Get tasks
confluence_get_task_by_id — Get task by id
confluence_update_task — Update task
confluence_get_child_pages — Get child pages
confluence_get_child_custom_content — Get child custom content
confluence_get_page_direct_children — Get direct children of a page
confluence_get_page_ancestors — Get all ancestors of page
confluence_get_page_descendants — Get descendants of page
confluence_create_bulk_user_lookup — Create bulk user lookup using ids
confluence_check_access_by_email — Check site access for a list of emails
confluence_invite_by_email — Invite a list of emails to the site
confluence_get_data_policy_metadata — Get data policy metadata for the workspace
confluence_get_data_policy_spaces — Get spaces with data policies
confluence_get_classification_levels — Get list of classification levels
confluence_get_space_default_classification_level — Get space default classification level
confluence_put_space_default_classification_level — Update space default classification level
confluence_delete_space_default_classification_level — Delete space default classification level
confluence_get_page_classification_level — Get page classification level
confluence_put_page_classification_level — Update page classification level
confluence_post_page_classification_level — Reset page classification level
confluence_get_blog_post_classification_level — Get blog post classification level
confluence_put_blog_post_classification_level — Update blog post classification level
confluence_post_blog_post_classification_level — Reset blog post classification level
confluence_get_whiteboard_classification_level — Get whiteboard classification level
confluence_put_whiteboard_classification_level — Update whiteboard classification level
confluence_post_whiteboard_classification_level — Reset whiteboard classification level
confluence_get_database_classification_level — Get database classification level
confluence_put_database_classification_level — Update database classification level
confluence_post_database_classification_level — Reset database classification level
confluence_get_forge_app_properties — Get Forge app properties.
confluence_get_forge_app_property — Get a Forge app property by key.
confluence_put_forge_app_property — Create or update a Forge app property.
confluence_delete_forge_app_property — Deletes a Forge app property.
```

#### Figma (`figma_` prefix, 46 tools)

```
figma_get_file — Get file JSON
figma_get_file_nodes — Get file JSON for specific nodes
figma_get_images — Render images of file nodes
figma_get_image_fills — Get image fills
figma_get_file_meta — Get file metadata
figma_get_team_projects — Get projects in a team
figma_get_project_files — Get files in a project
figma_get_file_versions — Get versions of a file
figma_get_comments — Get comments in a file
figma_post_comment — Add a comment to a file
figma_delete_comment — Delete a comment
figma_get_comment_reactions — Get reactions for a comment
figma_post_comment_reaction — Add a reaction to a comment
figma_delete_comment_reaction — Delete a reaction
figma_get_me — Get current user
figma_get_team_components — Get team components
figma_get_file_components — Get file components
figma_get_component — Get component
figma_get_team_component_sets — Get team component sets
figma_get_file_component_sets — Get file component sets
figma_get_component_set — Get component set
figma_get_team_styles — Get team styles
figma_get_file_styles — Get file styles
figma_get_style — Get style
figma_get_webhooks — Get webhooks by context or plan
figma_post_webhook — Create a webhook
figma_get_webhook — Get a webhook
figma_put_webhook — Update a webhook
figma_delete_webhook — Delete a webhook
figma_get_team_webhooks — [Deprecated] Get team webhooks
figma_get_webhook_requests — Get webhook requests
figma_get_activity_logs — Get activity logs
figma_get_payments — Get payments
figma_get_local_variables — Get local variables
figma_get_published_variables — Get published variables
figma_post_variables — Create/modify/delete variables
figma_get_dev_resources — Get dev resources
figma_post_dev_resources — Create dev resources
figma_put_dev_resources — Update dev resources
figma_delete_dev_resource — Delete dev resource
figma_get_library_analytics_component_actions — Get library analytics component action data.
figma_get_library_analytics_component_usages — Get library analytics component usage data.
figma_get_library_analytics_style_actions — Get library analytics style action data.
figma_get_library_analytics_style_usages — Get library analytics style usage data.
figma_get_library_analytics_variable_actions — Get library analytics variable action data.
figma_get_library_analytics_variable_usages — Get library analytics variable usage data.
```

#### GitHub (`github_` prefix, 185 tools)

```
github_gists_list — List gists for the authenticated user
github_gists_create — Create a gist
github_gists_list_public — List public gists
github_gists_get — Get a gist
github_gists_update — Update a gist
github_gists_delete — Delete a gist
github_gists_list_comments — List gist comments
github_gists_create_comment — Create a gist comment
github_orgs_list_issue_types — List issue types for an organization
github_orgs_create_issue_type — Create issue type for an organization
github_orgs_list_members — List organization members
github_repos_list_for_org — List organization repositories
github_repos_create_in_org — Create an organization repository
github_repos_get — Get a repository
github_repos_update — Update a repository
github_repos_delete — Delete a repository
github_actions_download_job_logs_for_workflow_run — Download job logs for a workflow run
github_actions_re_run_job_for_workflow_run — Re-run a job from a workflow run
github_actions_list_workflow_runs_for_repo — List workflow runs for a repository
github_actions_get_workflow_run — Get a workflow run
github_actions_delete_workflow_run — Delete a workflow run
github_actions_list_workflow_run_artifacts — List workflow run artifacts
github_actions_get_workflow_run_attempt — Get a workflow run attempt
github_actions_list_jobs_for_workflow_run_attempt — List jobs for a workflow run attempt
github_actions_download_workflow_run_attempt_logs — Download workflow run attempt logs
github_actions_force_cancel_workflow_run — Force cancel a workflow run
github_actions_list_jobs_for_workflow_run — List jobs for a workflow run
github_actions_download_workflow_run_logs — Download workflow run logs
github_actions_delete_workflow_run_logs — Delete workflow run logs
github_actions_re_run_workflow — Re-run a workflow
github_actions_re_run_workflow_failed_jobs — Re-run failed jobs from a workflow run
github_actions_list_repo_workflows — List repository workflows
github_actions_get_workflow — Get a workflow
github_actions_list_workflow_runs — List workflow runs for a workflow
github_repos_list_activities — List repository activities
github_issues_list_assignees — List assignees
github_issues_check_user_can_be_assigned — Check if a user can be assigned
github_repos_list_branches — List branches
github_repos_get_branch — Get a branch
github_checks_create — Create a check run
github_checks_get — Get a check run
github_checks_update — Update a check run
github_checks_list_annotations — List check run annotations
github_checks_rerequest_run — Rerequest a check run
github_repos_list_commit_comments_for_repo — List commit comments for a repository
github_repos_get_commit_comment — Get a commit comment
github_repos_update_commit_comment — Update a commit comment
github_repos_delete_commit_comment — Delete a commit comment
github_repos_list_commits — List commits
github_repos_list_comments_for_commit — List commit comments
github_repos_create_commit_comment — Create a commit comment
github_repos_list_pull_requests_associated_with_commit — List pull requests associated with a commit
github_repos_get_commit — Get a commit
github_checks_list_for_ref — List check runs for a Git reference
github_repos_get_combined_status_for_ref — Get the combined status for a specific reference
github_repos_compare_commits — Compare two commits
github_repos_get_content — Get repository content
github_repos_create_or_update_file_contents — Create or update file contents
github_repos_delete_file — Delete a file
github_repos_list_contributors — List repository contributors
github_repos_list_deployments — List deployments
github_repos_create_deployment — Create a deployment
github_repos_get_deployment — Get a deployment
github_repos_delete_deployment — Delete a deployment
github_repos_list_deployment_statuses — List deployment statuses
github_repos_create_deployment_status — Create a deployment status
github_repos_get_deployment_status — Get a deployment status
github_git_get_commit — Get a commit object
github_git_list_matching_refs — List matching references
github_git_get_ref — Get a reference
github_git_create_ref — Create a reference
github_git_update_ref — Update a reference
github_git_delete_ref — Delete a reference
github_git_create_tag — Create a tag object
github_git_get_tag — Get a tag
github_git_get_tree — Get a tree
github_repos_list_webhooks — List repository webhooks
github_repos_create_webhook — Create a repository webhook
github_repos_get_webhook — Get a repository webhook
github_repos_update_webhook — Update a repository webhook
github_repos_delete_webhook — Delete a repository webhook
github_repos_get_webhook_config_for_repo — Get a webhook configuration for a repository
github_repos_update_webhook_config_for_repo — Update a webhook configuration for a repository
github_repos_list_webhook_deliveries — List deliveries for a repository webhook
github_repos_get_webhook_delivery — Get a delivery for a repository webhook
github_repos_redeliver_webhook_delivery — Redeliver a delivery for a repository webhook
github_repos_ping_webhook — Ping a repository webhook
github_repos_test_push_webhook — Test the push repository webhook
github_issues_list_for_repo — List repository issues
github_issues_create — Create an issue
github_issues_list_comments_for_repo — List issue comments for a repository
github_issues_get_comment — Get an issue comment
github_issues_update_comment — Update an issue comment
github_issues_delete_comment — Delete an issue comment
github_issues_list_events_for_repo — List issue events for a repository
github_issues_get_event — Get an issue event
github_issues_get — Get an issue
github_issues_update — Update an issue
github_issues_add_assignees — Add assignees to an issue
github_issues_remove_assignees — Remove assignees from an issue
github_issues_check_user_can_be_assigned_to_issue — Check if a user can be assigned to a issue
github_issues_list_comments — List issue comments
github_issues_create_comment — Create an issue comment
github_issues_list_dependencies_blocked_by — List dependencies an issue is blocked by
github_issues_add_blocked_by_dependency — Add a dependency an issue is blocked by
github_issues_remove_dependency_blocked_by — Remove dependency an issue is blocked by
github_issues_list_dependencies_blocking — List dependencies an issue is blocking
github_issues_list_events — List issue events
github_issues_list_labels_on_issue — List labels for an issue
github_issues_add_labels — Add labels to an issue
github_issues_set_labels — Set labels for an issue
github_issues_remove_all_labels — Remove all labels from an issue
github_issues_remove_label — Remove a label from an issue
github_issues_lock — Lock an issue
github_issues_unlock — Unlock an issue
github_issues_get_parent — Get parent issue
github_issues_remove_sub_issue — Remove sub-issue
github_issues_list_sub_issues — List sub-issues
github_issues_add_sub_issue — Add sub-issue
github_issues_reprioritize_sub_issue — Reprioritize sub-issue
github_issues_list_events_for_timeline — List timeline events for an issue
github_issues_list_labels_for_repo — List labels for a repository
github_issues_create_label — Create a label
github_issues_get_label — Get a label
github_issues_update_label — Update a label
github_issues_delete_label — Delete a label
github_repos_list_languages — List repository languages
github_pulls_list — List pull requests
github_pulls_create — Create a pull request
github_pulls_list_review_comments_for_repo — List review comments in a repository
github_pulls_get_review_comment — Get a review comment for a pull request
github_pulls_update_review_comment — Update a review comment for a pull request
github_pulls_delete_review_comment — Delete a review comment for a pull request
github_pulls_get — Get a pull request
github_pulls_update — Update a pull request
github_pulls_list_review_comments — List review comments on a pull request
github_pulls_create_review_comment — Create a review comment for a pull request
github_pulls_create_reply_for_review_comment — Create a reply for a review comment
github_pulls_list_commits — List commits on a pull request
github_pulls_list_files — List pull requests files
github_pulls_check_if_merged — Check if a pull request has been merged
github_pulls_merge — Merge a pull request
github_pulls_list_requested_reviewers — Get all requested reviewers for a pull request
github_pulls_request_reviewers — Request reviewers for a pull request
github_pulls_remove_requested_reviewers — Remove requested reviewers from a pull request
github_pulls_list_reviews — List reviews for a pull request
github_pulls_create_review — Create a review for a pull request
github_pulls_get_review — Get a review for a pull request
github_pulls_update_review — Update a review for a pull request
github_pulls_delete_pending_review — Delete a pending review for a pull request
github_pulls_list_comments_for_review — List comments for a pull request review
github_pulls_submit_review — Submit a review for a pull request
github_repos_get_readme — Get a repository README
github_repos_get_readme_in_directory — Get a repository README for a directory
github_repos_list_releases — List releases
github_repos_create_release — Create a release
github_repos_generate_release_notes — Generate release notes content for a release
github_repos_get_latest_release — Get the latest release
github_repos_get_release_by_tag — Get a release by tag name
github_repos_get_release — Get a release
github_repos_update_release — Update a release
github_repos_delete_release — Delete a release
github_security_advisories_list_repository_advisories — List repository security advisories
github_security_advisories_create_repository_advisory — Create a repository security advisory
github_security_advisories_create_private_vulnerability_report — Privately report a security vulnerability
github_security_advisories_get_repository_advisory — Get a repository security advisory
github_security_advisories_update_repository_advisory — Update a repository security advisory
github_security_advisories_create_repository_advisory_cve_request — Request a CVE for a repository security advisory
github_repos_get_code_frequency_stats — Get the weekly commit activity
github_repos_get_commit_activity_stats — Get the last year of commit activity
github_repos_get_contributors_stats — Get all contributor commit activity
github_repos_get_participation_stats — Get the weekly commit count
github_repos_get_punch_card_stats — Get the hourly commit count for each day
github_repos_list_tags — List repository tags
github_search_code — Search code
github_search_commits — Search commits
github_search_issues_and_pull_requests — Search issues and pull requests
github_search_labels — Search labels
github_search_repos — Search repositories
github_search_topics — Search topics
github_search_users — Search users
github_users_get_by_username — Get a user
github_activity_list_public_events_for_user — List public events for a user
github_gists_list_for_user — List gists for a user
github_repos_list_for_user — List repositories for a user
```

#### Google Compute (`google_compute_` prefix, 65 tools)

```
google_compute_global_operations_list — Retrieves a list of Operation resources contained within the specified
google_compute_global_operations_get — Retrieves the specified Operations resource.
google_compute_global_operations_delete — Deletes the specified Operations resource.
google_compute_global_operations_wait — Waits for the specified Operation resource to return as `DONE`
google_compute_zone_operations_list — Retrieves a list of Operation resources contained within
google_compute_zone_operations_get — Retrieves the specified zone-specific Operations resource.
google_compute_zone_operations_delete — Deletes the specified zone-specific Operations resource.
google_compute_zone_operations_wait — Waits for the specified Operation resource to return as `DONE`
google_compute_images_list — Retrieves the list of custom images
google_compute_images_insert — Creates an image in the specified project using the data included
google_compute_images_get — Returns the specified image.
google_compute_images_patch — Patches the specified image with the data included in the request.
google_compute_images_delete — Deletes the specified image.
google_compute_images_get_from_family — Returns the latest image that is part of an image family and is not
google_compute_snapshots_list — Retrieves the list of Snapshot resources contained within
google_compute_snapshots_insert — Creates a snapshot in the specified project using the data included
google_compute_snapshots_get — Returns the specified Snapshot resource.
google_compute_snapshots_delete — Deletes the specified Snapshot resource. Keep in mind that deleting
google_compute_disks_list — Retrieves a list of persistent disks contained within
google_compute_disks_insert — Creates a persistent disk in the specified project using the data
google_compute_disks_get — Returns the specified persistent disk.
google_compute_disks_update — Updates the specified disk with the data included in the request.
google_compute_disks_delete — Deletes the specified persistent disk. Deleting a disk removes its data
google_compute_disks_resize — Resizes the specified persistent disk.
google_compute_instances_list — Retrieves the list of instances contained within
google_compute_instances_insert — Creates an instance resource in the specified project using the data
google_compute_instances_get — Returns the specified Instance resource.
google_compute_instances_update — Updates an instance only if the necessary resources are available. This
google_compute_instances_delete — Deletes the specified Instance resource. For more information, seeDeleting
google_compute_instances_reset — Performs a reset on the instance. This is a hard reset. The VM
google_compute_instances_get_serial_port_output — Returns the last 1 MB of serial port output from the specified instance.
google_compute_instances_get_screenshot — Returns the screenshot from the specified instance.
google_compute_instances_get_guest_attributes — Returns the specified guest attributes entry.
google_compute_instances_attach_disk — Attaches an existing Disk resource to an instance. You must first
google_compute_instances_detach_disk — Detaches a disk from an instance.
google_compute_instances_set_machine_type — Changes the machine type for a stopped instance to the machine
google_compute_instances_set_metadata — Sets metadata for the specified instance to the data included
google_compute_instances_set_labels — Sets labels on an instance.  To learn more about labels, read theLabeling
google_compute_instances_start — Starts an instance that was stopped using theinstances().stop
google_compute_instances_stop — Stops a running instance, shutting it down cleanly, and allows
google_compute_instances_suspend — This method suspends a running instance, saving its state to persistent
google_compute_instances_resume — Resumes an instance that was suspended using theinstances().suspend
google_compute_disk_types_list — Retrieves a list of disk types available to the specified
google_compute_disk_types_get — Returns the specified disk type.
google_compute_instance_templates_list — Retrieves a list of instance templates that are contained within
google_compute_instance_templates_insert — Creates an instance template in the specified project using the
google_compute_instance_templates_get — Returns the specified instance template.
google_compute_instance_templates_delete — Deletes the specified instance template. Deleting an instance template is
google_compute_machine_types_list — Retrieves a list of machine types available to the specified
google_compute_machine_types_get — Returns the specified machine type.
google_compute_networks_list — Retrieves the list of networks available to the specified project.
google_compute_networks_insert — Creates a network in the specified project using the data included
google_compute_networks_get — Returns the specified network.
google_compute_networks_patch — Patches the specified network with the data included in the request.
google_compute_networks_delete — Deletes the specified network.
google_compute_projects_get — Returns the specified Project resource.
google_compute_regions_list — Retrieves the list of region resources available to the specified project.
google_compute_regions_get — Returns the specified Region resource.
google_compute_subnetworks_list — Retrieves a list of subnetworks available to the specified
google_compute_subnetworks_insert — Creates a subnetwork in the specified project using the data
google_compute_subnetworks_get — Returns the specified subnetwork.
google_compute_subnetworks_patch — Patches the specified subnetwork with the data included in the request.
google_compute_subnetworks_delete — Deletes the specified subnetwork.
google_compute_zones_list — Retrieves the list of Zone resources available to the specified project.
google_compute_zones_get — Returns the specified Zone resource.
```

#### Google Logging (`google_logging_` prefix, 36 tools)

```
google_logging_monitored_resource_descriptors_list — Lists the descriptors for monitored resource types used by Logging.
google_logging_entries_write — Writes log entries to Logging. This API method is the only way to send log entries to Logging. This method is used, directly or indirectly, by the Logging agent (fluentd) and all logging libraries configured to use Logging. A single request may contain log entries for a maximum of 1000 different resource names (projects, organizations, billing accounts or folders), where the resource name for a log entry is determined from its logName field.
google_logging_entries_copy — Copies a set of log entries from a log bucket to a Cloud Storage bucket.
google_logging_entries_tail — Streaming read of log entries as they are received. Until the stream is terminated, it will continue reading logs.
google_logging_entries_list — Lists log entries. Use this method to retrieve log entries that originated from a project/folder/organization/billing account. For ways to export log entries, see Exporting Logs (https://cloud.google.com/logging/docs/export).
google_logging_billing_accounts_locations_operations_list — Lists operations that match the specified filter in the request. If the server doesn't support this method, it returns UNIMPLEMENTED.
google_logging_billing_accounts_locations_operations_cancel — Starts asynchronous cancellation on a long-running operation. The server makes a best effort to cancel the operation, but success is not guaranteed. If the server doesn't support this method, it returns google.rpc.Code.UNIMPLEMENTED. Clients can use Operations.GetOperation or other methods to check whether the cancellation succeeded or whether the operation completed despite cancellation. On successful cancellation, the operation is not deleted; instead, it becomes an operation with an Operation.error value with a google.rpc.Status.code of 1, corresponding to Code.CANCELLED.
google_logging_billing_accounts_locations_buckets_update_async — Updates a log bucket asynchronously.If the bucket has a lifecycle_state of DELETE_REQUESTED, then FAILED_PRECONDITION will be returned.After a bucket has been created, the bucket's location cannot be changed.
google_logging_billing_accounts_locations_buckets_undelete — Undeletes a log bucket. A bucket that has been deleted can be undeleted within the grace period of 7 days.
google_logging_billing_accounts_locations_buckets_list — Lists log buckets.
google_logging_billing_accounts_locations_buckets_create — Creates a log bucket that can be used to store log entries. After a bucket has been created, the bucket's location cannot be changed.
google_logging_billing_accounts_locations_buckets_create_async — Creates a log bucket asynchronously that can be used to store log entries.After a bucket has been created, the bucket's location cannot be changed.
google_logging_billing_accounts_locations_buckets_views_list — Lists views on a log bucket.
google_logging_billing_accounts_locations_buckets_views_create — Creates a view over log entries in a log bucket. A bucket may contain a maximum of 30 views.
google_logging_billing_accounts_sinks_get — Gets a sink.
google_logging_billing_accounts_sinks_update — Updates a sink. This method replaces the values of the destination and filter fields of the existing sink with the corresponding values from the new sink.The updated sink might also have a new writer_identity; see the unique_writer_identity field.
google_logging_billing_accounts_sinks_patch — Updates a sink. This method replaces the values of the destination and filter fields of the existing sink with the corresponding values from the new sink.The updated sink might also have a new writer_identity; see the unique_writer_identity field.
google_logging_billing_accounts_sinks_delete — Deletes a sink. If the sink has a unique writer_identity, then that service account is also deleted.
google_logging_billing_accounts_sinks_list — Lists sinks.
google_logging_billing_accounts_sinks_create — Creates a sink that exports specified log entries to a destination. The export begins upon ingress, unless the sink's writer_identity is not permitted to write to the destination. A sink can export log entries only from the resource owning the sink.
google_logging_billing_accounts_get_settings — Gets the settings for the given resource.Note: Settings can be retrieved for Google Cloud projects, folders, organizations, and billing accounts.See View default resource settings for Logging (https://docs.cloud.google.com/logging/docs/default-settings#view-org-settings) for more information.
google_logging_folders_update_settings — Updates the settings for the given resource. This method applies to all feature configurations for organization and folders.UpdateSettings fails when any of the following are true: The value of storage_location either isn't supported by Logging or violates the location OrgPolicy. The default_sink_config field is set, but it has an unspecified filter write mode. The value of kms_key_name is invalid. The associated service account doesn't have the required roles/cloudkms.cryptoKeyEncrypterDecrypter role assigned for the key. Access to the key is disabled.See Configure default settings for organizations and folders (https://docs.cloud.google.com/logging/docs/default-settings) for more information.
google_logging_billing_accounts_get_cmek_settings — Gets the Logging CMEK settings for the given resource.Note: CMEK for the Log Router can be configured for Google Cloud projects, folders, organizations, and billing accounts. Once configured for an organization, it applies to all projects and folders in the Google Cloud organization.See Configure CMEK for Cloud Logging (https://docs.cloud.google.com/logging/docs/routing/managed-encryption) for more information.
google_logging_organizations_update_cmek_settings — Updates the Log Router CMEK settings for the given resource.Note: CMEK for the Log Router can currently only be configured for Google Cloud organizations. Once configured, it applies to all projects and folders in the Google Cloud organization.UpdateCmekSettings fails when any of the following are true: The value of kms_key_name is invalid. The associated service account doesn't have the required roles/cloudkms.cryptoKeyEncrypterDecrypter role assigned for the key. Access to the key is disabled.See Configure CMEK for Cloud Logging (https://docs.cloud.google.com/logging/docs/routing/managed-encryption) for more information.
google_logging_billing_accounts_locations_recent_queries_list — Lists the RecentQueries that were created by the user making the request.
google_logging_logs_list — Lists the logs in projects, organizations, folders, or billing accounts. Only logs that have entries are listed.
google_logging_billing_accounts_locations_saved_queries_list — Lists the SavedQueries that were created by the user making the request.
google_logging_billing_accounts_locations_saved_queries_create — Creates a new SavedQuery for the user making the request.
google_logging_logs_delete — Deletes all the log entries in a log for the global _Default Log Bucket. The log reappears if it receives new entries. Log entries written shortly before the delete operation might not be deleted. Entries received after the delete operation with a timestamp before the operation will be deleted.
google_logging_exclusions_list — Lists all the exclusions on the _Default sink in a parent resource.
google_logging_exclusions_create — Creates a new exclusion in the _Default sink in a specified parent resource. Only log entries belonging to that resource can be excluded. You can have up to 10 exclusions in a resource.
google_logging_projects_metrics_list — Lists logs-based metrics.
google_logging_projects_metrics_create — Creates a logs-based metric.
google_logging_projects_metrics_get — Gets a logs-based metric.
google_logging_projects_metrics_update — Creates or updates a logs-based metric.
google_logging_projects_metrics_delete — Deletes a logs-based metric.
```

#### Jira (`jira_` prefix, 74 tools)

```
jira_get_all_dashboards — Get all dashboards
jira_create_dashboard — Create dashboard
jira_get_dashboard — Get dashboard
jira_update_dashboard — Update dashboard
jira_delete_dashboard — Delete dashboard
jira_get_fields — Get fields
jira_create_custom_field — Create custom field
jira_update_custom_field — Update custom field
jira_create_filter — Create filter
jira_get_filters_paginated — Search for filters
jira_get_filter — Get filter
jira_update_filter — Update filter
jira_delete_filter — Delete filter
jira_create_issue — Create issue
jira_get_issue — Get issue
jira_edit_issue — Edit issue
jira_delete_issue — Delete issue
jira_add_attachment — Add attachment
jira_get_change_logs — Get changelogs
jira_get_comments — Get comments
jira_add_comment — Add comment
jira_get_comment — Get comment
jira_update_comment — Update comment
jira_delete_comment — Delete comment
jira_get_transitions — Get transitions
jira_do_transition — Transition issue
jira_get_issue_watchers — Get issue watchers
jira_add_watcher — Add watcher
jira_remove_watcher — Delete watcher
jira_get_issue_worklog — Get issue worklogs
jira_add_worklog — Add worklog
jira_bulk_delete_worklogs — Bulk delete worklogs
jira_get_worklog — Get worklog
jira_update_worklog — Update worklog
jira_delete_worklog — Delete worklog
jira_link_issues — Create issue link
jira_get_issue_link — Get issue link
jira_delete_issue_link — Delete issue link
jira_get_issue_link_types — Get issue link types
jira_create_issue_link_type — Create issue link type
jira_get_issue_all_types — Get all issue types for user
jira_create_issue_type — Create issue type
jira_get_issue_types_for_project — Get issue types for project
jira_get_issue_type — Get issue type
jira_update_issue_type — Update issue type
jira_delete_issue_type — Delete issue type
jira_get_my_permissions — Get my permissions
jira_get_current_user — Get current user
jira_get_notification_schemes — Get notification schemes paginated
jira_create_notification_scheme — Create notification scheme
jira_get_all_permissions — Get all permissions
jira_get_priorities — Get priorities
jira_create_priority — Create priority
jira_get_priority — Get priority
jira_update_priority — Update priority
jira_delete_priority — Delete priority
jira_get_all_projects — Get all projects
jira_create_project — Create project
jira_get_project — Get project
jira_update_project — Update project
jira_delete_project — Delete project
jira_get_project_components — Get project components
jira_get_all_statuses — Get all statuses for project
jira_get_project_versions — Get project versions
jira_search_and_reconsile_issues_using_jql — Search for issues using JQL enhanced search (GET)
jira_search_and_reconsile_issues_using_jql_post — Search for issues using JQL enhanced search (POST)
jira_get_server_info — Get Jira instance info
jira_get_statuses — Get all statuses
jira_get_status — Get status
jira_get_user — Get user
jira_create_user — Create user
jira_remove_user — Delete user
jira_find_assignable_users — Find users assignable to issues
jira_find_users — Find users
```

#### Linear (`linear_` prefix, 1 tools)

```
linear_graphql_query — Execute a GraphQL query or mutation against the Linear API
```

#### Slack (`slack_` prefix, 49 tools)

```
slack_api_test — Checks API calling code.
slack_auth_test — Checks authentication & identity.
slack_bots_info — Gets information about a bot user.
slack_chat_delete — Deletes a message.
slack_chat_delete_scheduled_message — Deletes a pending scheduled message from the queue.
slack_chat_get_permalink — Retrieve a permalink URL for a specific extant message
slack_chat_post_ephemeral — Sends an ephemeral message to a user in a channel.
slack_chat_post_message — Sends a message to a channel.
slack_chat_schedule_message — Schedules a message to be sent to a channel.
slack_chat_scheduled_messages_list — Returns a list of scheduled messages.
slack_chat_update — Updates a message.
slack_conversations_archive — Archives a conversation.
slack_conversations_history — Fetches a conversation's history of messages and events.
slack_conversations_info — Retrieve information about a conversation.
slack_conversations_invite — Invites users to a channel.
slack_conversations_join — Joins an existing conversation.
slack_conversations_leave — Leaves a conversation.
slack_conversations_list — Lists all channels in a Slack team.
slack_conversations_members — Retrieve members of a conversation.
slack_conversations_replies — Retrieve a thread of messages posted to a conversation
slack_conversations_set_purpose — Sets the purpose for a conversation.
slack_conversations_set_topic — Sets the topic for a conversation.
slack_conversations_unarchive — Reverses conversation archival.
slack_emoji_list — Lists custom emoji for a team.
slack_files_delete — Deletes a file.
slack_files_info — Gets information about a file.
slack_files_remote_share — Share a remote file into a channel.
slack_pins_add — Pins an item to a channel.
slack_pins_list — Lists items pinned to a channel.
slack_pins_remove — Un-pins an item from a channel.
slack_reactions_add — Adds a reaction to an item.
slack_reactions_get — Gets reactions for an item.
slack_reactions_list — Lists reactions made by a user.
slack_reactions_remove — Removes a reaction from an item.
slack_reminders_add — Creates a reminder.
slack_reminders_complete — Marks a reminder as complete.
slack_reminders_delete — Deletes a reminder.
slack_reminders_list — Lists all reminders created by or for a given user.
slack_team_info — Gets information about the current team.
slack_usergroups_create — Create a User Group
slack_usergroups_list — List all User Groups for a team
slack_usergroups_update — Update an existing User Group
slack_usergroups_users_list — List all users in a User Group
slack_usergroups_users_update — Update the list of users for a User Group
slack_users_get_presence — Gets user presence information.
slack_users_info — Gets information about a user.
slack_users_list — Lists all users in a Slack team.
slack_users_lookup_by_email — Find a user with an email address.
slack_users_profile_get — Retrieves a user's profile information.
```

#### TestRail (`testrail_` prefix, 18 tools)

```
testrail_get_projects — Returns the list of available projects. Use this to discover project IDs for other API calls.
testrail_get_project — Returns an existing project by ID.
testrail_get_suites — Returns the list of test suites for a project. Only relevant for projects using multiple test suites.
testrail_get_suite — Returns an existing test suite by ID.
testrail_get_sections — Returns the list of sections for a project and test suite. Sections organize test cases hierarchically.
testrail_get_section — Returns an existing section by ID.
testrail_get_cases — Returns the list of test cases for a project. Can filter by suite, section, priority, and more.
testrail_get_case — Returns an existing test case by ID. Includes all case fields like title, steps, expected results, and custom fields.
testrail_get_attachments_for_case — Returns the list of attachments for a test case.
testrail_get_attachment — Downloads an attachment by ID. Returns binary file content. Requires TestRail 5.7 or later.
testrail_get_runs — Returns the list of test runs for a project.
testrail_get_run — Returns an existing test run by ID.
testrail_get_tests — Returns the list of tests in a test run. Tests are instances of test cases within a run.
testrail_get_test — Returns an existing test by ID.
testrail_get_results — Returns the list of test results for a test.
testrail_get_results_for_case — Returns the list of test results for a test case within a specific run.
testrail_get_current_user — Returns the current user. Useful for validating credentials.
testrail_get_users — Returns the list of users.
```

#### Zendesk (`zendesk_` prefix, 15 tools)

```
zendesk_list_tickets — List all tickets.
zendesk_create_ticket — Create a new ticket. Body must include a 'ticket' object with at least a 'subject' and 'comment' with 'body'.
zendesk_show_ticket — Get a specific ticket by ID.
zendesk_update_ticket — Update a ticket (status, priority, assignee, add comment, etc.).
zendesk_list_ticket_comments — List all comments on a ticket.
zendesk_search — Search across tickets, users, and organizations using Zendesk search syntax. Example queries: 'type:ticket status:open', 'type:user email:foo@bar.com'.
zendesk_list_users — List all users.
zendesk_show_user — Get a specific user by ID.
zendesk_list_organizations — List all organizations.
zendesk_show_organization — Get a specific organization by ID.
zendesk_list_groups — List all agent groups.
zendesk_list_ticket_fields — List all ticket fields (custom and system).
zendesk_list_views — List all shared and personal views.
zendesk_execute_view — Execute a view and return matching tickets.
zendesk_list_satisfaction_ratings — List all satisfaction ratings.
```

<!-- END GENERATED TOOL CATALOG -->

### NEVER `pick()` from `guildTools`

**CRITICAL: Always spread `guildTools` fully. NEVER use `pick(guildTools, [...])`.**

The SDK's `Task` type conditionally provides `task.guild: GuildService` based on whether the **full** `guildTools` set is in the tools type. Using `pick()` creates a subset type that doesn't satisfy this constraint, causing:

- `task.guild` becomes `undefined` instead of `GuildService`
- Type errors in any function that expects `task.guild` to exist
- Build failures during agent validation (which blocks publishing)

```typescript
// ❌ WRONG — task.guild will be undefined, TypeScript build fails
const tools = {
  ...pick(guildTools, ['guild_get_me', 'guild_create_agent']),
  ...userInterfaceTools,
};

// ✅ CORRECT — always spread fully
const tools = {
  ...guildTools,
  ...userInterfaceTools,
};
```

**`pick()` is fine for service tools** like `gitHubTools`, `slackTools`, etc. It's only `guildTools` that must be spread fully.

### DO NOT USE (Common Mistakes)

```typescript
// ❌ WRONG: identifier is deprecated
export default agent({ identifier: "my-agent", ... })

// ❌ WRONG: service tools are NOT in @guildai/agents-sdk
import { gitHubTools } from "@guildai/agents-sdk"
import { slackTools } from "@guildai/agents-sdk"

// ❌ WRONG: these direct service accessors don't exist
const pr = await task.github.search_issues(...)
await task.slack.post_message(...)
const issue = await task.jira.get_issue(...)

// ❌ WRONG: these methods don't exist
task.github.pulls_list()
task.github.repos_get()
task.github.pulls_create()

// ❌ WRONG: parameter name
github_search_issues_and_pull_requests({ query: "..." })  // Use { q: "..." }

// ❌ WRONG: task.ui_prompt() is not a method on task
await task.ui_prompt("What repo?")

// ❌ WRONG: importing service tools from internal packages directly
import { gitHubTools } from "@guildai-services/guildai~github/src/service"

// ❌ WRONG: missing "use agent" directive on coded agents
import { agent } from "@guildai/agents-sdk"
// (no "use agent" at top)
export default agent({ run: async (input, task) => { ... } })

// ❌ WRONG: picking from guildTools breaks task.guild typing
...pick(guildTools, ["guild_get_me", "guild_create_agent"])
// Use ...guildTools instead (spread fully)
```

### CORRECT Patterns

```typescript
// ✅ No identifier needed
export default agent({ description: "My agent", ... })

// ✅ Service tools from @guildai-services/* packages
import { gitHubTools } from "@guildai-services/guildai~github"
import { slackTools } from "@guildai-services/guildai~slack"

// ✅ Platform tools from @guildai/agents-sdk
import { guildTools, userInterfaceTools } from "@guildai/agents-sdk"

// ✅ Use task.tools.* for all tool calls
const pr = await task.tools.github_pulls_get({ owner, repo, pull_number })
const results = await task.tools.github_search_issues_and_pull_requests({ q: "is:pr repo:owner/name" })
await task.tools.slack_chat_post_message({ channel, text })
const response = await task.tools.ui_prompt({ type: "text", text: "What repo?" })

// ✅ "use agent" directive for coded agents
"use agent"
import { agent } from "@guildai/agents-sdk"
export default agent({ run: async (input, task) => { ... } })
```

---

## package.json

```json
{
  "name": "guild-agent-{name}",
  "version": "1.0.0",
  "author": "Guild.ai",
  "type": "module",
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**CRITICAL:**

- Do NOT add `@guildai/agents-sdk`, `@guildai-services/*`, or `zod` to dependencies. The runtime provides them.
- DO add third-party ESM-compatible packages your agent uses to `dependencies`. Note: CJS-only packages (e.g., `slackify-markdown`) will break in the ESM agent runtime — use inline alternatives instead.
- `devDependencies` is for build tools only.

## Versioning

- Use semver: `1.0.0` → `1.0.1` (patch), `1.1.0` (minor), `2.0.0` (breaking)
- Use `--bump [patch|minor|major]` with `guild agent save` to auto-bump `package.json` version
- Or bump manually in `package.json` before saving

## File Structure

After `guild agent init`:

```
my-agent/
├── .git/              # Git repo (remote is Guild server)
├── .gitignore         # Includes guild.json
├── agent.ts           # Your agent code (default location; can also be in src/)
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
└── guild.json         # Agent ID (gitignored, local only)
```

## Version Lifecycle

1. **Draft** - After `guild agent save` (no `--publish`)
2. **Validating** - After `--publish`, running validation
3. **Published** - Validation passed, available for use
4. **Failed** - Validation failed, check errors

## CLI Commands

```bash
guild setup                                        # Install coding assistant skills
guild setup --claude-md                            # Also create CLAUDE.md template
guild agent init                                   # Create and initialize a new agent
guild agent init --name <name> --template LLM      # Create with specific name and template
guild agent init --fork <agent-id>                 # Fork existing agent
guild agent pull                                   # Pull remote changes
guild agent save                                   # Push commits and create a draft version
guild agent save -A --message "description"        # Stage+commit+push in one step
guild agent save --message "v1.0" --wait --publish # Save + validate + publish
guild agent save --bump minor --message "v1.1"     # Auto-bump version before saving
guild agent test                                   # Interactive test
guild agent test --ephemeral                       # Ephemeral test
guild agent chat "Hello"                           # Test with input
guild agent get [agent-id]                         # View agent info
guild agent list                                   # List agents
guild agent list --search "github" --published     # Search published agents
guild agent search <query>                         # Search published agents
guild agent versions [agent-id]                    # Version history
guild agent clone <agent-id>                       # Clone existing agent
guild agent fork [identifier]                      # Fork an agent (latest published version, or identifier:version)
guild agent publish                                # Publish a version
guild agent unpublish                              # Remove from catalog
guild agent update [identifier]                    # Update agent metadata
guild agent workspaces [agent-id]                  # List workspaces using an agent
guild agent tags list|add|remove|set               # Manage agent tags
guild agent revalidate                             # Re-run validation
guild agent code [agent-id]                        # View agent source
guild agent grep <pattern>                         # Search agent code files for a regex pattern
guild agent grep <pattern> --published             # Search only published agents
guild agent owners                                 # List accounts that can own agents
guild workspace select                             # Set default workspace (writes to guild.json if in agent dir)
```

### Environment Variable Overrides

```bash
GUILD_WORKSPACE_ID=<id> guild agent test           # Override workspace for this command
GUILD_OWNER_ID=<id> guild agent init --name my-agent  # Override owner for agent creation
```

## Troubleshooting

### "No changes to save"

Working tree is clean and there are no unpushed commits. Make a code change, commit it, then run `guild agent save` again.

### "guild.json not found"

You're not in an agent directory. Either:

- `cd` into the agent directory
- Run `guild agent init` to create one

### Validation Failed

Check the error with `guild agent versions --limit 1`. Common issues:

- TypeScript compilation errors
- Missing dependencies
- Invalid schema

### guild.json Accidentally Tracked

If `guild.json` is tracked in git (it shouldn't be):

```bash
echo "guild.json" >> .gitignore
git rm --cached guild.json
guild agent save -A --message "fix: Add guild.json to gitignore"
```
