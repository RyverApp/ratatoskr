module.exports = function(grunt) {
    grunt.loadNpmTasks('dts-generator');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-webpack');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.initConfig({
        'webpack': {
            'build': require('./webpack.config')(grunt)
        },
        'uglify': {
            'build': {
                'src': 'dist/ratatoskr.js',
                'dest': 'dist/ratatoskr.min.js'
            }
        }
    });

    grunt.registerTask('build', ['webpack:build', 'uglify:build']);
    grunt.registerTask('default', ['build']);
};
