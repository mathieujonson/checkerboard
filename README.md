# Checkerboard

### The Shortcut Board Checker

I work with Shortcut, and I have some columns on my board, filled with old cards. Funny solution, this project will spin up a lambda
that will run daily. It will scan the columns in question, and do the following:

- If the card is 6 months old, it will check if the card has a warning comment, and if that's missing, it will leave a warning
- If the card is 6 months old and _has_ a warning comment, and the comment is a week old, it leaves a tagging comment
- If the card is 6 months old, has a warning _and_ a tagging comment, and the tag is a week old, it archives the story
- Deleting the comments on an unarchived story will restart the process the next day when the lambda runs
