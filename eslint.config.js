export default [
    {
        files: ['*.js', 'cli', 't/*.js', 'test/*.mjs'],
        linterOptions: { reportUnusedDisableDirectives: 'off' },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { console: 'readonly', process: 'readonly', URL: 'readonly', structuredClone: 'readonly' },
        },
        rules: { semi: ['error', 'always'] },
    },
    {
        files: ['gulpfile.js', 'webpack.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { __dirname: 'readonly', module: 'readonly', require: 'readonly' },
        },
    },
];
