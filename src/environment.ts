type MapNamesToKeys<T extends readonly string[]> = { [K in T[number]]: string }

export class EnvironmentBuilder<E = unknown, O = unknown> {

  private constructor(
    private readonly info: {
      requiredKeys: string[];
      optionalKeys: string[];
      defaultValues: Partial<E>;
      transforms: Record<string, (s: string) => unknown>;
    }
  ){}


  optionals<S extends string[]>(...vars: S): EnvironmentBuilder<E, O & { [K in keyof MapNamesToKeys<S>]?: MapNamesToKeys<S>[K] }> {
    return new EnvironmentBuilder({ ...this.info, optionalKeys: [...this.info. optionalKeys, ...vars] });
  }

  defaults(defaultValues: Partial<E> = {}): EnvironmentBuilder<E, O> {
    return new EnvironmentBuilder({ ...this.info, defaultValues });
  }

  transform<S extends (keyof (E & O))[], R>(transform: (value: string) => R, ...vars: S): EnvironmentBuilder<Omit<E, S[number]> & { [K in keyof Pick<E, Exclude<S[number], keyof O>>]: R }, Omit<O, S[number]> & { [K in keyof Pick<O, Exclude<S[number], keyof E>>]: R }> {
    return new EnvironmentBuilder<any, any>({ ...this.info, transforms: vars.reduce((prev, next) => ({...prev, [next]: transform}), this.info.transforms) });
  }

  environment(variables: unknown = process.env): { [K in keyof (E & O)]: (E & O)[K] } {
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

  static create<S extends string[]>(...vars: S): EnvironmentBuilder<{ [K in keyof MapNamesToKeys<S>]: MapNamesToKeys<S>[K] }, {}> {
    return new EnvironmentBuilder({ requiredKeys: vars, optionalKeys: [], defaultValues: {}, transforms: {} });
  }

  private requiredEnvs(environment: any): { errors: string[], requiredEnvs: any } {
    return this.info.requiredKeys.reduce((result, key) => {
      const value = environment[key];
      const hasValue = value !== undefined;
      const envValue = hasValue ? environment[key] : (this.info.defaultValues as any)[key];
      if (envValue !== undefined) {
        const transformed = (this.info.transforms[key] && hasValue) ? this.info.transforms[key](envValue) : envValue;
        return {errors: result.errors, requiredEnvs: {...result.requiredEnvs, [key]: transformed}};
      }
      return {errors: [...result.errors, key], requiredEnvs: {...result.requiredEnvs, [key]: envValue}};
    }, {errors: new Array<string>(), requiredEnvs: {}});
  }

  private optionalEnvs(environment: any): any {
    return this.info.optionalKeys.reduce((result, key) => {
      const transformed = this.info.transforms[key] ? this.info.transforms[key](environment[key]) : environment[key];
      return ({...result, [key]: transformed });
    }, {});
  }
}
