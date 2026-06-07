# Git Guidelines

## Git Workflow: Feature Branch Workflow

The project will use a Feature Branch Workflow.

All development work must be done in dedicated branches created from `dev`.
Developers must not work directly on `main`, `master`, or `dev`.

The `dev` branch will be used as the main integration branch.
The `main` or `master` branch must only contain stable and reviewed code.

The general workflow is:

```sh
feature/fix/docs/refactor branch
        ↓
       dev
        ↓
 main/master
```

## Backlog

The project backlog will use a simple workflow with the following columns:

| Column        | Description                                |
| ------------- | ------------------------------------------ |
| `To Do`       | Work item pending to start.                |
| `In Progress` | Work item currently being developed.       |
| `In Review`   | Work item with an open Pull Request.       |
| `Done`        | Work item completed, reviewed, and merged. |

Each work item should have a short and clear title, an assignee, and its corresponding group ID when applicable.

## Group ID Convention

Each group must use its corresponding group ID in work item identifiers, branch names, Pull Request titles, and commit references when applicable.

| Group    | Project Manager | Group ID |
| -------- | --------------- | -------- |
| Group 01 | Andres          | `01`     |
| Group 02 | Alexander       | `02`     |

Examples:

```sh
01-UM-001
02-UM-001
01-SQA-003
02-SQA-003
```

If the work belongs to the group where Andres is the PM, the ID must include `01`.

If the work belongs to the group where Alexander is the PM, the ID must include `02`.

## Branches

Branch template:

```sh
<type>/<group-id>-<team>/<description>
```

### Branch Types

| Type       | Description                                                       | Example                                   |
| ---------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `feature`  | Used to develop a new feature                                     | `feature/01-SQA/add-user-validation`      |
| `fix`      | Used to fix a bug                                                 | `fix/02-CA/fix-login-error`               |
| `docs`     | Used to add or update documentation                               | `docs/01-GIT/update-guidelines`           |
| `refactor` | Used to improve internal code structure without changing behavior | `refactor/02-DB/clean-repository-methods` |

### Branch Rules

* New branches must be created from `dev`.
* Branch names must include the correct group ID.
* Branch names must be clear and related to the issue or task.
* Developers must not commit directly to `main`, `master`, or `dev`.
* Each branch should focus on one specific change.
* Branches should be kept updated with `dev` before opening a Pull Request.
* Once the work is complete, a Pull Request must be opened into `dev`.
* Only stable and reviewed changes from `dev` can be merged into `main` or `master`.

## Commits

Commit template:

```sh
<type>: <description> (<group-id>-<issue>)
```

Examples:

```sh
feat: add user authentication (01-UM-001)
fix: validate empty email field (02-UM-003)
docs: update git guidelines (01-GIT-001)
refactor: simplify user repository (02-CA-004)
```

### Commit Rules

* Commit messages must be written in lowercase.
* Commit descriptions must be clear and written in present tense.
* Each commit should represent a specific and meaningful change.
* The correct group ID must be included when referencing an issue or task.
* If the commit closes an issue, include it in the footer.

Example:

```md
fix: validate empty email field (01-UM-003)

This commit adds validation for empty email fields during user creation.

Fixes 01-UM-003
```

## Pull Requests

Pull Requests must be used to merge changes into `dev`.

A Pull Request from `dev` into `main` or `master` should only be created when the integrated work has been reviewed, tested, and approved.

### Pull Request Rules

* The PR title must include the correct group ID.
* The PR must have a clear title.
* The PR must explain what was changed.
* The PR must explain how the change was tested.
* The PR must be linked to an issue or task when applicable.
* The branch must be updated with `dev` before merging.
* The PR must not introduce build errors.
* Large PRs should be avoided when the work can be divided into smaller changes.
* At least one or two reviewers should approve the PR before merging.

### Pull Request Title Template

```sh
<group-id>-<issue/feat>: <short description>
```

Examples:

```sh
01-UM-001: add user authentication
02-UM-003: fix login validation
01-GIT-001: update git guidelines
```

## Pull Request Template

```md
## Description

Briefly describe the changes introduced in this Pull Request.

## Related Issue

- Issue ID:
- Group ID:

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactor

## What was done?

-

## Additional Notes

Add any relevant information, risks, limitations, or pending work.
```


## Merge Flow

```sh
feature/fix/docs/refactor branch
        ↓
       dev
        ↓
 main/master
```

* Daily development changes must be merged into `dev`.
* `main` or `master` must only receive stable versions from `dev`.
* Emergency fixes can be done in a `fix` branch, but they must still go through a Pull Request.
