@hexlabs/env-vars-ts

Typesafe control over environment variables in Typescript.

[![Build](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/hexlabsio/env-vars-ts/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts.svg)](https://badge.fury.io/js/%40hexlabs%2Fenv-vars-ts)

## Get Started

Define the **required** environment variable names that you want by calling `create()`: 

```typescript
const builder = EnvironmentBuilder.create('a', 'b');
```

Define the optional environment variable names that you want:

```typescript
const builder = EnvironmentBuilder
  .create('a', 'b')
  .optionals('c', 'd');
```

Provide defaults optionally:

```typescript
const builder = EnvironmentBuilder
  .create('a', 'b')
  .optionals('c', 'd')
  .defaults({ a: 'default for a' });
```

Get environment variables from `process.env` by default or provide your own

```typescript
// The type of environment is { a: string; b: string; c?: string; d?: string }
const environment = EnvironmentBuilder
  .create('a', 'b')
  .optionals('c', 'd')
  .defaults({ a: 'default for a' })
  .environment(); // <- Provide your own envs here
```

Provide custom transforms for selected envs

```typescript
// The type of environment is 
// {
//   selected: boolean;
//   count: number;
//   optionallySelected?: boolean;
//   standardEnv?: string;
// }
const environment = EnvironmentBuilder
  .create('selected', 'count')
  .optionals('optionallySelected', 'standardEnv')
  .transform(s => s === 'true', 'selected', 'optionallySelected')
  .transform(s => Number.parseInt(s), 'count')
  .defaults({ count: 25 }) // defaults will take into account your transforms notice this is a number and not a string.
  .environment();
```

Lazily retrieve the type of environment before running 
```typescript
const environmentBuilder = EnvironmentBuilder.create('a', 'b');

// Use Type alias for the environment defintion 
// We use this in HexLabs to define expected lambda environment variables when creating CloudFormation stacks
// where we do not want to check at build time as the stack is generated form TypeScript.
type EnvVars = ReturnType<typeof environmentBuilder.environment>;

//Get actual environment variables somewhere else
const environment = environmentBuilder.environment();
```

