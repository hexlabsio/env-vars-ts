class EnvironmentBuilder {
    info;
    constructor(info) {
        this.info = info;
    }
    optionals(...vars) {
        return new EnvironmentBuilder({ ...this.info, optionalKeys: [...this.info.optionalKeys, ...vars] });
    }
    defaults(defaultValues = {}) {
        return new EnvironmentBuilder({ ...this.info, defaultValues });
    }
    transform(transform, ...vars) {
        return new EnvironmentBuilder({ ...this.info, transforms: vars.reduce((prev, next) => ({ ...prev, [next]: transform }), this.info.transforms) });
    }
    environment(variables = process.env) {
        const optionalEnvs = this.optionalEnvs(variables);
        const requiredEnvs = this.requiredEnvs(variables);
        const allEnvs = { ...optionalEnvs, ...requiredEnvs.requiredEnvs };
        const errors = requiredEnvs?.errors ?? [];
        if (errors.length > 0) {
            const message = `The following environment variables are required but not set ${JSON.stringify(errors)}`;
            throw new Error(message);
        }
        return allEnvs;
    }
    static create(...vars) {
        return new EnvironmentBuilder({ requiredKeys: vars, optionalKeys: [], defaultValues: {}, transforms: {} });
    }
    requiredEnvs(environment) {
        return this.info.requiredKeys.reduce((result, key) => {
            const envValue = environment[key] ?? this.info.defaultValues[key];
            if (envValue !== undefined) {
                const transformed = this.info.transforms[key] ? this.info.transforms[key](envValue) : envValue;
                return { errors: result.errors, requiredEnvs: { ...result.requiredEnvs, [key]: transformed } };
            }
            return { errors: [...result.errors, key], requiredEnvs: { ...result.requiredEnvs, [key]: envValue } };
        }, { errors: new Array(), requiredEnvs: {} });
    }
    optionalEnvs(environment) {
        return this.info.optionalKeys.reduce((result, key) => {
            const transformed = this.info.transforms[key] ? this.info.transforms[key](environment[key]) : environment[key];
            return ({ ...result, [key]: transformed });
        }, {});
    }
}

export { EnvironmentBuilder };
//# sourceMappingURL=environment.mjs.map
