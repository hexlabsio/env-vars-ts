type MapNamesToKeys<T extends readonly string[]> = {
    [K in T[number]]: string;
};
export declare class EnvironmentBuilder<E = unknown, O = unknown> {
    private readonly info;
    private constructor();
    optionals<S extends string[]>(...vars: S): EnvironmentBuilder<E, O & {
        [K in keyof MapNamesToKeys<S>]?: MapNamesToKeys<S>[K];
    }>;
    defaults(defaultValues?: Partial<E>): EnvironmentBuilder<E, O>;
    transform<S extends (keyof (E & O))[], R>(transform: (value: string) => R, ...vars: S): EnvironmentBuilder<Omit<E, S[number]> & {
        [K in keyof Pick<E, Exclude<S[number], keyof O>>]: R;
    }, Omit<O, S[number]> & {
        [K in keyof Pick<O, Exclude<S[number], keyof E>>]: R;
    }>;
    environment(variables?: unknown): {
        [K in keyof (E & O)]: (E & O)[K];
    };
    static create<S extends string[]>(...vars: S): EnvironmentBuilder<{
        [K in keyof MapNamesToKeys<S>]: MapNamesToKeys<S>[K];
    }, {}>;
    private requiredEnvs;
    private optionalEnvs;
}
export {};
