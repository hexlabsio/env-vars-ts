import { EnvironmentBuilder } from '../src/environment';

describe('Environment - complex scenarios', () => {

  describe('Builder immutability', () => {
    it('should not affect the original builder when adding optionals, defaults or transforms', () => {
      const base = EnvironmentBuilder.create('a');
      base.optionals('b');
      base.defaults({ a: 'default' });
      base.transform(s => s.length, 'a');

      expect(base.environment({ a: 'abc', b: 'def' })).toEqual({ a: 'abc' });
      expect(() => base.environment({})).toThrow();
    });

    it('should allow branching two independent builders from the same base', () => {
      const base = EnvironmentBuilder.create('a').optionals('o');
      const numeric = base.transform(s => Number.parseInt(s), 'a');
      const bool = base.transform(s => s === 'true', 'a');

      expect(numeric.environment({ a: '42' })).toEqual({ a: 42 });
      expect(bool.environment({ a: 'true' })).toEqual({ a: true });
      expect(base.environment({ a: '42' })).toEqual({ a: '42' });
    });
  });

  describe('Errors', () => {
    it('should report every missing required variable, in declaration order', () => {
      expect(() => EnvironmentBuilder.create('a', 'b', 'c').environment({ b: 'x' }))
        .toThrow('The following environment variables are required but not set ["a","c"]');
    });

    it('should not report missing variables that have defaults', () => {
      expect(() => EnvironmentBuilder.create('a', 'b').defaults({ a: 'x' }).environment({}))
        .toThrow('The following environment variables are required but not set ["b"]');
    });

    it('should never report missing optional variables', () => {
      expect(EnvironmentBuilder.create().optionals('a', 'b').environment({})).toEqual({});
    });

    it('should report missing variables added later with addRequired', () => {
      const builder = EnvironmentBuilder.create('a').addRequired('b');
      expect(() => builder.environment({ a: 'x' }))
        .toThrow('The following environment variables are required but not set ["b"]');
    });

    it('should propagate errors thrown by a transform', () => {
      const builder = EnvironmentBuilder.create('PORT').transform(s => {
        const n = Number.parseInt(s);
        if (Number.isNaN(n)) throw new Error(`PORT is not a number: ${s}`);
        return n;
      }, 'PORT');
      expect(() => builder.environment({ PORT: 'abc' })).toThrow('PORT is not a number: abc');
    });
  });

  describe('Value edge cases', () => {
    it('should treat an empty string as set', () => {
      expect(EnvironmentBuilder.create('a').environment({ a: '' })).toEqual({ a: '' });
    });

    it('should prefer an empty string over a default', () => {
      expect(EnvironmentBuilder.create('a').defaults({ a: 'default' }).environment({ a: '' })).toEqual({ a: '' });
    });

    it('should support falsy default values', () => {
      const environment = EnvironmentBuilder.create('n', 'b', 's')
        .transform(s => Number.parseInt(s), 'n')
        .transform(s => s === 'true', 'b')
        .defaults({ n: 0, b: false, s: '' })
        .environment({});
      expect(environment).toEqual({ n: 0, b: false, s: '' });
    });
  });

  describe('Defaults', () => {
    it('should merge defaults across multiple calls', () => {
      const environment = EnvironmentBuilder.create('a', 'b')
        .defaults({ a: 'A' })
        .defaults({ b: 'B' })
        .environment({});
      expect(environment).toEqual({ a: 'A', b: 'B' });
    });

    it('should let a later default override an earlier one for the same key', () => {
      const environment = EnvironmentBuilder.create('a')
        .defaults({ a: 'first' })
        .defaults({ a: 'second' })
        .environment({});
      expect(environment).toEqual({ a: 'second' });
    });

    it('should keep defaults when adding more required variables afterwards', () => {
      const environment = EnvironmentBuilder.create('a')
        .defaults({ a: 'A' })
        .addRequired('b')
        .environment({ b: 'B' });
      expect(environment).toEqual({ a: 'A', b: 'B' });
    });

    it('should keep defaults when adding optionals afterwards', () => {
      const environment = EnvironmentBuilder.create('a')
        .defaults({ a: 'A' })
        .optionals('o')
        .environment({});
      expect(environment).toEqual({ a: 'A' });
    });

    it('should not run the transform over a default value', () => {
      const transform = jest.fn((s: string) => Number.parseInt(s));
      const environment = EnvironmentBuilder.create('n')
        .transform(transform, 'n')
        .defaults({ n: 7 })
        .environment({});
      expect(environment).toEqual({ n: 7 });
      expect(transform).not.toHaveBeenCalled();
    });
  });

  describe('Transforms', () => {
    it('should transform multiple variables with one transform', () => {
      const environment = EnvironmentBuilder.create('a', 'b', 'c')
        .transform(s => Number.parseInt(s), 'a', 'b')
        .environment({ a: '1', b: '2', c: '3' });
      expect(environment).toEqual({ a: 1, b: 2, c: '3' });
    });

    it('should transform required and optional variables together', () => {
      const environment = EnvironmentBuilder.create('r').optionals('o')
        .transform(s => s.toUpperCase(), 'r', 'o')
        .environment({ r: 'req', o: 'opt' });
      expect(environment).toEqual({ r: 'REQ', o: 'OPT' });
    });

    it('should use the last transform when a variable is transformed twice', () => {
      const environment = EnvironmentBuilder.create('a')
        .transform(s => s.length, 'a')
        .transform(s => s === 'yes', 'a')
        .environment({ a: 'yes' });
      expect(environment).toEqual({ a: true });
    });

    it('should keep transforms when adding more required variables afterwards', () => {
      const environment = EnvironmentBuilder.create('a')
        .transform(s => Number.parseInt(s), 'a')
        .addRequired('b')
        .environment({ a: '5', b: 'x' });
      expect(environment).toEqual({ a: 5, b: 'x' });
    });

    it('should transform variables added with addRequired', () => {
      const environment = EnvironmentBuilder.create('a')
        .addRequired('b')
        .transform(s => Number.parseInt(s), 'b')
        .environment({ a: 'x', b: '9' });
      expect(environment).toEqual({ a: 'x', b: 9 });
    });

    it('should not call the transform for an optional variable that is not set', () => {
      const transform = jest.fn((s: string) => Number.parseInt(s));
      const environment = EnvironmentBuilder.create().optionals('o')
        .transform(transform, 'o')
        .environment({});
      expect(transform).not.toHaveBeenCalled();
      expect(environment).toStrictEqual({});
    });

    it('should not include unset optional variables as undefined keys', () => {
      const environment = EnvironmentBuilder.create('a').optionals('o').environment({ a: 'x' });
      expect(Object.keys(environment)).toEqual(['a']);
    });
  });

  describe('Composition', () => {
    it('should support a full realistic configuration', () => {
      const config = EnvironmentBuilder
        .create('ENVIRONMENT_NAME', 'SOME_SECRET', 'LOG_LEVEL', 'APP_PORT')
        .optionals('SOME_OPTIONAL_ENV', 'FEATURE_FLAG')
        .transform(s => Number.parseInt(s), 'APP_PORT')
        .transform(s => s === 'true', 'FEATURE_FLAG')
        .defaults({ LOG_LEVEL: 'INFO', APP_PORT: 8080 })
        .addRequired('DB_URL');

      expect(config.environment({
        ENVIRONMENT_NAME: 'prod',
        SOME_SECRET: 's3cret',
        DB_URL: 'postgres://db',
        FEATURE_FLAG: 'true',
        UNRELATED: 'ignored',
      })).toStrictEqual({
        ENVIRONMENT_NAME: 'prod',
        SOME_SECRET: 's3cret',
        LOG_LEVEL: 'INFO',
        APP_PORT: 8080,
        DB_URL: 'postgres://db',
        FEATURE_FLAG: true,
      });
    });

    it('should evaluate process.env lazily at call time', () => {
      const builder = EnvironmentBuilder.create('LAZY_VAR');
      process.env = {};
      expect(() => builder.environment()).toThrow();
      process.env = { LAZY_VAR: 'now-set' };
      expect(builder.environment()).toEqual({ LAZY_VAR: 'now-set' });
    });
  });
});
