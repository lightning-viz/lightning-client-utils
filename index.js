
var _ = require('lodash');
var request = require('superagent');
var d3 = require('d3');
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

    getColorFromData: function(data) {

        // retrieve an array of colors from 'label' or 'color' fields of object data
        // returns an list of lists in the form [[r,g,b],[r,g,b]...]

        if(data.hasOwnProperty('label')) {

            // get bounds and number of labels
            label = data.label
            var mn = d3.min(label, function(d) {return d; });
            var mx = d3.max(label, function(d) {return d; });
            var n = mx - mn + 1
            var colors = getColors(n)

            // get an array of d3 colors
            retColor = label.map(function(d) {return d3.rgb(colors[d - mn])});

        } else if (data.hasOwnProperty('color')) {

            // get an array of d3 colors directly from r,g,b values
            color = data.color
            retColor = color.map(function(d) {return d3.rgb(d[0], d[1], d[2])})

        } else {

            // otherwise return empty
            retColor = []
        }

        return retColor
    },

    var getPropertyFromData = function(data, name) {

        // retrieve property with the given name from a data object
        // if non existing, return empty array

        if (data.hasOwnProperty(name)) {
            ret = data[name]
        } else {
            ret = []
        }
        return ret
    },

    trackTransforms: function(ctx){

        var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
        var xform = svg.createSVGMatrix();

        ctx.getTransform = function(){ return xform; };
        
        var savedTransforms = [];
        var save = ctx.save;
        ctx.save = function(){
            savedTransforms.push(xform.translate(0,0));
            return save.call(ctx);
        };
        var restore = ctx.restore;
        ctx.restore = function(){
            xform = savedTransforms.pop();
            return restore.call(ctx);
        };

        var scale = ctx.scale;
        ctx.scale = function(sx,sy){            
            var oldXForm = xform;
            xform = xform.scaleNonUniform(sx,sy);
            if(xform.d < 1) {
                xform = oldXForm;
                return;
            }

            return scale.call(ctx,sx,sy);
        };
        
        var rotate = ctx.rotate;
        ctx.rotate = function(radians){
            xform = xform.rotate(radians*180/Math.PI);
            return rotate.call(ctx,radians);
        };
        
        var translate = ctx.translate;
        ctx.translate = function(dx,dy){
            xform = xform.translate(dx,dy);
            return translate.call(ctx,dx,dy);
        };
        
        var transform = ctx.transform;
        ctx.transform = function(a,b,c,d,e,f){
            var m2 = svg.createSVGMatrix();
            m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
            xform = xform.multiply(m2);
            return transform.call(ctx,a,b,c,d,e,f);
        };

        var setTransform = ctx.setTransform;
        ctx.setTransform = function(a,b,c,d,e,f){
            xform.a = a;
            xform.b = b;
            xform.c = c;
            xform.d = d;
            xform.e = e;
            xform.f = f;
            return setTransform.call(ctx,a,b,c,d,e,f);
        };
        var pt  = svg.createSVGPoint();
        ctx.transformedPoint = function(x,y) {
            pt.x=x; pt.y=y;
            return pt.matrixTransform(xform.inverse());
        };
    },

    addCanvasZoomPanListeners: function(canvas, context, redraw) {
            
        var lastX= canvas.width / 2;
        var lastY = canvas.height / 2;
        var dragStart, dragged;

        canvas.addEventListener('mousedown',function(evt){
            lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
            lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
            dragStart = context.transformedPoint(lastX,lastY);
            dragged = false;
        }, false);

        canvas.addEventListener('mousemove',function(evt){
            lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
            lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
            dragged = true;
            if (dragStart){
                var pt = context.transformedPoint(lastX,lastY);
                context.translate(pt.x-dragStart.x,pt.y-dragStart.y);
                redraw();
            }
        },false);
        canvas.addEventListener('mouseup',function(evt){
            dragStart = null;
            if (!dragged) zoom(evt.shiftKey ? -1 : 1 );
        },false);

        var scaleFactor = 1.025;
        var zoom = function(clicks){
            var pt = context.transformedPoint(lastX,lastY);
            context.translate(pt.x, pt.y);
            var factor = Math.pow(scaleFactor,clicks);
            context.scale(factor,factor);
            context.translate(-pt.x, -pt.y);
            redraw();
        };

        var handleScroll = function(evt){
            var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
            if (delta) zoom(delta);
            return evt.preventDefault() && false;
        };
        canvas.addEventListener('DOMMouseScroll',handleScroll,false);
        canvas.addEventListener('mousewheel',handleScroll,false);

    },


    isEditorOrPreview: function() {
        var url = document.URL;
        return /https?:\/\/[^\/]+\/visualization-types\/*/.test(url);
    },

    getUrl: function(viz) {
        console.log(viz);
        return viz.$el.parent().find('.permalink').find('a').attr('href');
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

            var url = this.getUrl(viz);

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
    },

    getSettings: function(viz, cb) {

        if(this.isEditorOrPreview()) {
            setTimeout(function() {
                cb(null, {});
            }, 0);

            return;
        }

        var url = this.getUrl(viz);

        r = request.get(url + '/settings/', function(err, res) {

            if(err) {
                return cb(err)
            }

            cb(null, (res.body || {}).settings);
        });
    },

    updateSettings: function(viz, settings, cb) {

        if(this.isEditorOrPreview()) {
            setTimeout(function() {
                cb(null, settings);
            }, 0);

            return;
        }

        var url = this.getUrl(viz);

        r = request.post(url + '/settings/', settings, function(err, res) {

            if(err) {
                return cb(err)
            }

            cb(null, (res.body || {}).settings);
        });
    }

};


module.exports = utils;