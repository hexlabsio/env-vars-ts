import Environment, {Config} from "./environment";

describe('Environment', () => {
  
  function mockConfig<E>():Partial<Config<E>> {
    return { onError: jest.fn(), log: jest.fn() };
  }
  
  it('should pull only typed vars from environment passed in', () => {
    const {environment} = Environment.from<{a: string, c?: string}>({a: 'abc', b: '123', c: 'def'}, {
      requiredDefaults: { a: undefined },
      optionalDefaults: { c: undefined }
    });
    expect(Object.keys(environment)).toEqual(['c', 'a']);
    expect(environment).toEqual({a: 'abc', c: 'def'})
  });
  
  it('should pull only typed vars from process environment', () => {
    process.env = {a: 'abc', b: '123', c: 'def'}
    const {environment} = Environment.fromProcess<{a: string, c?: string}>( {
      requiredDefaults: { a: undefined },
      optionalDefaults: { c: undefined }
    });
    expect(Object.keys(environment)).toEqual(['c', 'a']);
    expect(environment).toEqual({a: 'abc', c: 'def'})
  });
  
  it('should default vars that are not present', () => {
    const {environment} = Environment.from<{a: string, b?: string}>({}, {
      requiredDefaults: { a: 'a' },
      optionalDefaults: { b: 'b'}
    });
    expect(environment).toEqual({a: 'a', b: 'b'})
  });
  
  it('should succeed when optional var no present and no default', () => {
    const {environment} = Environment.from<{b?: string}>({}, {
      optionalDefaults: { b: undefined }
    });
    expect(Object.keys(environment)).toEqual(['b']);
    expect(environment).toEqual({b: undefined});
  });
  
  describe('Printing', () => {
    it('should print all envs with mapped secrets', () => {
      type Envs = {a: string, b?: string, c?: string};
      const config = mockConfig<Envs>();
      const environment = Environment.from<Envs>({ a: 'abc', b: 'def' }, {
        requiredDefaults: { a: undefined },
        optionalDefaults: { b: undefined, c: undefined }
      }, {...config, secrets: ['b', 'c']});
      environment.printEnvironment();
      expect(config.log).toHaveBeenCalledWith('{\n' +
        '  "b": "SECRET xxx",\n' +
        '  "c": "SECRET ",\n' +
        '  "a": "abc"\n' +
        '}');
    });
  
    it('should print nulls when undefined', () => {
      console.debug = jest.fn();
      const environment = Environment.from<{a: string, b?: string}>({ a: 'abc' }, {
        requiredDefaults: { a: undefined },
        optionalDefaults: { b: undefined }
      });
      environment.printEnvironment();
      expect(console.debug).toHaveBeenCalledWith('{\n' +
        '  "b": null,\n' +
        '  "a": "abc"\n' +
        '}');
      jest.clearAllMocks();
      environment.printEnvironment(); //verifies that cache works
      expect(console.debug).toHaveBeenCalledWith('{\n' +
        '  "b": null,\n' +
        '  "a": "abc"\n' +
        '}');
    });
  
    it('should print after calling custom conversion function', () => {
      type Envs = {a: string};
      const config = mockConfig<Envs>();
      const environment = Environment.from<Envs>({ a: 'abc'}, {
        requiredDefaults: { a: undefined }
      }, config);
      environment.printEnvironment((env) => {
        expect(env).toEqual({a: 'abc'})
        return 'something else'
      });
      expect(config.log).toHaveBeenCalledWith('something else');
    });
    
    it('should invoke secret mapper for each secret', () => {
      type Envs = {a: string, b?: string, c: string};
      const config = { ...mockConfig<Envs>(), secretMapper: jest.fn().mockImplementation((key, value) => Buffer.alloc(value.length, value).toString('base64')) };
      const environment = Environment.from<Envs>({ a: 'abc', b: 'def', c: 'ghi' }, {
        requiredDefaults: { a: undefined, c: undefined },
        optionalDefaults: { b: undefined }
      }, {...config, secrets: ['b', 'c']});
      environment.printEnvironment();
      expect(config.secretMapper).toHaveBeenCalledTimes(2);
      expect(config.secretMapper.mock.calls).toEqual([['b', 'def'], ['c', 'ghi']])
      expect(config.log).toHaveBeenCalledWith('{\n' +
        '  "b": "ZGVm",\n' +
        '  "a": "abc",\n' +
        '  "c": "Z2hp"\n' +
        '}');
    });
  });
  
  describe('Getting and Translating Envs', () => {
    it('should get string envs', () => {
      const environment = Environment.from<{a: string, c?: string}>({a: 'abc', b: '123'}, {
        requiredDefaults: { a: undefined },
        optionalDefaults: { c: undefined }
      });
      expect(environment.get('a')).toEqual('abc');
      expect(environment.get('c')).toBeUndefined();
    });
  
    it('should get boolean env', () => {
      const environment = Environment.from<{a: string, c?: string, d?: string}>({a: 'true', b: '123'}, {
        requiredDefaults: { a: undefined },
        optionalDefaults: { c: undefined, d: 'not a boolean' }
      });
      expect(environment.getBoolean('a')).toEqual(true);
      expect(environment.getBoolean('c')).toBeUndefined();
      expect(environment.getBoolean('d')).toEqual(false);
    });
  
    it('should get number env', () => {
      const environment = Environment.from<{a: string, c?: string, d?: string}>({a: '1e6'}, {
        requiredDefaults: { a: undefined },
        optionalDefaults: { c: '98.2', d: 'not a number' }
      });
      expect(environment.getNumber('a')).toEqual(1e6);
      expect(environment.getNumber('c')).toEqual(98.2);
      expect(environment.getNumber('d')).toEqual(NaN);
    });
    
    it('should get object env', () => {
      type Envs = {a: string, b: string};
      const config = mockConfig<Envs>();
      const environment = Environment.from<Envs>({a: JSON.stringify({x:10})}, {
        requiredDefaults: { a: undefined, b: 'not an object' },
      }, config);
      expect(environment.getJson('a').as<{x: number}>()).toEqual({x:10});
      environment.getJson('b').as<{x: number}>();
      expect(config.onError).toHaveBeenCalledWith(expect.anything(), ['b']);
    });
  });
  
  describe('Error Scenarios', () => {
    it('should invoke onError when required var not present and no default', () => {
      type Envs = {a: string};
      const config = mockConfig<Envs>();
      Environment.from<Envs>({b: '123'}, {
        requiredDefaults: { a: undefined }
      }, config)
      expect(config.onError).toHaveBeenCalledWith(expect.anything(), ["a"], {"a": undefined})
    });
    it('should throw err by default when required var not present', () => {
      expect(() => Environment.from<{a: string}>({b: '123'}, {
        requiredDefaults: { a: undefined }
      })).toThrowError("The following environment variables are required but not set [\"a\"]");
    });
  })
  
});
