import { EnvironmentBuilder } from '../src/environment';

describe('Environment', () => {

  it('should pull only typed vars from environment passed in', () => {
    const environment = EnvironmentBuilder.create('a').optionals('c').environment({a: 'abc', b: '123', c: 'def'});
    expect(Object.keys(environment)).toEqual(['c', 'a']);
    expect(environment).toEqual({a: 'abc', c: 'def'})
  });

  it('should accept only required variables', () => {
    const environment = EnvironmentBuilder.create('a').environment({a: 'abc', b: '123', c: 'def'});
    expect(Object.keys(environment)).toEqual(['a']);
    expect(environment).toEqual({a: 'abc'})
  });

  it('should pull only typed vars from process environment', () => {
    process.env = {a: 'abc', b: '123', c: 'def'}
    const environment = EnvironmentBuilder.create('a').optionals('c').environment();
    expect(Object.keys(environment)).toEqual(['c', 'a']);
    expect(environment).toEqual({a: 'abc', c: 'def'})
  });

  it('should default vars that are not present', () => {
    const environment = EnvironmentBuilder.create('a').optionals('c').defaults({a: 'a'}).environment({});
    expect(environment).toEqual({a: 'a'})
  });

  describe('Getting and Translating Envs', () => {

    it('should get boolean env', () => {
      const environment = EnvironmentBuilder.create('a').optionals('c', 'd')
        .transform(s => s === 'true', 'a').environment({a: 'true', b: '123'});
      expect(environment).toEqual({a: true});
    });

    it('should allow setting of transformed type as default', () => {
      const environment = EnvironmentBuilder.create('a').optionals('c', 'd')
        .transform(s => s === 'true', 'a')
        .defaults({ a: false })
        .environment({ d: '123'});
      expect(environment).toEqual({a: false, d: '123'});
    });

    describe('Error Scenarios', () => {
      it('should throw err  when required var not present', () => {
        expect(() => EnvironmentBuilder.create('a').environment({b: '123'}))
          .toThrowError("The following environment variables are required but not set [\"a\"]");
      });
    });

  });

  it('should allow setting of transformed type as default', () => {
    const builder = EnvironmentBuilder.create('a').optionals('c', 'd')
      .transform(s => s === 'true', 'a')
      .defaults({ a: true })
    expect(builder.environment({ d: '123'})).toEqual({a: true, d: '123'});
    expect(builder.environment({ d: '123', a: 'xyz'})).toEqual({a: false, d: '123'});
    expect(builder.environment({ d: '123', a: 'true'})).toEqual({a: true, d: '123'});
  });
})
