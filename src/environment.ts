type MapNamesToKeys<T extends readonly string[]> = { [K in T[number]]: string }

type AnyBuilder = EnvironmentBuilder<any, any, any>;
export type EnvironmentOf<B extends AnyBuilder> = B['environmentType'];
export type InputEnvironmentOf<B extends AnyBuilder> = B['inputEnvironmentType'];
export type RequiredEnvironmentOf<B extends AnyBuilder> = B['requiredEnvironmentType'];

type Transformed<Req, Optional, Defaults, K extends PropertyKey, R> = EnvironmentBuilder<
  Omit<Req, K> & { [P in keyof Pick<Req, Extract<Exclude<K, keyof Optional>, keyof Req>>]: R },
  Omit<Optional, K> & { [P in keyof Pick<Optional, Extract<Exclude<K, keyof Req>, keyof Optional>>]: R },
  Defaults
>;

export class EnvironmentBuilder<Req = unknown, Optional = unknown, Defaults = unknown> {

  declare readonly environmentType: { [K in keyof (Req & Optional)]: (Req & Optional)[K] };
  declare readonly inputEnvironmentType: { [K in keyof (Omit<typeof this.environmentType, keyof Defaults> & Partial<Defaults>)]: string };
  declare readonly requiredEnvironmentType: { [K in Exclude<keyof Req, keyof Defaults>]: string };

  private constructor(
    private readonly info: {
      requiredKeys: string[];
      optionalKeys: string[];
      defaultValues: Partial<Req>;
      transforms: Record<string, (s: string) => unknown>;
    }
  ){}

  optionals<const S extends string[]>(...vars: S): EnvironmentBuilder<Req, Optional & { [K in keyof MapNamesToKeys<S>]?: MapNamesToKeys<S>[K] }, Defaults> {
    return new EnvironmentBuilder({ ...this.info, optionalKeys: [...this.info. optionalKeys, ...vars] });
  }

  defaults<D extends Partial<Req>>(defaultValues: D): EnvironmentBuilder<Req, Optional, Defaults & D> {
    return new EnvironmentBuilder({ ...this.info, defaultValues: { ...this.info.defaultValues, ...defaultValues } });
  }

  transform<const S extends (keyof (Req & Optional))[], R>(transform: (value: string) => R, ...vars: S): Transformed<Req, Optional, Defaults, S[number], R> {
    return new EnvironmentBuilder(
      { ...this.info, transforms: vars.reduce((prev, next) => ({...prev, [next]: transform}), this.info.transforms) } as any
    );
  }

  transformAsNumber<const S extends (keyof (Req & Optional))[]>(...vars: S): Transformed<Req, Optional, Defaults, S[number], number> {
    return this.transform(asNumber, ...vars);
  }

  transformAsInteger<const S extends (keyof (Req & Optional))[]>(...vars: S): Transformed<Req, Optional, Defaults, S[number], number> {
    return this.transform(asInteger, ...vars);
  }

  transformAsBoolean<const S extends (keyof (Req & Optional))[]>(...vars: S): Transformed<Req, Optional, Defaults, S[number], boolean> {
    return this.transform(asBoolean, ...vars);
  }

  transformAsUrl<const S extends (keyof (Req & Optional))[]>(...vars: S): Transformed<Req, Optional, Defaults, S[number], URL> {
    return this.transform(asUrl, ...vars);
  }

  transformAsList<const S extends (keyof (Req & Optional))[]>(...vars: S): Transformed<Req, Optional, Defaults, S[number], string[]> {
    return this.transform(asList(), ...vars);
  }

  transformAsEnum<const V extends readonly string[], const S extends (keyof (Req & Optional))[]>(values: V, ...vars: S): Transformed<Req, Optional, Defaults, S[number], V[number]> {
    return this.transform(asEnum(...values), ...vars);
  }

  environment(variables: unknown = process.env): typeof this.environmentType {
    const optionalEnvs = this.optionalEnvs(variables);
    const requiredEnvs = this.requiredEnvs(variables);
    const allEnvs = {...optionalEnvs, ...requiredEnvs.requiredEnvs};
    const errors = requiredEnvs?.errors ?? [];
    if (errors.length > 0) {
      const message = `The following environment variables are required but not set ${JSON.stringify(errors)}`;
      throw new Error(message);
    }
    return allEnvs as any;
  }

  static create<const S extends string[]>(...vars: S): EnvironmentBuilder<{ [K in keyof MapNamesToKeys<S>]: MapNamesToKeys<S>[K] }, {}, {}> {
    return new EnvironmentBuilder({ requiredKeys: vars, optionalKeys: [], defaultValues: {}, transforms: {} }) as any;
  }

  addRequired<const S extends string[]>(...vars: S): EnvironmentBuilder<Req & { [K in keyof MapNamesToKeys<S>]: MapNamesToKeys<S>[K] }, Optional, Defaults> {
    return new EnvironmentBuilder({ requiredKeys: [ ...this.info.requiredKeys, ...vars ], optionalKeys: this.info.optionalKeys, defaultValues: this.info.defaultValues, transforms: this.info.transforms }) as any;
  }

  private requiredEnvs(environment: any): { errors: string[], requiredEnvs: any } {
    return this.info.requiredKeys.reduce((result, key) => {
      const value = environment[key];
      const hasValue = value !== undefined;
      const envValue = hasValue ? environment[key] : (this.info.defaultValues as any)[key];
      if (envValue !== undefined) {
        const transformed = hasValue ? this.applyTransform(key, envValue) : envValue;
        return {errors: result.errors, requiredEnvs: {...result.requiredEnvs, [key]: transformed}};
      }
      return {errors: [...result.errors, key], requiredEnvs: {...result.requiredEnvs, [key]: envValue}};
    }, {errors: new Array<string>(), requiredEnvs: {}});
  }

  private optionalEnvs(environment: any): any {
    return this.info.optionalKeys.reduce((result, key) => {
      if (environment[key] === undefined) return result;
      return ({...result, [key]: this.applyTransform(key, environment[key]) });
    }, {});
  }

  private applyTransform(key: string, value: string): unknown {
    const transform = this.info.transforms[key];
    if (!transform) return value;
    try {
      return transform(value);
    } catch (e) {
      throw new Error(`Environment variable ${key} is invalid: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

function invalid(expected: string, value: string): Error {
  return new Error(`expected ${expected} but got ${JSON.stringify(value)}`);
}

/** Parses any numeric value, e.g. "42", "3.14", "-1e3". Rejects empty and non-numeric values. */
export function asNumber(value: string): number {
  const result = Number(value);
  if (value.trim() === '' || Number.isNaN(result)) throw invalid('a number', value);
  return result;
}

/** Parses a whole number, e.g. "8080". Rejects decimals. */
export function asInteger(value: string): number {
  const result = Number(value);
  if (value.trim() === '' || !Number.isInteger(result)) throw invalid('an integer', value);
  return result;
}

const trueValues = ['true', '1', 'yes', 'y', 'on'];
const falseValues = ['false', '0', 'no', 'n', 'off'];

/** Parses true/false, 1/0, yes/no, y/n or on/off (case-insensitive). Rejects anything else. */
export function asBoolean(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  if (trueValues.includes(normalised)) return true;
  if (falseValues.includes(normalised)) return false;
  throw invalid(`one of ${[...trueValues, ...falseValues].join(', ')}`, value);
}

/** Parses a URL, e.g. "https://example.com". */
export function asUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw invalid('a URL', value);
  }
}

/** Parses JSON. The type parameter is not validated at runtime. */
export function asJson<T = unknown>(): (value: string) => T {
  return value => {
    try {
      return JSON.parse(value);
    } catch {
      throw invalid('valid JSON', value);
    }
  };
}

/** Only allows one of the given values, and narrows the type to them. */
export function asEnum<const T extends readonly string[]>(...values: T): (value: string) => T[number] {
  return value => {
    if (!values.includes(value)) throw invalid(`one of ${values.join(', ')}`, value);
    return value;
  };
}

/** Splits a value into a trimmed list, ignoring empty items. Optionally transforms each item. */
export function asList(separator?: string): (value: string) => string[];
export function asList<R>(separator: string, item: (value: string) => R): (value: string) => R[];
export function asList(separator = ',', item: (value: string) => unknown = value => value): (value: string) => unknown[] {
  return value => value.split(separator).map(part => part.trim()).filter(part => part !== '').map(item);
}
