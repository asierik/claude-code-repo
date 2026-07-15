# Test coverage for new features

After implementing a new feature (not a bug fix, small tweak, or config
change), automatically spawn the `test-writer` subagent (via the Agent tool,
`subagent_type: "test-writer"`) to write backend unit tests (`node:test`,
`npm test`) and Playwright e2e tests (`@playwright/test`, `npm run
test:e2e`) for it — do this without asking first. Give it enough context to
know what was built (the files you changed and why). Wait for it to report
back and confirm both suites pass before telling the user the feature is
done.
