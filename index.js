
var _ = require('lodash');
var request = require('superagent');
var r;

var utils = {

    preloadImages: function(urls) {
        _.each(urls, function(url) {
            utils.preloadImage(url);
        });
    },

    preloadImage: function(url) {
        var img=new Image();
        img.src=url;
    },
    randomColor: function() {
        return '#'+Math.floor(Math.random()*16777215).toString(16);
    },

    getThumbnail: function(image) {
        return image + '_small';
    },

    mapRange: function(value, istart, istop, ostart, ostop) {
        return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
    },

    getColors: function(n) {
        var colors = ['#A38EF3', '#7AB2EA', '#57C6B9', '#E96684', '#F0E86B', '#626c7c', '#F9A75F', '#F1B6BD', '#8C564B', '#006400'];

        var retColors = [];
        for(var i = 0; i<n; i++) {
            retColors.push(colors[ i % colors.length]);
        }

        return retColors;
    },


    isEditorOrPreview: function() {
        var url = document.URL;
        return /https?:\/\/[^\/]+\/visualization-types\/*/.test(url);
    },


    fetchData: function(viz, keys, cb) {


        if(this.isEditorOrPreview()) {

            setTimeout(function() {
                var data = $('#data-editor').next('.CodeMirror').find('.CodeMirror-code span')[0].innerHTML;
                var fetchedData = JSON.parse(data);

                _.each(keys, function(key) {
                    fetchedData = fetchedData[key];
                });

                cb(null, fetchedData);

            }, 0);


        } else {

            var url = viz.$el.parent().find('.permalink').find('a').attr('href');

            if(r) {
                r.abort();
            }

            r = request.get(url + '/data/' + keys.join('/'), function(err, res) {

                if(err) {
                    return cb(err)
                }

                cb(null, (res.body || {}).data);
            });
        }
    }


};


module.exports = utils;