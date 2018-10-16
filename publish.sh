#!/bin/sh

set -e;

if ! git diff-files --quiet; then
    echo "Can not publish with unstaged uncommited changes";
    exit 1;
fi;

if ! git diff-index --quiet --cached HEAD; then
    echo "Can not publish with staged uncommited changes";
    exit 1;
fi;

npm test;
rm ./package-lock.json || echo 'No package lock';
npm version ${1-patch};

git push;
git push --tags;
npm publish;
