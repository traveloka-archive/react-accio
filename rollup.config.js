import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default [
  {
    input: 'src/index.js',
    external: [
      'hoist-non-react-statics',
      'react',
      'babel-runtime/regenerator',
    ],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [
      // flow(),
      babel({
        plugins: ['external-helpers'],
        exclude: ['node_modules/**'],
      }),
    ],
  },
];
