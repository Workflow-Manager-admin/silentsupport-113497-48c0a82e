#!/bin/bash
cd /home/kavia/workspace/code-generation/silentsupport-113497-48c0a82e/ticketing_frontend_workspace/ticketing_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

