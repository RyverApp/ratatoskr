module.exports = function(grunt) {
    grunt.loadNpmTasks('dts-generator');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-webpack');
    grunt.initConfig({
        'dtsGenerator': {
            options: {
                name: 'ratatoskr',
                main: 'ratatoskr/main',
                baseDir: 'src',
                out: 'ratatoskr.d.ts',
            },
            default: {
                src: [ './src/main.ts' ]
            }
        },
        'webpack': {
            'compile': require('./webpack.config')
        }
    });
};
