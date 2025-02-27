# Stellar.Secret.UIAPP

The Stellar Secret application, https://stellarsecret.io and the android app.

Can easily be converted to a iOS-app thanks to ionic-framework.

## Run a Project on development mode in Local enviroment(Without SSR)

Step 1: `cp angular.dev.json angular.json`

Step 2: `ionic serve`

Go to in browser: http://localhost:8100/

## Run a Project on development mode in Local enviroment(With SSR)

Step 1: `cp angular.dev-ssr.json angular.json`

Step 2: delete `dist` folder

Step 3: delete `node_modules` folder

Step 4: `npm install`

Step 5: `npm run build:ssr`

Step 6: `npm run serve:ssr:app`

Go to in browser: http://localhost:4000/

**Please note:** The above changes are temporary and meant for running the project in the local environment. There is no need to push these changes.

## Run a Project on Server With SSR

Step 1: delete `dist` folder

Step 2: delete `node_modules` folder

Step 3: `npm install`

Step 4: `npm run build:ssr`

Step 5: `npm run serve:ssr:app`

go to in browser and check live URL
