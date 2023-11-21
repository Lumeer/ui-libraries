import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

export default [
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.esm.js',
            format: 'esm',
        },
        plugins: [typescript({module: 'esnext'}), nodeResolve(), commonjs(), json({compact: true})],
    },
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.js',
            format: 'cjs',
        },
        plugins: [typescript({module: 'esnext'}), nodeResolve(), commonjs(), json({compact: true})],
    },
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.min.js',
            format: 'cjs',
            sourcemap: true,
        },
        plugins: [typescript({module: 'esnext'}), nodeResolve(), commonjs(), terser(), json({compact: true})],
    },
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.umd.js',
            format: 'umd',
            name: "Filter"
        },
        plugins: [typescript({module: 'esnext'}), nodeResolve(), commonjs(), json({compact: true})],
    },
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.umd.min.js',
            format: 'umd',
            name: "Filter",
            sourcemap: true,
        },
        plugins: [typescript({module: 'esnext'}), nodeResolve(), commonjs(), terser(), json({compact: true})],
    },
]
