module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-webpack');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.initConfig({
        'webpack': {
            'dist': require('./webpack.config')
        },
        'uglify': {
            'dist': {
                'src': 'dist/ratatoskr.js',
                'dest': 'dist/ratatoskr.min.js'
            }
        }
    });

    grunt.registerTask('dist', ['webpack:dist', 'uglify:dist']);
    grunt.registerTask('default', ['dist']);
};
