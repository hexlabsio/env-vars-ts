import { JestConfigWithTsJest } from 'ts-jest';
import { defaultsESM as tsjPreset } from 'ts-jest/presets';


const config: JestConfigWithTsJest = {
    ...tsjPreset,
}

export default config;
