module.exports = function(grunt) {
    grunt.loadNpmTasks('dts-generator');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-webpack');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.initConfig({
        'dtsGenerator': {
            options: {
                name: 'ratatoskr',
                main: 'ratatoskr/main',
                baseDir: 'src',
                out: 'ratatoskr.d.ts',
            },
            default: {
                src: [ 'src/main.ts' ]
            }
        },
        'webpack': {
            'build': require('./webpack.config')
        },
        'uglify': {
            'build': {
                'src': 'dist/ratatoskr.js',
                'dest': 'dist/ratatoskr.min.js'
            }
        }
    });

    grunt.registerTask('build', ['webpack:build', 'uglify:build']);
};
