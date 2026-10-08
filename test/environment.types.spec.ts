import { EnvironmentBuilder, EnvironmentOf, InputEnvironmentOf, RequiredEnvironmentOf } from '../src/environment';

// Compile-time assertions. ts-jest type-checks this file, so a wrong type fails the suite.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const assertType = <T extends true>(_: T = true as T) => _;

const config = EnvironmentBuilder
  .create('NAME', 'LOG_LEVEL', 'PORT')
  .optionals('OPT', 'FLAG')
  .transform(s => Number.parseInt(s), 'PORT')
  .transform(s => s === 'true', 'FLAG')
  .defaults({ LOG_LEVEL: 'INFO' });

describe('Environment types', () => {

  it('should type the runtime environment with transforms and optionals', () => {
    assertType<Equals<typeof config.environmentType, {
      NAME: string;
      LOG_LEVEL: string;
      PORT: number;
      OPT?: string;
      FLAG?: boolean;
    }>>();
  });

  it('should return the runtime environment type from environment()', () => {
    const environment = config.environment({ NAME: 'n', PORT: '1' });
    assertType<Equals<typeof environment, typeof config.environmentType>>();
    expect(environment.PORT).toBe(1);
  });

  it('should type input environment as strings, with defaulted keys optional', () => {
    assertType<Equals<typeof config.inputEnvironmentType, {
      NAME: string;
      LOG_LEVEL?: string;
      PORT: string;
      OPT?: string;
      FLAG?: string;
    }>>();
  });

  it('should type required environment without defaulted or optional keys', () => {
    assertType<Equals<typeof config.requiredEnvironmentType, {
      NAME: string;
      PORT: string;
    }>>();
  });

  it('should include variables added with addRequired', () => {
    const extended = config.addRequired('EXTRA');
    assertType<Equals<typeof extended.environmentType, {
      NAME: string;
      LOG_LEVEL: string;
      PORT: number;
      EXTRA: string;
      OPT?: string;
      FLAG?: boolean;
    }>>();
    assertType<Equals<typeof extended.requiredEnvironmentType, {
      NAME: string;
      PORT: string;
      EXTRA: string;
    }>>();
  });

  it('should type a single transform applied to required and optional keys', () => {
    const builder = EnvironmentBuilder.create('r').optionals('o').transform(s => s.length, 'r', 'o');
    assertType<Equals<typeof builder.environmentType, { r: number; o?: number }>>();
  });

  it('should reject invalid usage at compile time', () => {
    const builder = EnvironmentBuilder.create('a').optionals('o').transform(s => s === 'true', 'a');

    // @ts-expect-error - unknown key cannot be transformed
    builder.transform(s => s, 'unknown');

    // @ts-expect-error - defaults must match the transformed type
    builder.defaults({ a: 'not-a-boolean' });

    // @ts-expect-error - unknown key cannot be defaulted
    builder.defaults({ unknown: 'x' });

    // Never called - only type-checked, as the type fields do not exist at runtime
    const readRequired = (required: RequiredEnvironmentOf<typeof builder>) => {
      // @ts-expect-error - optional variables are not part of the required type
      return required.o;
    };

    expect(readRequired).toBeDefined();
  });

  it('should expose the same types through the helper types', () => {
    assertType<Equals<EnvironmentOf<typeof config>, typeof config.environmentType>>();
    assertType<Equals<InputEnvironmentOf<typeof config>, typeof config.inputEnvironmentType>>();
    assertType<Equals<RequiredEnvironmentOf<typeof config>, typeof config.requiredEnvironmentType>>();
  });

  it('should not emit the type-only fields at runtime', () => {
    expect(Object.keys(config)).not.toContain('environmentType');
    expect(Object.keys(config)).not.toContain('inputEnvironmentType');
    expect(Object.keys(config)).not.toContain('requiredEnvironmentType');
  });
});
