import { asBoolean, asEnum, asInteger, asJson, asList, asNumber, asUrl, EnvironmentBuilder, EnvironmentOf } from '../src/environment';

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const assertType = <T extends true>(_: T = true as T) => _;

describe('Transforms', () => {

  describe('asNumber', () => {
    it.each([['42', 42], ['3.14', 3.14], ['-1e3', -1000], [' 7 ', 7], ['0', 0]])('should parse %p', (input, expected) => {
      expect(asNumber(input)).toBe(expected);
    });

    it.each(['', '  ', 'abc', '12abc', 'NaN'])('should reject %p', input => {
      expect(() => asNumber(input)).toThrow(`expected a number but got ${JSON.stringify(input)}`);
    });
  });

  describe('asInteger', () => {
    it.each([['8080', 8080], ['-5', -5], ['0', 0]])('should parse %p', (input, expected) => {
      expect(asInteger(input)).toBe(expected);
    });

    it.each(['', '1.5', 'abc'])('should reject %p', input => {
      expect(() => asInteger(input)).toThrow('expected an integer');
    });
  });

  describe('asBoolean', () => {
    it.each(['true', 'TRUE', '1', 'yes', 'Y', 'on', ' true '])('should parse %p as true', input => {
      expect(asBoolean(input)).toBe(true);
    });

    it.each(['false', 'False', '0', 'no', 'n', 'OFF'])('should parse %p as false', input => {
      expect(asBoolean(input)).toBe(false);
    });

    it.each(['', 'maybe', '2'])('should reject %p', input => {
      expect(() => asBoolean(input)).toThrow('expected one of true, 1, yes, y, on, false, 0, no, n, off');
    });
  });

  describe('asUrl', () => {
    it('should parse a URL', () => {
      const url = asUrl('https://example.com:8443/path?q=1');
      expect(url).toBeInstanceOf(URL);
      expect(url.port).toBe('8443');
    });

    it('should reject an invalid URL', () => {
      expect(() => asUrl('not a url')).toThrow('expected a URL but got "not a url"');
    });
  });

  describe('asJson', () => {
    it('should parse JSON', () => {
      expect(asJson<{ a: number }>()('{"a":1}')).toEqual({ a: 1 });
    });

    it('should reject invalid JSON', () => {
      expect(() => asJson()('{oops')).toThrow('expected valid JSON');
    });
  });

  describe('asEnum', () => {
    it('should allow listed values', () => {
      expect(asEnum('DEBUG', 'INFO')('INFO')).toBe('INFO');
    });

    it('should reject values that are not listed, including different case', () => {
      expect(() => asEnum('DEBUG', 'INFO')('info')).toThrow('expected one of DEBUG, INFO but got "info"');
    });
  });

  describe('asList', () => {
    it('should split on commas by default, trimming and ignoring empty items', () => {
      expect(asList()(' a, b ,,c, ')).toEqual(['a', 'b', 'c']);
    });

    it('should return an empty list for an empty value', () => {
      expect(asList()('')).toEqual([]);
    });

    it('should split on a custom separator', () => {
      expect(asList(';')('a;b,c')).toEqual(['a', 'b,c']);
    });

    it('should transform each item', () => {
      expect(asList(',', asInteger)('1, 2, 3')).toEqual([1, 2, 3]);
    });

    it('should reject the list if any item is invalid', () => {
      expect(() => asList(',', asInteger)('1, x')).toThrow('expected an integer but got "x"');
    });
  });

  describe('With EnvironmentBuilder', () => {
    const config = EnvironmentBuilder
      .create('PORT', 'DEBUG', 'LOG_LEVEL', 'HOSTS')
      .optionals('API_URL', 'FEATURES')
      .transform(asInteger, 'PORT')
      .transform(asBoolean, 'DEBUG')
      .transform(asEnum('DEBUG', 'INFO', 'WARN', 'ERROR'), 'LOG_LEVEL')
      .transform(asList(), 'HOSTS')
      .transform(asUrl, 'API_URL')
      .transform(asJson<{ beta: boolean }>(), 'FEATURES')
      .defaults({ LOG_LEVEL: 'INFO', DEBUG: false });

    it('should infer the transformed types', () => {
      assertType<Equals<EnvironmentOf<typeof config>, {
        PORT: number;
        DEBUG: boolean;
        LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
        HOSTS: string[];
        API_URL?: URL;
        FEATURES?: { beta: boolean };
      }>>();
    });

    it('should only accept defaults matching the transformed types', () => {
      // @ts-expect-error - not one of the enum values
      config.defaults({ LOG_LEVEL: 'TRACE' });
      expect(true).toBe(true);
    });

    it('should transform the environment', () => {
      const environment = config.environment({
        PORT: '8080',
        HOSTS: 'a.com, b.com',
        API_URL: 'https://api.example.com',
        FEATURES: '{"beta":true}',
      });
      expect(environment).toStrictEqual({
        PORT: 8080,
        DEBUG: false,
        LOG_LEVEL: 'INFO',
        HOSTS: ['a.com', 'b.com'],
        API_URL: new URL('https://api.example.com'),
        FEATURES: { beta: true },
      });
    });

    it('should name the variable when a transform fails', () => {
      expect(() => config.environment({ PORT: 'eighty', HOSTS: '' }))
        .toThrow('Environment variable PORT is invalid: expected an integer but got "eighty"');
    });

    it('should name the variable when an optional transform fails', () => {
      expect(() => config.environment({ PORT: '1', HOSTS: '', API_URL: 'nope' }))
        .toThrow('Environment variable API_URL is invalid: expected a URL but got "nope"');
    });

    it('should name the variable when a custom transform throws a non-Error', () => {
      const builder = EnvironmentBuilder.create('A').transform(() => { throw 'bad'; }, 'A');
      expect(() => builder.environment({ A: 'x' })).toThrow('Environment variable A is invalid: bad');
    });
  });

  describe('transformAs methods', () => {
    const config = EnvironmentBuilder
      .create('PORT', 'RATE', 'DEBUG', 'LOG_LEVEL', 'HOSTS')
      .optionals('API_URL')
      .transformAsInteger('PORT')
      .transformAsNumber('RATE')
      .transformAsBoolean('DEBUG')
      .transformAsEnum(['DEBUG', 'INFO'], 'LOG_LEVEL')
      .transformAsList('HOSTS')
      .transformAsUrl('API_URL')
      .defaults({ DEBUG: false, LOG_LEVEL: 'INFO' });

    it('should infer the same types as the equivalent transform calls', () => {
      assertType<Equals<EnvironmentOf<typeof config>, {
        PORT: number;
        RATE: number;
        DEBUG: boolean;
        LOG_LEVEL: 'DEBUG' | 'INFO';
        HOSTS: string[];
        API_URL?: URL;
      }>>();
    });

    it('should transform the environment', () => {
      expect(config.environment({ PORT: '80', RATE: '0.5', HOSTS: 'a, b', API_URL: 'https://x.com' })).toStrictEqual({
        PORT: 80,
        RATE: 0.5,
        DEBUG: false,
        LOG_LEVEL: 'INFO',
        HOSTS: ['a', 'b'],
        API_URL: new URL('https://x.com'),
      });
    });

    it('should transform several variables at once', () => {
      const environment = EnvironmentBuilder.create('A', 'B').transformAsBoolean('A', 'B').environment({ A: 'yes', B: 'off' });
      expect(environment).toEqual({ A: true, B: false });
    });

    it('should reject invalid values, naming the variable', () => {
      expect(() => config.environment({ PORT: '80', RATE: 'fast', HOSTS: '' }))
        .toThrow('Environment variable RATE is invalid: expected a number but got "fast"');
      expect(() => config.environment({ PORT: '80', RATE: '1', HOSTS: '', LOG_LEVEL: 'TRACE' }))
        .toThrow('Environment variable LOG_LEVEL is invalid: expected one of DEBUG, INFO but got "TRACE"');
    });

    it('should reject unknown keys at compile time', () => {
      // @ts-expect-error - unknown key
      EnvironmentBuilder.create('A').transformAsNumber('B');
      // @ts-expect-error - default must be one of the enum values
      config.defaults({ LOG_LEVEL: 'TRACE' });
      expect(true).toBe(true);
    });
  });
});
