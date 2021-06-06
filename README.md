# ENV-VARS-TS

Typesafe control over environment variables in Typescript.

[![Build](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts.svg)](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts)

## Get Started
Before using this library ensure that you have `"strict": true` set in tsconfig.

Define the required environment variable names that you want: 

```typescript
const required = ['ENV_ONE', 'ENV_TWO'] as const; //as const is important for type information
```

Define the optional environment variable names that you want:

```typescript
const optional = ['ENV_THREE', 'ENV_FOUR'] as const; //as const is important for type information
```

Set up an Environment object providing default values (or not):

```typescript
const environmentVariables = defineEnvironmentFromProcess(required, optional, { ENV_ONE: 'default value' });
```

You can also provide various configuration options to hide secrets or log differently
```typescript
const environmentVariables = defineEnvironmentFromProcess(required, optional, { ENV_ONE: 'default value' }, 
{ /* These configurations are all optional and have default values */
  //List of keys considered secrets
  secrets: ['ENV_ONE'],
  // Controls what happens to secrets for printing
  secretMapper: (key, value) => 'xxxxxxx',
  // Controls what happens when errors occur, throws by default
  onError: (error, failedKeys, environment) => { throw error },
  // Controls how logs are printed
  log: console.debug
});
```

If all you want is the typed environment you can do this:

```typescript
const {environment} = defineEnvironmentFromProcess(required, optional);

//The type of environment will be { ENV_ONE: string; ENV_TWO: string; ENV_THREE?: string; ENV_FOUR?: string }
```

Make use of environment variables:

```typescript
// Pull out environment directly. Its type will have the required / optional parts that were passed
const environment = environmentVariables.environment;
//Use environment variable as they has now been verified
console.log(environment.ENV_ONE);

// Get ENV_ONE. Its type is string;
const envOne = environmentVariables.get('ENV_ONE');
// Get ENV_FOUR. Its type is (string | undefined);
const envFour = environmentVariables.get('ENV_FOUR')

// Print environment variables
environmentVariables.printEnvironment();
// Prints:
//{
//   "ENV_THREE": "ENV_THREE DEFAULT VALUE",
//   "ENV_FOUR": null,
//   "ENV_ONE": "SECRET xxxxxxxxxxxxxxxxxxxxx",
//   "ENV_TWO": "ENV_TWO_VALUE"
// }

// Convert environment variable to a number
environmentVariables.getNumber('NUM_ENV'); // Can result in NaN
// Convert environment variable to a boolean
environmentVariables.getBoolean('BOOL_ENV'); // Results in false if not 'true'
// Convert environment variable to JSON (object, array, null, number, boolean)
environmentVariables.getJson('JSON_ENV').as<SOMETYPE>(); // On parse failure calls config.onError (defaults to throw error)
```

