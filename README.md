# ENV-VARS-TS

Typesafe control over environment variables in Typescript.

[![Build](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts.svg)](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts)

## Get Started
Before using this library ensure that you have `"strict": true` set in tsconfig.

Define a type for the environment that you want: 

```typescript
type MyEnvs = {
  ENV_ONE: string; //required (secret value)
  ENV_TWO: string; //required
  ENV_THREE?: string; //optional
  ENV_FOUR?: string; //optional
}
```

Set up an Environment object defining default values:

```typescript
// Extracts environment variables from process.env and if a required env 
// is not present and does not have a default value then an error will be thrown.
// this behaviour can be overridden by passing config as second arg
const environmentVariables = Environment.fromProcess<MyEnvs>({
  requiredDefaults: {
    ENV_ONE: 'ENV_ONE DEFAULT VALUE', // When not supplied ENV_ONE gets this value
    ENV_TWO: undefined // All envs must provide a default (undefined when no default)
  },
  optionalDefaults: {
    ENV_THREE: 'ENV_THREE DEFAULT VALUE',
    ENV_FOUR: undefined
  }
}, { /* These configurations are all optional and have default values */
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

Make use of environment variables:

```typescript
// Pull out environment directly. Its type is MyEnvs
const environment = environmentVariables.environment;
//Use environment variable as it has now been verified
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

