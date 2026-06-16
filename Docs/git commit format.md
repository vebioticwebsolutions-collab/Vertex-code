| Prefix   | When to Use                                                                                | SemVer Impact              |
| -------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| docs     | Documentation only changes (README, comments, docs files)                                  | None                       |
| style    | Formatting, whitespace, missing semicolons (no code logic change)                          | None                       |
| refactor | Code change that neither fixes a bug nor adds a feature (renaming variables, reorganizing) | None                       |
| perf     | Code change that improves performance (faster algorithms, optimization)                    | None                       |
| test     | Adding missing tests or correcting existing tests (no production code change)              | None                       |
| chore    | Maintenance tasks: updating dependencies, tooling changes, build scripts                   | None                       |
| build    | Changes affecting build system or external dependencies (npm, gulp, broccoli)              | None                       |
| ci       | Changes to CI configuration files/scripts (Travis, Circle, GitHub Actions)                 | None                       |
| revert   | Reverts a previous commit                                                                  | Depends on original commit |

**Examples**


feat: add RFID scanner API endpoint  
fix: resolve TypeScript type error in database schema  
docs: update README with deployment instructions  
refactor: rename getUserData to fetchUser for consistency  
perf: optimize SQL query for inventory lookup  
test: add unit tests for RFID reader config  
chore: upgrade Prisma from v5 to v6  
ci: add GitHub Actions workflow for auto-deployment  