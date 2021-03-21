interface EnvironmentVariables {
  [key: string]: string | undefined;
}

type ForcedPartial<T> = { [K in keyof T]: T[K] | undefined };
type OptionalKeysFrom<T> = { [K in keyof T]-?: undefined extends T[K] ? K : never }[keyof T];

type OptionalDefaults<T> = ForcedPartial<Pick<Required<T>, OptionalKeysFrom<T>>>
type RequiredDefaults<T> = ForcedPartial<Omit<T, OptionalKeysFrom<T>>>

type KeysWithNonEmptyObjects<T> = { [K in keyof T]: keyof T[K] extends never ? never : K}[keyof T];
type PartsWithNonEmptyObjects<T> = Pick<T, KeysWithNonEmptyObjects<T>>

interface _Defaults<T> {
  requiredDefaults: RequiredDefaults<T>,
  optionalDefaults: OptionalDefaults<T>;
}

type Defaults<E> = PartsWithNonEmptyObjects<_Defaults<E>>

type MatchOptionality<T,P> = undefined extends T ? P | undefined : P;

type EnvironmentObject = { [key: string]: string | undefined };

export interface Config<E> {
  secrets?: (keyof E)[];
  secretMapper: (key: keyof E, value?: string) => string | undefined;
  log: (message: string) => void;
  onError: (error: Error, failedKeys?: (keyof E)[], environment?: E) => void
}

function defaultConfig<E>(): Config<E> {
  return {
    log: console.debug,
    secretMapper: (key: keyof E, value?: string) => `SECRET ${new Array(value?.length ?? 0).fill('x').join('')}`,
    onError: error => { throw error; }
  }
}

export default class Environment<E extends EnvironmentVariables> {
  
  private representation?: E;
  
  private constructor(public readonly environment: E, private readonly config: Config<E>) {}
  
  private withMappedSecrets() {
    const secrets: (keyof E)[] = this.config.secrets ?? [];
    return Object.keys(this.environment)
    .reduce((obj, key) => {
      if (secrets.includes(key)) {
        const mapped = this.config.secretMapper(key, this.environment[key]);
        return { ...obj, [key]: mapped }
      }
      return {...obj, [key]: this.environment[key]};
    }, {} as E);
  }
  
  printEnvironment(convert: (env: E) => string = env => JSON.stringify(env, (key, value) => value ?? null, 2)): void {
    if(!this.representation) {
      this.representation = this.withMappedSecrets();
    }
    this.config.log(convert(this.representation));
  }
  
  get<K extends keyof E>(variable: K): E[K] {
    return this.environment[variable];
  }
  
  getBoolean<K extends keyof E>(variable: K): MatchOptionality<E[K], boolean> {
    const env = this.environment[variable];
    return (env !== undefined ? env === 'true' : undefined) as MatchOptionality<E[K], boolean>;
  }
  
  getNumber<K extends keyof E>(variable: K): MatchOptionality<E[K], number> {
    const env = this.environment[variable];
    return (env !== undefined ? +env : undefined) as MatchOptionality<E[K], number>;
  }
  
  getJson<K extends keyof E>(variable: K): { as: <T>() => MatchOptionality<E[K], T> } {
    const env = this.environment[variable];
    return { as: <T>() => {
      if(env !== undefined) {
        try {
          return JSON.parse(env as string) as MatchOptionality<E[K], T>;
        } catch (e) {
          this.config.onError(e, [variable])
        }
      }
      return undefined as MatchOptionality<E[K], T>;
      } };
  }
  
  private static requiredEnvs<E extends EnvironmentVariables>(environment: EnvironmentObject, defaults: RequiredDefaults<E>): { errors: (keyof E)[], requiredEnvs: E } {
    return Object.keys(defaults).reduce((result, key) => {
      const envValue = environment[key] ?? (defaults as { [key: string]: string })[key];
      if (envValue !== undefined) {
        return {errors: result.errors, requiredEnvs: {...result.requiredEnvs, [key]: envValue}};
      }
      return {errors: [...result.errors, key], requiredEnvs: {...result.requiredEnvs, [key]: envValue}};
    }, {errors: new Array<keyof E>(), requiredEnvs: {} as E});
  }
  
  private static optionalEnvs<E extends EnvironmentVariables>(environment: EnvironmentObject, defaults: OptionalDefaults<E>): E {
    return Object.keys(defaults).reduce((result, key) =>
        ({...result, [key]: environment[key] ?? (defaults as { [key: string]: string })[key]})
      , {} as E);
  }
  
  public static from<E extends EnvironmentVariables>(environment: EnvironmentObject, defaults: Defaults<E>, config: Partial<Config<E>> = {}): Environment<E> {
    const {optionalDefaults, requiredDefaults} = defaults as Partial<_Defaults<E>>;
    const optionalEnvs = optionalDefaults ? this.optionalEnvs(environment, optionalDefaults) : undefined;
    const requiredEnvs = requiredDefaults ? this.requiredEnvs(environment, requiredDefaults) : undefined;
    const allEnvs = {...optionalEnvs, ...(requiredEnvs?.requiredEnvs ?? {})} as E;
    const errors = requiredEnvs?.errors ?? [];
    const fullConfig = { ...defaultConfig<E>(), ...config};
    if (errors.length > 0) {
      const message = `The following environment variables are required but not set ${JSON.stringify(errors)}`;
      fullConfig.onError(new Error(message), errors, allEnvs);
    }
    return new Environment<E>(allEnvs, fullConfig)
  }
  
  public static fromProcess<E extends EnvironmentVariables>(defaults: Defaults<E>, config: Partial<Config<E>> = {}): Environment<E> {
    return Environment.from<E>(process.env, defaults, config);
  }
}
