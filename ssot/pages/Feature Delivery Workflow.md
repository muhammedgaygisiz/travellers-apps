# Feature Delivery Workflow

## Purpose

This workflow describes the normal path from product work selection to a merged pull request and completed issue.

It is the default workflow for implementing a feature, fix, refactor, or launch task.

## Workflow

1. Start from a GitHub issue.
   - Create the issue if it does not exist yet.
   - Add it to the `Bite Tribe` project board. `gh issue create` does not do this, and an issue that is not on the board has no priority and no status. See [[GitHub Project Board And Issue Handling]].
   - Link it to the relevant epic or roadmap item when applicable.
   - Set the board's `Priority` field, `P0` when it is launch-critical or currently selected for execution and `P1` otherwise. Priority is a board field, never a label.
   - Set Status to `In progress` when work starts.

2. Prepare the implementation branch.
   - Create a new branch on GitHub.
   - Check out the branch locally.
   - Confirm local state with `git status --short --branch`.

3. Implement with the assigned coding agent.
   - Follow [[Agent Operating Contract]].
   - Use [[Traceability Map]] to find the relevant SSOT context.
   - Use [[Spec To Code Workflow]] for code ownership, implementation, and validation details.
   - Keep the change scoped to the issue.

4. Create a pull request.
   - Push the branch.
   - Open a pull request on GitHub.
   - Link the PR to the issue.
   - Keep the issue and project status aligned with the PR state.

5. Test locally.
   - Run the Angular app.
   - Run the Firebase simulator.
   - Execute the new or changed functionality in the UI.
   - Verify the UI state before and after the action.
   - Verify Firebase simulator state, logs, documents, functions, storage behavior, or emulator output as relevant.

6. Review on GitHub.
   - Perform a code review in GitHub.
   - Comment directly on the PR where adjustments are needed.
   - Let the assigned coding agent make the fixes and adjustments.
   - Re-run the relevant local checks after fixes.

7. Merge.
   - Merge the PR when required checks are successful.
   - Ignore the Codecov coverage step when it is the only remaining blocker.
   - Move the issue to Done after the PR is merged and the behavior is verified.

## Local Verification Checklist

- Angular app starts successfully.
- Firebase simulator starts successfully.
- New functionality can be executed in the UI.
- UI result matches the expected product behavior.
- Firebase state or emulator output matches the expected backend behavior.
- Regression-sensitive paths still behave as expected.

## Agent Responsibilities

- Keep issue priority, status, branch, PR, and SSOT context aligned.
- Report exactly which local checks were run.
- Mention any check that was skipped and why.
- Preserve unrelated local changes.
- Do not merge unless the user explicitly asks for merge or the workflow step is clearly delegated.

## Related Pages

- [[GitHub Project Board And Issue Handling]]
- [[Traceability Map]]
- [[Spec To Code Workflow]]
- [[Implementation - Testing]]
- [[Release Workflow]]
