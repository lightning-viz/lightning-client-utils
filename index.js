
var _ = require('lodash');

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
        var colors = ['#A38EF3', '#7AB2EA', '#57C6B9', '#E96684'];

        var retColors = [];
        for(var i = 0; i<n; i++) {
            retColors.push(colors[ i % colors.length]);
        }

        return retColors;
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
    }


};


module.exports = utils;