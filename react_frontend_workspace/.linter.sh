#!/bin/bash
cd /home/kavia/workspace/code-generation/secretstream-54786-c3f51740/react_frontend_workspace/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

