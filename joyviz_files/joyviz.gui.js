"use strict";
(function(sd) {
    this.input_value = function(input, min, max) {
        if (input.classList.contains('small-input-tree')) {
            return parseFloat(input.getAttribute('value'));
        }
        if (input.classList.contains('small-input-mask')) {
            return parseFloat(input.getAttribute('value'));
        }
        if (input.getAttribute('data-pattern') == 'ip') {
            var parts = input.value.split('.');
            return (parseInt(parts[0]) << 24) + (parseInt(parts[1]) << 16) +
                (parseInt(parts[2]) << 8) + (parseInt(parts[3]));
        }
        if (input.type == "checkbox") return input.checked ? 1 : 0;
        if (input.type == "file") return input.files[0];
        if (input.type == "datetime-local") {
            var d = new Date(input.value);
            return d.getTime() + d.getTimezoneOffset() * 60 * 1000;
        }
        if (input.type != "number") return input.value;
        var f = parseFloat(input.value);
        if (isNaN(f)) f = 0;
        if (min != undefined && f < min) f = min;
        else if (max != undefined && f > max) f = max;
        return f;
    }

    this.make_table = function(dict) {
        var res = $t.element('div');
        var table = $t.element('table', { 'class': "ui-table" }, res);
        for (var i in dict) {
            var name = new String(i);
            if (name[0] == '-' && name[1] == '-') {
                name = name.substring(2);
                $t.element('hr', {}, res);
                table = $t.element('table', { 'class': "ui-table" }, res);
            }
            var tr = $t.element('tr', {}, table);
            $t.element('td', {}, tr).innerHTML = name;
            $t.inner(dict[i], $t.element('td', {}, tr));
        }
        return res;
    }

    this.make_list = function(container, val, list) {
        for (var i in list) {
            var e = list[i], ind = i, value = list[i];
            if (typeof e == 'object') { ind = e[0]; value = e[1]; }
            var o = $t.element('div', { 'class': 'small-list-item', value: ind }, container, value);
            if (ind == val) $t.raise(o, 'joyvizgui-item-selected', o, true, true);
            $t.bind(o, 'mouseup', function(ev) { 
                    $t.raise(this, 'joyvizgui-item-selected', this, true, true); });
        }
    }

    this.make_mask = function(container, val, list) {
        var selected = 0;
        $t.bind(container, 'joyvizgui-item-selected', function(ev) {
            ev.stopPropagation();
            var o = ev.detail;
            var s = o.getAttribute('data-selected') === '1';
            if (s) selected = selected ^ parseInt(o.getAttribute('value'));
            else selected = selected | parseInt(o.getAttribute('value'));
            $t.set(container, { value: selected });
            $t.set(o, { 'data-selected': s ? 0 : 1 });
        });
        for (var i in list) {
            var e = list[i], ind = i, value = list[i];
            if (typeof e == 'object') { ind = e[0]; value = e[1]; if (ind == 0) continue; }
            var o = $t.element('div', { 'class': 'small-list-item', value: ind }, container, value);
            if (ind & val) {
                o.initial = true;
                $t.raise(o, 'joyvizgui-item-selected', o, true, true);
            }
            $t.bind(o, 'mouseup', function(ev) { 
                    $t.raise(this, 'joyvizgui-item-selected', this, true, true); });
        }
    }

    this.make_tree = function(container, val, tree, expand) {
        function on_toggle(items) {
            var s = parseInt(this.parentNode.getAttribute('data-expanded'));
            if (s >= 2) return;
            if (s == -1) {
                var m;
                if (items != undefined) {
                    m = $t.element('div', { 'class': 'small-tree-items' });
                    this.parentNode.parentNode.insertBefore(m, this.parentNode.nextSibling);
                }
                if (Array.isArray(items)) {
                    fill_tree(items, m);
                }
                if (typeof items === 'function') {
                    $t.set(this.parentNode, { 'data-expanded': 3 });
                    var dd = this;
                    $t.bind(this, 'joyvizgui-item-update', function() {
                        var deferred = $t.deferred();
                        items(dd, deferred);
                        $t.empty(m);
                        deferred.promise().done(function(tree) { fill_tree(tree, m); });
                    });
                    $t.raise(this, 'joyvizgui-item-update', this, true, true);
                }
            }
            else if (s == 0) $t.set(this.parentNode, { 'data-expanded': 1 });
            else $t.set(this.parentNode, { 'data-expanded': 0 });
        }
        function fill_tree(tree, d) {
            if (d.previousSibling && d.previousSibling.setAttribute)
                $t.set(d.previousSibling, { 'data-expanded': tree ? 1 : 2 });
            for (var i in tree) {
                var e = tree[i], ind = e[0], value = e[1], items = e[2], onclick = e[3];
                var compl = typeof e[1] == 'object' && e[1].nodeName == undefined;
                if (compl) value = e[1].label;
                var c = $t.element('div', { 'class': 'small-tree-item' }, d);
                var exp = $t.element('div', { 'class': 'small-tree-item-exp' }, c);
                if (items === '-') $t.set(c, { 'data-expanded': 4 });
                else $t.set(c, { 'data-expanded': items ? -1: 2 });
                (function(items) {
                    $t.bind(exp, 'mousedown', function(ev) { on_toggle.call(this, items); });
                    if (expand) on_toggle.call(exp, items);
                })(items);
                var o = $t.element('div', { 'class': 'small-list-item', value: ind }, c, value);
                if (compl) {
                    var set = {};
                    for (var k in e[1]) set['data-' + k] = e[1][k];
                    $t.set(o, set);
                }
                if (ind == val) {
                    o.initial = true;
                    $t.raise(o, 'joyvizgui-item-selected', o, true, true);
                    was_set = true;
                }
                if (onclick) $t.bind(o, 'click', onclick);
                $t.bind(o, 'mouseup', function(ev) { $t.raise(this, 'joyvizgui-item-selected', this, true, true); });
            }
        }
        var selected = undefined;
        var was_set = false;
        $t.bind(container, 'joyvizgui-item-selected', function(ev) {
            ev.stopPropagation();
            var o = ev.detail;
            if (o.getAttribute('data-selectable') === '0') return;
            if (selected) $t.set(selected, { 'data-selected': 0 });
            $t.set(container, { value: o.getAttribute('value') });
            $t.set(o, { 'data-selected': 1 });
            selected = o;
        });
        fill_tree(tree, container);
        if (!was_set && val != undefined) {
            $t.raise(container, 'joyvizgui-item-text', '↻', true, true);
        }
    }

    var controller_factory = {
        'number': function(val) {
            var el = $t.element('input', { type: 'number', step: "any", 'class': 'small-input dialog-input' });
            el.value = val;
            return el;
        },
        'area': function(val) {
            var t = val.split('\n');
            var r = Math.max(t.length, 3), c = 30;
            for (var i in t) if (c < t[i].length) c = t[i].length;
            var el = $t.element('textarea', { rows: r, cols: c, 'class': 'small-input dialog-input' });
            el.value = val;
            return el;
        },
        'text': function(val) {
            var el = $t.element('input', { type: 'text', 'class': 'small-input dialog-input' });
            el.value = val;
            return el;
        },
        'password': function(val) {
            var el = $t.element('input', { type: 'password', 'class': 'small-input dialog-input' });
            el.value = val;
            return el;
        },
        'datetime': function(val) {
            var el = $t.element('input', { type: 'datetime-local', 'class': 'small-input dialog-input' });
            el.style.width = "16em";
            var d = new Date(val);
            d = new Date(d - d.getTimezoneOffset() * 60 * 1000);
            el.value = d.toISOString().split('Z')[0];
            return el;
        },
        'ipv4': function(val) {
            var el = $t.element('input', { type: 'text', 'data-pattern': 'ip',
                    pattern: '((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)',
                    'class': 'small-input dialog-input' });
            var ip = parseInt(val);
            el.value = '' + ((ip >> 24) & 0xFF) + '.' + ((ip >> 16) & 0xFF) +
                '.' + ((ip >> 8) & 0xFF) + '.' + (ip & 0xFF);
            return el;
        },
        'color': function(val) {
            var el = $t.element('input', { type: 'color', 'class': 'small-input dialog-input' });
            el.value = val;
            return el;
        },
        'bool': function(val) {
            var el = $t.element('input', { type: 'checkbox', 'class': 'small-input-checkbox dialog-input' });
            el.checked = val ? 1 : 0;
            return el;
        },
        'list': function(val, list) {
            var dd = $t.gui.dropdown();
            $t.gui.make_list(dd.d, val, list);
            return dd.div;
        },
        'mask': function(val, list) {
            var el = $t.element('div', { 'class': 'dialog-input small-input-mask', value: val });
            $t.gui.make_mask(el, val, list);
            return el;
        },
        'tree': function(val, tree) {
            var dd = $t.gui.dropdown();
            $t.gui.make_tree(dd.d, val, tree);
            $t.set(dd.el, { value: val });
            return dd.div;
        },
        'file': function(name) {
            var el = $t.element('input', { type: 'file', name: name, 'class': 'small-input dialog-input' });
            return el;
        }
    };

    function controll_apply_conditions(cs, i, conditions) {
        for (var c in conditions) {
            (function(el, tar, cond) {
                $t.bind(el, ['change'], function() {
                    tar.parentNode.parentNode.style['display'] =
                        $t.gui.input_value(el) == cond ? 'table-row' : 'none';
                });
                tar.parentNode.parentNode.style['display'] =
                    $t.gui.input_value(el) == cond ? 'table-row' : 'none';
            })(cs[c], cs[i], conditions[c]);
        }
    }

    this.make_input = function(type, val, params, ro) {
        var f = controller_factory[type];
        var el = f ? f(val, params) : '';
        if (ro) {
            $t.set(el, { 'data-back': 'ro' });
            $t.set(el, { 'disabled': '1' });
        }
        return el;
    }

    this.make_table_inputs = function(dict) {
        var dd = {};
        var cons = {};
        var ii = 0;
        for (var i in dict) {
            var label = i, type = 'number', list, conditions = {};
            if (i[0] == '(') {
                var cb = i.indexOf(')');
                type = i.substring(1, cb);
                label = i.substring(cb + 1);
                var sb = type.indexOf(':');
                if (sb != -1) {
                    list = type.substring(sb + 1).split(';');
                    type = type.substring(0, sb);
                }
                while (label[0] == ' ') label = label.substring(1);
            }
            if (label[0] == '[') {
                var cb = label.indexOf(']');
                var cc = label.substring(1, cb).split(';');
                for (var c in cc) {
                    var m = cc[c].split(':');
                    conditions[m[0]] = m[1];
                }
                cons[ii] = conditions;
                label = label.substring(cb + 1);
                while (label[0] == ' ') label = label.substring(1);
            }
            var ll = label.split('|'), name;
            if (ll.length == 2) { label = ll[0]; name = ll[1]; }
            else { name = label; }
            if (type[0] == '[') {
                var types = type.substring(1, type.length - 1);
                types = types.split(',');
                var rs = $t.element('span', {});
                for (var l in types) {
                    type = types[l];
                    var f = controller_factory[type];
                    var el = f ? f(dict[i][l], list) : '';
                    rs.appendChild(el);
                    if (el != '') $t.set(el, { name: name + "|" + ii });
                }
                dd[label + (f ? ':' : '')] = rs;
                ++ii;
            }
            else {
                var f = controller_factory[type];
                var el = f ? f(dict[i], list) : '';
                if (el != '') $t.set(el, { name: name + "|" + ii });
                dd[label + (f ? ':' : '')] = el;
                ++ii;
            }
        }
        var table = $t.gui.make_table(dd);
        var cs = table.getElementsByClassName('dialog-input');
        for (var i in cons) controll_apply_conditions(cs, i, cons[i]);
        return table;
    }

    this.button_group = function(sel, index) {
        function hnd() {
            for (var j = 0; j < buttons.length; ++j) {
                $t.set(buttons[j], { state: '' });
            }
            $t.set(this, { state: 'active' });
        }
        var buttons = sel.children;
        if (index < 0) index = buttons.length + index;
        for (var i = 0; i < buttons.length; ++i) {
            $t.unbind(buttons[i], ['click'], hnd);
            $t.bind(buttons[i], ['click'], hnd);
        }
        for (var i = 0; i < buttons.length; ++i) {
            if (i === index) $t.raise(buttons[i], 'click');
        }
    }

    this.button_group_compact = function(sel, index) {
        $t.gui.button_group(sel, index);
        var buttons = sel.children;
        buttons[0].style = 'margin-right: 0px; border-top-right-radius: 0px; border-bottom-right-radius: 0px; border-right: none';
        for (var i = 1; i < buttons.length - 1; ++i) {
            buttons[i].style = 'margin-right: 0px; border-radius: 0px; border-right: none'
        }
        buttons[buttons.length - 1].style = 'border-top-left-radius: 0px; border-bottom-left-radius: 0px'
    }

    this.checkbox = function(c) {
        var ce = $t.element('span', {});
        ce.innerHTML = '&#9744; ';
        c.insertBefore(ce, c.firstChild);
        $t.bind(c, ['click'], function() {
            if (this.getAttribute('state') == 'active') {
                $t.set(this, { state: '' });
                this.firstChild.innerHTML = '&#9744; ';
            }
            else {
                $t.set(this, { state: 'active' });
                this.firstChild.innerHTML = '&#9745; ';
            }
        });
    }

    this.dropdown = function(pardiv) {
        var div = $t.element('div', { 'class': 'small-input-tree' });
        var el = $t.element('span', { 'class': 'small-input-tree dialog-input' }, div);
        var d = $t.element('div', { 'class': 'small-input-dropdown' }, pardiv ? pardiv : div);
        var visible = false;
        var selected = undefined;
        var hideout = function(ev) {
            if (!visible) return;
            d.style.display = "none";
            visible = false;
            $t.unbind(document.body, 'mousedown', hideout);
        }
        $t.bind(d, 'mousedown', function(ev) { ev.stopPropagation(); });
        $t.bind(el, 'mousedown', function(ev) {
            if (el.parentNode.getAttribute('disabled')) return;
            if (visible == false) {
                d.style.display = "inline-block";
                var box = el.getBoundingClientRect();
                var dbox = d.getBoundingClientRect();
                if (!d.style.width) d.style.width = box.width + 'px';
                $t.bind(document.body, 'mousedown', hideout);
                requestAnimationFrame(function() { visible = true; });
            }
            else hideout();
        });
        $t.bind(d, 'joyvizgui-item-selected', function(ev) {
            ev.stopPropagation();
            var o = ev.detail;
            if (o.getAttribute('data-selectable') === '0') return;
            if (selected) $t.set(selected, { 'data-selected': 0 });
            $t.set(el, { value: o.getAttribute('value') });
            $t.set(o, { 'data-selected': 1 });
            el.innerHTML = o.innerHTML;
            selected = o;
            if (o.initial) o.initial = false;
            else hideout();
            $t.raise_event(el, 'change');
        });
        $t.bind(d, 'joyvizgui-item-text', function(ev) {
            ev.stopPropagation();
            el.innerHTML = ev.detail;
        });
        $t.bind(div, 'joyvizgui-item-text', function(ev) {
            ev.stopPropagation();
            el.innerHTML = ev.detail;
        });

        return { div: div, d: d, el: el };
    }

    this.dialog = function() {
        var d = $t.element('div', { 'class': 'ui-inner' }, 
                $t.element('div', { 'class': 'ui-middle' }, 
                    $t.element('div', { 'class': 'ui-outer' }, document.body)));
        return d;
    }

    this.dialog_remove = function(d) {
        $t.remove(d.parentNode.parentNode);
    }

    this.dialog_buttons = function(title, buttons, noxbutton) {
        var d = $t.gui.dialog();
        if (!noxbutton) {
            var cb = $t.element('button', { 'class': 'dialog-close-button' });
            var img = $t.svg.svg('svg', { version: '1.1', viewBox: '0 0 10 10', width: 16, height: 16 }, cb);
            $t.svg.svg('line', { x1: 0, y1: 0, x2: 10, y2: 10 }, img);
            $t.svg.svg('line', { x1: 0, y1: 10, x2: 10, y2: 0 }, img);
            d.appendChild(cb);
            var keys = Object.keys(buttons);
            $t.bind(cb, ['click'], function() { buttons[keys[keys.length - 1]].call(this, [d, b]); });
        }

        $t.set(d, { tabindex: 0 });
        d.style['text-align'] = 'left';
        d.style['outline'] = '0px';
        $t.bind(d, 'keydown', function(ev) {
            if (ev.keyCode == 27) $t.gui.dialog_remove(d);
        });
        if (title) {
            $t.inner(title, $t.element('b', {}, d));
            $t.element('br', {}, d);
        }
        var b = $t.element('div', { style: 'margin-top: 10px; margin-bottom: 10px;' }, d);
        $t.element('br', {}, d);
        var btns = $t.element('div', { 'class': 'dialog-button-pane' }, d);
        for (var i in buttons) {
            if (i != 'X')
                (function(i, callback) {
                    var bb = $t.element('button', { 'class': 'small-text-button' }, btns);
                    $t.bind($t.inner(i, bb), ['click'], function() { callback.call(this, [d, b]); })
                })(i, buttons[i]);
        }
        return [d, b];
    }

    this.message = function(text) {
        var d = $t.gui.dialog_buttons(undefined, {
            'OK': function(d) {
                $t.gui.dialog_remove(d[0]);
            }
        });
        $t.clas(d[0], null, "ui-messagebox");
        $t.clas(d[1], null, "ui-message-div");
        var t = text;
        if (text.nodeName == undefined) {
            t = $t.element('span', {});
            t.innerHTML = text;
        }
        $t.inner(t, d[1]);
        return d;
    }

    this.message_ask = function(text, buttext, callback) {
        var bb = {
            'Отмена': function(d) { $t.gui.dialog_remove(d[0]); }
        };
        bb[buttext] = function(d) { $t.gui.dialog_remove(d[0]); callback(); };
        bb['X'] = function(d) { $t.gui.dialog_remove(d[0]); };
        var d = $t.gui.dialog_buttons(undefined, bb);
        $t.clas(d[0], null, "ui-messagebox");
        $t.clas(d[1], null, "ui-message-div");
        var t = text;
        if (text.nodeName == undefined) {
            t = $t.element('span', {});
            t.innerHTML = text;
        }
        $t.inner(t, d[1]);
        return d;
    }

    this.position_by_mouse = function(menu, ev) {
        var box = menu.getBoundingClientRect();
        menu.style.left = ev.clientX + 'px';
        if (box.width + ev.clientX + 30 > window.innerWidth)
            menu.style.left = ev.clientX - box.width + 'px';
        menu.style.top = ev.clientY + 'px';
        if (box.height + ev.clientY + 30 > window.innerHeight)
            menu.style.top = ev.clientY - box.height + 'px';
    }

    this.folder = function(caption, content, place, opened) {
        var div = $t.element('div', {}, place);
        var c = $t.element('div', { style: 'background: lightgray;' }, div);
        var b = $t.element('button', { style: 'padding: 2px; background: none; border: none; text-align: left' }, c);
        var ar = $t.element('b', { style: 'margin-right: 4px' }, b, opened ? '▼' : '►');
        $t.element('b', {}, b, caption);
        var n = $t.element('div', { style: 'padding: 4px' }, div, content);
        function update() {
            ar.innerHTML = opened ? '▼' : '►';
            n.style.display = opened ? 'block' : 'none';
        }
        $t.bind(b, ['click'], function() {
            opened = !opened;
            update();
        });
        update();
        return [div, n];
    }

}).apply(joyviz.gui = joyviz.gui || {});