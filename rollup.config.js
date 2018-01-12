import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import uglify from 'rollup-plugin-uglify';
import * as pkg from './package.json';

const config = {
    input: `es/main.js`,
    output: {
        file: pkg.main,
        name: pkg.productName,
        format: 'umd',
        sourcemap: true,
        globals: {
            'ws': 'WebSocket'
        }
    },
    plugins: [
        nodeResolve(),
        builtins(),
        commonjs()
    ],
    external: [
        'ws',
        'debug',
        'shortid'
    ]
}

export default [
    config,
    {
        ...config,
        output: {
            ...config.output,
            file: pkg.main.replace('.js', '.min.js')
        },
        plugins: [
            ...config.plugins,
            uglify({
                compress: {
                    pure_getters: true,
                    unsafe: true,
                    unsafe_comps: true,
                    warnings: false
                }
            })
        ]
    }
]