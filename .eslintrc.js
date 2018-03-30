/* @flow */

module.exports = {
    'extends': './node_modules/grumbler-scripts/config/.eslintrc.js',

    rules: {
        'import/no-dynamic-require': 'off',
        'no-restricted-globals': 'off',
        'promise/no-native': 'off',
        'import/no-nodejs-modules': 'off',
        'compat/compat': 'off',
        'no-process-env': 'off'
    }
};