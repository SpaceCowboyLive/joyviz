"use strict";

(function(svg) {

    this.svg = function(name, props, place) {
        var dom = document.createElementNS('http://www.w3.org/2000/svg', name);
        for (var i in props) {
            if (i != 'href') dom.setAttributeNS(null, i, props[i]);
            else dom.setAttributeNS('http://www.w3.org/1999/xlink', i, props[i]);
        }
        if (place) place.appendChild(dom);
        return dom;
    }
    
}).apply(joyviz.svg = joyviz.svg || {});