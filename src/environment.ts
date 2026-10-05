type MapNamesToKeys<T extends readonly string[]> = { [K in T[number]]: string }

export class EnvironmentBuilder<Req = unknown, Optional = unknown, Defaults = unknown> {

  public readonly environmentType: { [K in keyof (Req & Optional)]: (Req & Optional)[K] } = {} as any;
  public readonly inputEnvironmentType: { [K in keyof (Omit<typeof this.environmentType, keyof Defaults> & Partial<Defaults>)]: string } = {} as any;
  public readonly requiredEnvironmentType: { [K in Exclude<keyof Req, keyof Defaults>]: string } = {} as any;

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
    return new EnvironmentBuilder({ ...this.info, defaultValues });
  }

  transform<const S extends (keyof (Req & Optional))[], R>(transform: (value: string) => R, ...vars: S): EnvironmentBuilder<Omit<Req, S[number]> & { [K in keyof Pick<Req, Exclude<S[number], keyof Optional>>]: R }, Omit<Optional, S[number]> & { [K in keyof Pick<Optional, Exclude<S[number], keyof Req>>]: R }, Defaults> {
    return new EnvironmentBuilder<Omit<Req, S[number]> & { [K in keyof Pick<Req, Exclude<S[number], keyof Optional>>]: R }, Omit<Optional, S[number]> & { [K in keyof Pick<Optional, Exclude<S[number], keyof Req>>]: R }, Defaults>(
      { ...this.info, transforms: vars.reduce((prev, next) => ({...prev, [next]: transform}), this.info.transforms) } as any
    );
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
