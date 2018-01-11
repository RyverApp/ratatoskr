import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import builtins from 'rollup-plugin-node-builtins';
import * as pkg from './package.json';

export default {
    input: `src/main.ts`,
    output: [{ 
        file: pkg.main, 
        name: pkg.productName,
        format: 'umd',
        sourcemap: true,
        globals: {
            'ws': 'WebSocket'
        } 
    }, {
        file: pkg.module,
        format: 'es',
        sourcemap: true
    }],
    plugins: [
        resolve(),                        
        commonjs({
            include: 'node_modules/**',
        }),
        builtins(),
        typescript({ useTsconfigDeclarationDir: true }),    
    ],
    external: [
        'ws',
        'debug',
        'shortid'
    ]    
}
