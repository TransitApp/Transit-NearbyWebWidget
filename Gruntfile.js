module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    dot: {
      dist: {
        src  : ['public/js/widget/*.dot'],
        dest : 'public/js/widget/tmpl.js'
      }
    },

    uglify: {
      js: {
        files: {
          'public/js/widget_all.min.js': [
            'public/js/jquery-1.11.1.min.js',
            'public/js/widget/tmpl.js',
            'public/js/widget/script.js'
          ]
        }
      }
    },

    cssmin: {
      combine: {
        files: {
          'public/css/widget.min.css': [
            'public/css/widget.css'
          ]
        }
      }
    },

    watch: {
      gruntfile: {
        files: 'Gruntfile.js',
        tasks: ['default']
      },
      scripts: {
        files: ['public/js/widget/*', '!public/js/widget/tmpl.js'],
        tasks: ['dot', 'uglify'],
        options: {
          spawn: false,
        }
      },
      css: {
        files: ['public/css/*.css', '!public/css/widget.min.css'],
        tasks: ['cssmin'],
        options: {
          spawn: false,
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-dot-compiler');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['dot', 'uglify', 'cssmin']);

};
