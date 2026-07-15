# Workshop project

For ANY browser use — testing, exploration, debugging, scraping, taking
screenshots, anything that drives a browser — use the `playwright-cli`
skill. Do not reach for other browser-automation tools or hand-rolled
scripts.

Use the `playwright-cli` skill to write and run end-to-end tests against
your running application before reporting any change complete. Start the
app, exercise the change through the browser, and verify the full
request/response/render path — regardless of which backend or frontend
stack you've chosen.

Default to launching the browser with `--headed` so attendees can see
what's happening. The user may request headless, or you can ask whether
they want headed or headless if it's unclear.

# Test coverage for new features

After implementing a new feature (not a bug fix, small tweak, or config
change), automatically spawn the `test-writer` subagent (via the Agent tool,
`subagent_type: "test-writer"`) to write backend unit tests (`node:test`,
`npm test`) and Playwright e2e tests (`@playwright/test`, `npm run
test:e2e`) for it — do this without asking first. Give it enough context to
know what was built (the files you changed and why). Wait for it to report
back and confirm both suites pass before telling the user the feature is
done.
