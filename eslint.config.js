module.exports = [
    {
        files: ['*.js'],
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                __dirname: 'readonly',
                console: 'readonly',
                module: 'readonly',
                process: 'readonly',
                require: 'readonly',
            },
        },
        rules: {
            semi: ['error', 'always'],
            'no-console': 'off',
            'no-extend-native': 'off',
            'no-prototype-builtins': 'off',
        },
    },
    {
        files: ['index.js'],
        languageOptions: {
            sourceType: 'module',
        },
    },
];
