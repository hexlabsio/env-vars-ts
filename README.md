@hexlabs/env-vars-ts

Typesafe control over environment variables in Typescript.

[![npm version](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts.svg)](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts)

[![Build](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml)

## Get Started

Install the library:

```shell
npm install -S @hexlabs/env-vars-ts
```

Define environment variables that your app needs:

```typescript
export const environmentConfig = EnvironmentBuilder
  .create(
    'ENVIRONMENT_NAME',
    'SOME_SECRET',
    'LOG_LEVEL',
    'APP_PORT'
  )
  //Define optional environment variables like this
  .optionals(
    'SOME_OPTIONAL_ENV',
    'ANOTHER_OPTIONAL_ENV'
  )
  //Transform like this. After this the environment will be typed correctly (APP_PORT will be number)
  .transform(s => Number.parseInt(s), 'APP_PORT')
  //Set default values (this only makes sense if they are required)
  .defaults({ LOG_LEVEL: 'INFO' });

//Export the type like this if you want a nice alias for it.
export type RuntimeEnvironment =  typeof environmentConfig.environmentType;
```

Then get them when you need them:

```typescript
//Lazily retrieve the environment when you want to verify it
//By default this will use process.env() to get the environment variables
//You can also pass your own from elswhere if necessary
const environment = environmentConfig.environment();

```

The type of the environment const and RuntimeEnvironment above is:
```typescript
type RuntimeEnvironment = {
  ENVIRONMENT_NAME: string;
  SOME_SECRET: string;
  LOG_LEVEL: string;
  APP_PORT: number;
  SOME_OPTIONAL_ENV?: string;
  ANOTHER_OPTIONAL_ENV?: string;
}
```

You may also add to the environment config in a modular way as follows:
```typescript
//This will create another instance of EnvironmentBuilder and does not affect the original.
const anotherEnvConfig = environmentConfig.addRequired('ANOTHER_ENV');
```

## Environment Types
There are three types exported for convenience. Here they are for the example given above.
```typescript
// 1. environmentConfig.environmentType
typeof environmentConfig.environmentType = {
  ENVIRONMENT_NAME: string;
  SOME_SECRET: string;
  LOG_LEVEL: string;
  APP_PORT: number;
  SOME_OPTIONAL_ENV?: string;
  ANOTHER_OPTIONAL_ENV?: string;
}
// 2. environmentConfig.inputEnvironmentType
typeof environmentConfig.inputEnvironmentType = {
  ENVIRONMENT_NAME: string;
  SOME_SECRET: string;
  LOG_LEVEL?: string; // becomes optional because it is defaulted
  APP_PORT: string; // all inputs are strings now
  SOME_OPTIONAL_ENV?: string;
  ANOTHER_OPTIONAL_ENV?: string;
}

// 3. environmentConfig.requiredEnvironmentType
// returns a type with only the required environment variables, this can be used when defining AWS Lambda functions in CDK / CloudFormation
typeof environmentConfig.requiredEnvironmentType = {
  ENVIRONMENT_NAME: string;
  SOME_SECRET: string;
  APP_PORT: string;
}
```
