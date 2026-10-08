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
import { EnvironmentBuilder, EnvironmentOf } from '@hexlabs/env-vars-ts';

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
export type RuntimeEnvironment = EnvironmentOf<typeof environmentConfig>;
```

Then get them when you need them:

```typescript
//Lazily retrieve the environment when you want to verify it
//By default this will use process.env to get the environment variables
//You can also pass your own from elsewhere if necessary
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

If any required variables are missing (and have no default), `environment()` throws an error listing all of them:
```
The following environment variables are required but not set ["ENVIRONMENT_NAME","SOME_SECRET"]
```

You may also add to the environment config in a modular way as follows:
```typescript
//This will create another instance of EnvironmentBuilder and does not affect the original.
const anotherEnvConfig = environmentConfig.addRequired('ANOTHER_ENV');
```

## Behaviour

### Optionals
Optional variables that are not set are left out of the result entirely (rather than being present as `undefined`), and their transforms are not called.

### Transforms
- A transform is only called with a value that is set, so it always receives a `string`.
- One transform can be applied to several variables at once: `.transform(s => s === 'true', 'FLAG_A', 'FLAG_B')`.
- Transforming the same variable again replaces the earlier transform.
- If a transform throws, `environment()` throws an error naming the variable (`Environment variable X is invalid: <message>`), which makes transforms a good place for validation.

### Built-in Transforms
Common transforms are provided. Each one rejects values it can't parse, and the error names the variable:
```
Environment variable APP_PORT is invalid: expected an integer but got "eighty"
```

```typescript
import { EnvironmentBuilder, asBoolean, asEnum, asInteger, asJson, asList, asNumber, asUrl } from '@hexlabs/env-vars-ts';

const config = EnvironmentBuilder
  .create('APP_PORT', 'RATE', 'DEBUG', 'LOG_LEVEL', 'HOSTS', 'PORTS', 'API_URL', 'FEATURES')
  .transform(asInteger, 'APP_PORT')                          // number, rejects decimals
  .transform(asNumber, 'RATE')                               // number, e.g. "3.14", "-1e3"
  .transform(asBoolean, 'DEBUG')                             // boolean from true/false, 1/0, yes/no, y/n, on/off (case-insensitive)
  .transform(asEnum('DEBUG', 'INFO', 'WARN'), 'LOG_LEVEL')   // 'DEBUG' | 'INFO' | 'WARN'
  .transform(asList(), 'HOSTS')                              // string[], split on "," and trimmed
  .transform(asList(',', asInteger), 'PORTS')                // number[], each item transformed
  .transform(asUrl, 'API_URL')                               // URL
  .transform(asJson<{ beta: boolean }>(), 'FEATURES');       // { beta: boolean } (not validated at runtime)
```

Shorthand methods are also available for the most common ones:
```typescript
const config = EnvironmentBuilder
  .create('APP_PORT', 'RATE', 'DEBUG', 'VERBOSE', 'LOG_LEVEL', 'HOSTS', 'API_URL')
  .transformAsInteger('APP_PORT')
  .transformAsNumber('RATE')
  .transformAsBoolean('DEBUG', 'VERBOSE')
  .transformAsEnum(['DEBUG', 'INFO', 'WARN'], 'LOG_LEVEL')
  .transformAsList('HOSTS')    // splits on ","; use .transform(asList(';'), ...) for other separators
  .transformAsUrl('API_URL');
```
For JSON, use `.transform(asJson<YourType>(), ...)`.

### Defaults
- Defaults only apply to required variables, and are used when the variable is not set. An empty string counts as set.
- Defaults are not passed through transforms, so they must already be the transformed type (e.g. `APP_PORT: 8080`, not `'8080'`).
- Calling `defaults()` more than once merges the values; later calls win for the same key.

```typescript
const config = EnvironmentBuilder
  .create('APP_PORT', 'LOG_LEVEL')
  .transform(s => Number.parseInt(s), 'APP_PORT')
  .defaults({ APP_PORT: 8080 })
  .defaults({ LOG_LEVEL: 'INFO' });

config.environment({}); // { APP_PORT: 8080, LOG_LEVEL: 'INFO' }
```

### Builders are immutable
Every method returns a new `EnvironmentBuilder`, so a shared base config can be extended in different ways without the branches affecting each other.

## Environment Types
There are three helper types exported for convenience. Here they are for the example given above.
```typescript
import { EnvironmentOf, InputEnvironmentOf, RequiredEnvironmentOf } from '@hexlabs/env-vars-ts';

// 1. EnvironmentOf - the type returned by environment()
type Env = EnvironmentOf<typeof environmentConfig>;
// {
//   ENVIRONMENT_NAME: string;
//   SOME_SECRET: string;
//   LOG_LEVEL: string;
//   APP_PORT: number;
//   SOME_OPTIONAL_ENV?: string;
//   ANOTHER_OPTIONAL_ENV?: string;
// }

// 2. InputEnvironmentOf - the raw string inputs that environment() accepts
type Input = InputEnvironmentOf<typeof environmentConfig>;
// {
//   ENVIRONMENT_NAME: string;
//   SOME_SECRET: string;
//   LOG_LEVEL?: string; // becomes optional because it is defaulted
//   APP_PORT: string; // all inputs are strings
//   SOME_OPTIONAL_ENV?: string;
//   ANOTHER_OPTIONAL_ENV?: string;
// }

// 3. RequiredEnvironmentOf - only the variables that must be set (no optionals or defaulted variables)
// Useful when defining AWS Lambda functions in CDK / CloudFormation
type Required = RequiredEnvironmentOf<typeof environmentConfig>;
// {
//   ENVIRONMENT_NAME: string;
//   SOME_SECRET: string;
//   APP_PORT: string;
// }
```

The same types are also available as `typeof environmentConfig.environmentType`, `typeof environmentConfig.inputEnvironmentType` and `typeof environmentConfig.requiredEnvironmentType`.
These properties are type-only and do not exist at runtime, so only use them with `typeof`.
