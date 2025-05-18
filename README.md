# Stellar.Secret.UIAPP

This is the user-interface for https://stellarsecret.io/ you can run the project locally simply by following the guide below.

### Run a project in development mode on the Local environment(Without SSR)

Step 1: `cp angular.dev.json angular.json`

Step 2: `ionic serve`

Go to in browser: http://localhost:8100/

### Run a Project in development mode on the Local environment(With SSR)

Step 1: `cp angular.dev-ssr.json angular.json`

Step 2: delete `dist` folder

Step 3: delete `node_modules` folder

Step 4: `npm install`

Step 5: `npm run build:ssr`

Step 6: `npm run serve:ssr:app`

Go to in browser: http://localhost:4000/

**Please note:** The above changes are temporary and meant for running the project in the local environment. There is no need to push these changes.

### Run a project on the Server With SSR

Step 1: delete `dist` folder

Step 2: delete `node_modules` folder

Step 3: `npm install`

Step 4: `npm run build:ssr`

Step 5: `npm run serve:ssr:app`

go to in browser and check live URL
