#!/bin/bash
cd /home/kavia/workspace/code-generation/budget-planner-app-251073-251087/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

