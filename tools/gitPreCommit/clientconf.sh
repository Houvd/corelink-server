#!/bin/bash
echo "copying files for linting"
cd ..
cp gitPreCommit/pre-commit .git/hooks/ # copy the pre-commit hooks to the git hooks folder
cp -r gitPreCommit .git/ # copy the gitPreCommit folder into the git folder so it won't disrupt the repository
rm .git/gitPreCommit/clientconf.sh
rm .git/gitPreCommit/pre-commit
echo "installing necessary files"
cd .git/gitPreCommit/
npm install eslint eslint-config-airbnb-base eslint-config-prettier eslint-plugin-jest prettier eslint-plugin-import@latest
echo "automatic linting is installed, you can now delete the gitPreCommit folder if needed"
