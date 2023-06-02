/*
Joystick Visualizer is an offline version based on the code of Anton Natarov (https://linkedin.com/in/antonnatarov/en)

Original application can be found here (https://tealyatinasite.appspot.com/joystick/)

Original documentation can be found here (https://web.archive.org/web/20220818185347/http://www.teall.info/2019/03/joystick-visualizer.html)
*/
"use strict";

var widgets = {};
var global_wid_counter = 0;

var global_border_tab = 25;
var global_border_pass = 10;
var global_widget_size = 130;
var global_widget_radius = 10;
var global_widget_pip_size = 10;
var global_widget_deep = global_border_tab + global_border_pass + global_widget_pip_size * 2;

var use_shadows = true;
var label_font_size = 100;
var button_font_size = 100;
var main_color = '#f08020';
var back_color = '#000000c0';
var shadow_color = '#000000e0';
var thick_stroke = 1.5;
var thin_stroke = 0.5;
var label_font = 'Euro Caps, Arial';
var fade_at_axis_center = true;
var fade_zone = 0.02;
var table_color = '#505050';
var chromakey_color = '#860418';

var global_run = false;
var dialog_active = false;
var mouse = undefined;
var mouse_move = false;
var initial_pos = undefined;
var movable_el = undefined;

var dd = 0.5;

var saved_presets = { series: {}, last: undefined };

function make_movable(el) {
    $t.bind(el, 'mousedown', function(ev) {
        if (global_run) return;
        mouse = { x: ev.clientX, y: ev.clientY };
        initial_pos = { x: parseInt(el.style.left.slice(0, -2)), y: parseInt(el.style.top.slice(0, -2)) };
        mouse_move = false;
        movable_el = el;
    });

    $t.bind(el, 'mouseup', function(ev) {
        mouse = undefined;
    });

    $t.bind(el, 'dblclick', function(ev) {
        if (global_run) return;
        show_widget_properties_dialog(widgets[el.getAttribute('id')]);
        ev.stopPropagation();
    });
}

function switch_global_run() {
    if (global_run) {
        $t.id('ctrlpanel').style.display = 'none';
        document.body.style['background-color'] = chromakey_color;
    }
    else {
        $t.id('ctrlpanel').style.display = 'block';
        document.body.style['background-color'] = table_color;
    }
}

function show_joysticks_dialog() {
    if (dialog_active) return;
    dialog_active = true;
    var d = $t.gui.dialog_buttons("Joysticks", {
        'OK': function(d) {
            dialog_active = false; $t.gui.dialog_remove(d[0]);
        },
        'X': function(d) { dialog_active = false; $t.gui.dialog_remove(d[0]); }
    });
    for (var i = 0; i < 4; ++i) {
        $t.element('b', {}, d[1], "Joystick " + (i + 1));
        $t.element('br', {}, d[1]);
        $t.element('div', { id: 'joyinfo' + i }, d[1], "");
        $t.element('br', {}, d[1]);
    }

    function update_joy(joy, el) {
        if (!dialog_active) return;
        if (!joy) {
            el.innerHTML = '<i>not plugged</i>';
            return;
        }
        var buttons = [];
        var bn = 0;
        for (var b in joy.buttons) {
            ++bn;
            if (joy.buttons[b].pressed)
                buttons.push('<span style="padding: 1px 4px; margin: 2px; background: black; color: white"><b>' + bn + '</b></span>');
            else
                buttons.push('<span style="padding: 1px 4px; margin: 2px"><b>' + bn + '</b></span>');
        }
        var axes = [];
        var an = 0;
        for (var a in joy.axes) {
            ++an;
            var val = joy.axes[a].toFixed(1);
            axes.push('<span style="padding: 1px 4px; margin: 2px"><b>' + an + '</b>: <span style="background: lightgray; padding: 2px; width: 35px; display: inline-block">' + val + '</span></span>');
        }
        var name = 'Name: <span style="padding: 8px 4px; margin: 2px">' + joy.id + '</span><div style="height: 4px"></div>';
        el.innerHTML = name + 'Buttons: ' + buttons.join('') + '<div style="height: 6px"></div>Axes: ' + axes.join('');
    }

    function update_info() {
        var joys = navigator.getGamepads();
        for (var i = 0; i < 4; ++i) {
            update_joy(joys[i], $t.id('joyinfo' + i));
        }
        if (dialog_active) requestAnimationFrame(update_info);
    }

    requestAnimationFrame(update_info);
}

function show_widget_properties_dialog(widget) {
    if (dialog_active) return;
    dialog_active = true;
    var d = $t.gui.dialog_buttons("Edit widget " + widget.widtype, {
        'Delete': function(d) { 
            del_widget(widget);
            $t.gui.dialog_remove(d[0]); dialog_active = false;
        },
        'Cancel': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
        'OK': function(d) {
            var ii = d[1].getElementsByClassName('dialog-input');
            var pr = edit_params[widget.widtype];
            var c = 0;
            for (var i in pr.params) {
                var param = pr.params[i];
                widget.params[param[1]] = $t.gui.input_value(ii[c++]);
            }
            for (var i in pr.axis) {
                var prs = pr.axis[i];
                if (prs[0] == 'axis') {
                    widget.params['link'][prs[1]] =
                        [$t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++])];
                    widget.params.diapason[prs[1]] = 
                        [$t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++]),
                        $t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++])];
                }
                if (prs[0] == 'axis_but') {
                    widget.params['link'][prs[1]] =
                        [$t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++])];
                    widget.params.diapason[prs[1]] = 
                        [$t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++]),
                        $t.gui.input_value(ii[c++])];
                }
                if (prs[0] == 'axis_hat') {
                    widget.params['link'][prs[1]] =
                        [$t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++])];
                }
                if (prs[0] == 'button') {
                    widget.params['but'] = 
                        [$t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++]), $t.gui.input_value(ii[c++])];
                }
            }
            $t.gui.dialog_remove(d[0]); dialog_active = false;
            rewrite_widget(widget, widget.params);
        },
        'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; }
    });
    var params = {};
    var pr = edit_params[widget.widtype];
    for (var i in pr.params) {
        var param = pr.params[i];
        params[param[0]] = widget.params[param[1]];
    }
    $t.inner($t.gui.make_table_inputs(params), d[1]);
    for (var i in pr.axis) {
        var prs = pr.axis[i];
        if (prs[0] == 'axis') {
            $t.inner($t.element('hr'), d[1]);
            $t.element('b', {}, d[1], 'Axis ' + prs[1].toUpperCase());
            var link = widget.params['link'];
            if (!link[prs[1]]) link[prs[1]] = [0, 0];
            var diapason = widget.params.diapason[prs[1]];
            var params = { '([number,number])Joystick and axis number': [link[prs[1]][0], link[prs[1]][1]],
                '([number,number])Axis diapason': [diapason[0], diapason[1]],
                '(bool)Invert': diapason[2], '(bool)Hide dashed line': diapason[3] };
            $t.inner($t.gui.make_table_inputs(params), d[1]);
        }
        if (prs[0] == 'axis_but') {
            $t.inner($t.element('hr'), d[1]);
            $t.element('b', {}, d[1], 'Axis ' + prs[1].toUpperCase());
            var link = widget.params['link'];
            if (!link[prs[1]]) link[prs[1]] = [0, 0];
            var diapason = widget.params.diapason[prs[1]];
            var params = { '([number,number])Joystick and axis number': [link[prs[1]][0], link[prs[1]][1]],
                '([number,number])Button activation diapason': [diapason[0], diapason[1]],
                '(bool)Invert': diapason[2] };
            $t.inner($t.gui.make_table_inputs(params), d[1]);
        }
        if (prs[0] == 'axis_hat') {
            $t.inner($t.element('hr'), d[1]);
            $t.element('b', {}, d[1], 'Axis ' + prs[1].toUpperCase());
            var link = widget.params['link'];
            if (!link[prs[1]]) link[prs[1]] = [0, 0];
            var params = { '([number,number])Joystick and axis number': [link[prs[1]][0], link[prs[1]][1]] };
            $t.inner($t.gui.make_table_inputs(params), d[1]);
        }
        if (prs[0] == 'button') {
            $t.inner($t.element('hr'), d[1]);
            $t.element('b', {}, d[1], 'Button');
            var but = widget.params['but'];
            if (!but) but = widget.params['but'] = [0, 0, 0];
            var params = { '([number,number])Joystick and button number': [but[0], but[1]], '(bool)Invert': but[2] };
            $t.inner($t.gui.make_table_inputs(params), d[1]);
        }
    }
}

function show_settings_dialog() {
    if (dialog_active) return;
    dialog_active = true;
    var d = $t.gui.dialog_buttons("Settings", {
        'Load default': function(d) {
            main_color = '#f08020';
            back_color = '#000000c0';
            shadow_color = '#000000e0';
            use_shadows = true;
            thick_stroke = 1.5;
            thin_stroke = 0.5;
            label_font = 'Euro Caps, Arial';
            label_font_size = 100;
            button_font_size = 100;
            global_widget_size = 130;
            fade_at_axis_center = true;
            fade_zone = 0.02;
            table_color = '#505050';
            chromakey_color = '#00ff00';
            global_widget_radius = 10;

            document.body.style['background-color'] = table_color;
            $t.gui.dialog_remove(d[0]); dialog_active = false;
            rewrite_all_widgets(widgets);
        },
        'Cancel': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
        'OK': function(d) {
            var ii = d[1].getElementsByClassName('dialog-input');
            var c = 0;
            main_color = $t.gui.input_value(ii[c++]);
            global_widget_radius = $t.gui.input_value(ii[c++], 0, 10);
            back_color = $t.gui.input_value(ii[c++]) + $t.gui.input_value(ii[c++], 0, 255).toString(16);
            use_shadows = $t.gui.input_value(ii[c++]);
            shadow_color = $t.gui.input_value(ii[c++]) + $t.gui.input_value(ii[c++], 0, 255).toString(16);
            thick_stroke = $t.gui.input_value(ii[c++], 0, 40);
            thin_stroke = $t.gui.input_value(ii[c++], 0, 40);
            label_font = $t.gui.input_value(ii[c++]);
            label_font_size = $t.gui.input_value(ii[c++], 10, 300);
            button_font_size = $t.gui.input_value(ii[c++], 10, 300);
            global_widget_size = Math.round($t.gui.input_value(ii[c++], 30, 500) / 10) * 10;
            fade_at_axis_center = $t.gui.input_value(ii[c++]);
            fade_zone = $t.gui.input_value(ii[c++], 0, 100) / 100.0;
            table_color = $t.gui.input_value(ii[c++]);
            chromakey_color = $t.gui.input_value(ii[c++]);

            document.body.style['background-color'] = table_color;
            $t.gui.dialog_remove(d[0]); dialog_active = false;
            rewrite_all_widgets(widgets);
        },
        'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; }
    });
    var params = {
        '(color)Outline color': main_color,
        '(number)Border radius': global_widget_radius,
        '(color)Fill color': back_color.slice(0, -2),
        '(number)Fill opacity (0-255)': parseInt(back_color.slice(-2), 16),
        '(bool)Use shadows': use_shadows,
        '(color)Shadow color': shadow_color.slice(0, -2),
        '(number)Shadow opacity (0-255)': parseInt(shadow_color.slice(-2), 16),
        '(number)Outline thickness, <i>px</i>': thick_stroke,
        '(number)Dashed line thickness, <i>px</i>': thin_stroke,
        '(text)Font family': label_font,
        '(number)Axis font size, %': label_font_size,
        '(number)Button font size, %': button_font_size,
        '(number)Widget size, <i>px</i>': global_widget_size,
        '(bool)Fade at axis center': fade_at_axis_center,
        '(number)Fade zone, <i>%</i>': fade_zone * 100,
        '(color)Background': table_color,
        '(color)Chromakey': chromakey_color
    };
    $t.inner($t.gui.make_table_inputs(params), d[1]);
}

function show_save_dialog() {
    if (dialog_active) return;
    dialog_active = true;
    var seria = serialize(widgets);
    var d = $t.gui.dialog_buttons("Save", {
        'Delete': function(d) {
            var ii = d[1].getElementsByClassName('dialog-input');
            var name = $t.gui.input_value(ii[0]);
            try { delete saved_presets.series[name]; } catch (e) {}
            saved_presets.last = undefined;
            localStorage.setItem('saved_presets', JSON.stringify(saved_presets));
            clear_widgets();
            $t.gui.dialog_remove(d[0]); dialog_active = false;
        },
        'Export': function(d) {
            $t.gui.dialog_remove(d[0]);
            var d = $t.gui.dialog_buttons("Export save", {
                'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
                'Copy to clipboard': function(d) {
                    var ii = d[1].getElementsByClassName('dialog-input');
                    ii[0].select();
                    document.execCommand('copy');
                },
                'OK': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; }
            });
            $t.inner($t.gui.make_table_inputs({ '(area)Export string': seria }), d[1]);
            $t.element('hr', {}, d[1]);
            $t.element('a', { href: String(window.location).split('?')[0] + '?c=' + 
                    encodeURIComponent(serialize_url(widgets)) }, d[1], 'Direct link');

            var ii = d[1].getElementsByClassName('dialog-input');
            ii[0].select();
        },
        'Cancel': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
        'OK': function(d) {
            var ii = d[1].getElementsByClassName('dialog-input');
            var name = $t.gui.input_value(ii[0]);
            if (name == '') return;
            saved_presets.series[name] = seria;
            saved_presets.last = name;
            localStorage.setItem('saved_presets', JSON.stringify(saved_presets));
            $t.gui.dialog_remove(d[0]); dialog_active = false;
            $t.id('seria_name').innerHTML = 'preset: ' + saved_presets.last;
        },
        'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; }
    });
    var params = {
        '(text)Name': saved_presets.last ? saved_presets.last : ''
    };
    $t.inner($t.gui.make_table_inputs(params), d[1]);
}

function show_load_dialog() {
    if (dialog_active) return;
    dialog_active = true;
    var d = $t.gui.dialog_buttons("Load", {
        'Delete': function(d) {
            var ii = d[1].getElementsByClassName('dialog-input');
            var nameid = $t.gui.input_value(ii[0]);
            var name = Object.keys(saved_presets.series)[nameid];
            try { delete saved_presets.series[name]; } catch (e) {}
            saved_presets.last = undefined;
            localStorage.setItem('saved_presets', JSON.stringify(saved_presets));
            clear_widgets();
            $t.gui.dialog_remove(d[0]); dialog_active = false;
        },
        'Import': function(d) {
            $t.gui.dialog_remove(d[0]);
            var d = $t.gui.dialog_buttons("Impoer save", {
                'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
                'OK': function(d) {
                    var ii = d[1].getElementsByClassName('dialog-input');
                    var seria = $t.gui.input_value(ii[0]);
                    deserialize(seria, document.body);
                    $t.gui.dialog_remove(d[0]); dialog_active = false;
                }
            });
            $t.inner($t.gui.make_table_inputs({ '(area)Import string': '' }), d[1]);
        },
        'New': function(d) {
            clear_widgets();
            $t.gui.dialog_remove(d[0]); dialog_active = false;
        },
        'Cancel': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
        'OK': function(d) {
            var ii = d[1].getElementsByClassName('dialog-input');
            var nameid = $t.gui.input_value(ii[0]);
            var key = Object.keys(saved_presets.series)[nameid];
            saved_presets.last = key;
            localStorage.setItem('saved_presets', JSON.stringify(saved_presets));
            deserialize(saved_presets.series[key], document.body);
            $t.gui.dialog_remove(d[0]); dialog_active = false;
        },
        'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; }
    });
    var params = {}
    params['(list:' + Object.keys(saved_presets.series).join(';') + ')Name'] = 0;
    $t.inner($t.gui.make_table_inputs(params), d[1]);
}

function wid_frame(w, h, borders, container) {
    var svg = $t.svg.svg('svg', { version: '1.1', 'class': 'joy-widget', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h }, container);
    var defs = $t.svg.svg('defs', {}, svg);
    var filter = $t.svg.svg('filter', { id: 'widblur', x: -5, y: -5, width: 10, height: 10 }, defs);
    $t.svg.svg('feGaussianBlur', { stdDeviation: 3 }, filter);
    $t.svg.svg('rect', { rx: global_widget_radius, ry: global_widget_radius, x: borders[3] + dd, y: borders[0] + dd, width: w - borders[3] - borders[1], height: h - borders[2] - borders[0], style: 'fill: ' + back_color + '; stroke: ' + shadow_color + '; stroke-width: ' + thick_stroke + (use_shadows ? '; filter: url(#widblur)' : '') }, svg);
    $t.svg.svg('rect', { 'class': 'joywidframe', rx: global_widget_radius, ry: global_widget_radius, x: borders[3] + dd, y: borders[0] + dd, width: w - borders[3] - borders[1], height: h - borders[2] - borders[0], style: 'fill: none; stroke: ' + main_color + '; stroke-width: ' + thick_stroke + ';' }, svg);
    make_movable(svg);
    return svg;
}

function wid_borderless_frame(w, h, container) {
    var svg = $t.svg.svg('svg', { version: '1.1', 'class': 'joy-widget', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h }, container);
    var defs = $t.svg.svg('defs', {}, svg);
    make_movable(svg);
    return svg;
}

function wid_arrow(svg, w, h, borders, params) {
    var path = [5, -2,  9, 3,  7, 3,  7, 5,  3, 5,  3, 3,  1, 3];
    var padding = 7;
    w = w - borders[1] - borders[3] - padding * 2;
    h = h - borders[0] - borders[2] - padding * 2;
    for (var i = 0; i < path.length; i += 2) {
        path[i + 0] = path[i + 0] / 10.0 * w + borders[3] + padding;
        path[i + 1] = path[i + 1] / 10.0 * h + borders[0] + padding;
    }
    var arrow = $t.svg.svg('polygon', { points: path.join(','), style: 'fill: ' + main_color + '; stroke: none;' }, svg);
    params.pip = {
        c: [w / 2 +  + borders[3] + padding, h / 2 + borders[0] + padding].join(' '),
        arrow: arrow
    };
}

function wid_hor_text(svg, x, y, text, noshadow) {
    if (!noshadow && use_shadows) {
        var el = $t.svg.svg('text', { y: y, x: x, 'dominant-baseline': "middle", 'text-anchor': "middle", style: 'fill: ' + shadow_color + '; stroke: ' + shadow_color + '; font-family: ' + label_font + '; font-size: ' + (noshadow ? button_font_size : label_font_size) + '%; filter: url(#widblur)' }, svg);
        el.innerHTML = text;
    }
    var el = $t.svg.svg('text', { y: y, x: x, 'dominant-baseline': "middle", 'text-anchor': "middle", style: 'fill: ' + main_color + '; font-family: ' + label_font + '; font-size: ' + (noshadow ? button_font_size : label_font_size) + '%' }, svg);
    el.innerHTML = text;
    return el;
}

function wid_ver_text(svg, x, y, text) {
    if (use_shadows) {
        var el = $t.svg.svg('text', { y: y, x: x, 'dominant-baseline': "middle", 'text-anchor': "middle", style: 'fill: ' + shadow_color + '; stroke: ' + shadow_color + '; font-family: ' + label_font + '; font-size: ' + label_font_size + '%; filter: url(#widblur)', transform: "rotate(-90 " + x + "," + y + ")" }, svg);
        el.innerHTML = text;
    }
    el = $t.svg.svg('text', { y: y, x: x, 'dominant-baseline': "middle", 'text-anchor': "middle", style: 'fill: ' + main_color + '; font-family: ' + label_font + '; font-size: ' + label_font_size + '%', transform: "rotate(-90 " + x + "," + y + ")" }, svg);
    el.innerHTML = text;
}

function wid_ver_axis(svg, widget_params, h, borders) {
    var p = widget_params.pip.center;
    var el = $t.svg.svg('line', { x1: p.x + dd, x2: p.x + dd, y1: borders[0] + dd, y2: h - borders[2] + dd, style: 'fill: none; stroke: ' + main_color + '; stroke-width: ' + thin_stroke + '; stroke-dasharray: 2 2' }, svg);
}

function wid_hor_axis(svg, widget_params, w, borders) {
    var p = widget_params.pip.center;
    var el = $t.svg.svg('line', { y1: p.y + dd, y2: p.y + dd, x1: borders[3] + dd, x2: w - borders[1] + dd, style: 'fill: none; stroke: ' + main_color + '; stroke-width: ' + thin_stroke + '; stroke-dasharray: 2 2' }, svg);
}

function wid_center_pip(svg, w, h, borders, params) {
    var cv = w / 2 + (borders[3] - borders[1]) / 2;
    var ch = h / 2 + (borders[0] - borders[2]) / 2;
    var si = global_widget_pip_size - 1.5;
    var el = $t.svg.svg('rect', { rx: global_widget_radius, ry: global_widget_radius, x: cv - si, y: ch - si, width: si * 2, height: si * 2, style: 'fill: ' + main_color + ';' });
    var tw = w - borders[3] - borders[1] - global_widget_pip_size * 2;
    var th = h - borders[0] - borders[2] - global_widget_pip_size * 2;
    params.pip = {
        dmin: { x: cv - tw / 2, y: ch - th / 2 },
        dmax: { x: cv + tw / 2, y: ch + th / 2 },
        d: { x: tw, y: th },
        el: el
    };
    params.pip.center = get_axis_coordinates(params, { x: 0, y: 0 })
    return el;
}

function get_axis_coordinates(widget_params, value) {
    try {
        var p = widget_params.pip;
        var diapason = widget_params.diapason;
        if (value.x < diapason.x[0]) value.x = diapason.x[0];
        if (value.y < diapason.y[0]) value.y = diapason.y[0];
        if (value.x > diapason.x[1]) value.x = diapason.x[1];
        if (value.y > diapason.y[1]) value.y = diapason.y[1];
        var posx = diapason.x[1] != diapason.x[0] ?
            (value.x - diapason.x[0]) / (diapason.x[1] - diapason.x[0]) : 0.5;
        var posy = diapason.y[1] != diapason.y[0] ?
            (value.y - diapason.y[0]) / (diapason.y[1] - diapason.y[0]) : 0.5;
        if (diapason.x[2]) posx = 1.0 - posx;
        if (diapason.y[2]) posy = 1.0 - posy;
        var cx = p.dmin.x + posx * (p.dmax.x - p.dmin.x);
        var cy = p.dmin.y + posy * (p.dmax.y - p.dmin.y);
    } catch (e) {};
    return { x: cx + dd, y: cy + dd };
}

function set_pip_position(widget_params, value) {
    try {
        var c = get_axis_coordinates(widget_params, value);
        var res = {};
        if (c.x !== undefined && !isNaN(c.x)) res.x = c.x - global_widget_pip_size + 1.5;
        if (c.y !== undefined && !isNaN(c.y)) res.y = c.y - global_widget_pip_size + 1.5;
        $t.set(widget_params.pip.el, res);
        if (fade_at_axis_center && !(widget_params.diapason.x[3] || widget_params.diapason.y[3])) {
            var d = widget_params.pip.d;
            if ((!value.x || Math.abs(value.x) < fade_zone) && (!value.y || Math.abs(value.y) < fade_zone))
                widget_params.pip.el.style['fill-opacity'] = 0.5;
            else
                widget_params.pip.el.style['fill-opacity'] = 1.0;
        }
    } catch (e) {};
}

function set_axis_button_value(widget_params, value) {
    try {
        var p = widget_params.button;
        var val = value.a > widget_params.diapason.a[0] && value.a < widget_params.diapason.a[1];
        if (widget_params.diapason.a[2]) val = !val;
        if (val == p.pressed) return;
        p.pressed = val;
        if (val) {
            p.el.style['fill'] = main_color;
            p.text.style['fill'] = back_color;
        }
        else {
            p.el.style['fill'] = 'none';
            p.text.style['fill'] = main_color;
        }
    } catch (e) {};
}

function set_button_value(widget_params, value) {
    try {
        var p = widget_params.button;
        if (widget_params.but[2]) value = !value;
        if (value == p.pressed) return;
        p.pressed = value;
        if (value) {
            p.el.style['fill'] = main_color;
            p.text.style['fill'] = back_color;
        }
        else {
            p.el.style['fill'] = 'none';
            p.text.style['fill'] = main_color;
        }
    } catch (e) {};
}


function set_hat_switch_value(widget_params, value) {
    try {
        var pip = widget_params.pip;
        var val = value.hat.toFixed(1);
        var angle = 0;
        if (val == '1.3' || val == '3.3') {
            pip.arrow.style.visibility = 'hidden';
        }
        else {
            if (val == '-1.0') angle = 0;
            else if (val == '-0.7') angle = 45;
            else if (val == '-0.4') angle = 90;
            else if (val == '-0.1') angle = 135;
            else if (val == '0.1') angle = 180;
            else if (val == '0.4') angle = 225;
            else if (val == '0.7') angle = 270;
            else if (val == '1.0') angle = 315;
            pip.arrow.style.visibility = 'visible';
        }
        $t.set(pip.arrow, { transform: "rotate(" + angle + " " + pip.c + ")" });
    } catch (e) {};
}

var widget_factory = {
    'Button': function(container, params) {
        var borders = [global_border_pass, global_border_pass, global_border_pass, global_border_pass];
        var size = params.wide ? global_widget_size - global_border_pass - 5 : global_widget_size * 0.5 - 5;
        if (size < global_widget_deep) size = global_widget_deep;
        if (!params.width) params.width = 0;
        if (params.width > 20) size = params.width;
        var sizeh = global_widget_deep > size ? size : global_widget_deep;
        var svg = wid_frame(size, sizeh, borders, container);
        var text = wid_hor_text(svg, size / 2, sizeh / 2,
                params.wide ? params.label : String(params.label).substring(0, 4), true);
        params.button = { el: svg.getElementsByClassName('joywidframe')[0], text: text, pressed: false };
        return svg;
    },
    'Horizontal Axis': function(container, params) {
        if (!params.diapason) params.diapason = { x: [-1.0, 1.0], y: [-1.0, 1.0] };
        var borders = [global_border_tab, global_border_tab, global_border_pass, global_border_pass];
        var svg = wid_frame(global_widget_size, global_widget_deep, borders, container);
        var cv = global_widget_size / 2 + (borders[3] - borders[1]) / 2;
        var pip = wid_center_pip(svg, global_widget_size, global_widget_deep, borders, params);
        wid_hor_text(svg, cv, 12, params.label);
        if (!params.diapason.x[3]) wid_ver_axis(svg, params, global_widget_deep, borders);
        params.diapason.y = [0.0, 0.0];
        svg.appendChild(pip);
        set_pip_position(params, { x: 0, y: 0 });
        return svg;
    },
    'Vertical Axis': function(container, params) {
        if (!params.diapason) params.diapason = { x: [-1.0, 1.0], y: [-1.0, 1.0] };
        var borders = 
            params.righthanded ?
            [global_border_pass, global_border_tab, global_border_tab, global_border_pass] :
            [global_border_tab, global_border_pass, global_border_pass, global_border_tab];
        var svg = wid_frame(global_widget_deep, global_widget_size, borders, container);
        var ch = global_widget_size / 2 + (borders[3] - borders[1]) / 2;
        var pip = wid_center_pip(svg, global_widget_deep, global_widget_size, borders, params);
        wid_ver_text(svg, params.righthanded ? global_widget_deep - 12 : 12, ch, params.label);
        if (!params.diapason.y[3]) wid_hor_axis(svg, params, global_widget_deep, borders);
        params.diapason.x = [0.0, 0.0];
        svg.appendChild(pip);
        set_pip_position(params, { x: 0, y: 0 });
        return svg;
    },
    'Dual Axis': function(container, params) {
        if (!params.diapason) params.diapason = { x: [-1.0, 1.0], y: [-1.0, 1.0] };
        var borders = 
            params.righthanded ?
            [global_border_tab, global_border_tab, global_border_pass, global_border_pass] :
            [global_border_tab, global_border_pass, global_border_pass, global_border_tab];
        var ch = global_widget_size / 2 + (borders[0] - borders[2]) / 2;
        var cv = global_widget_size / 2 + (borders[3] - borders[1]) / 2;
        var svg = wid_frame(global_widget_size, global_widget_size, borders, container);
        var pip = wid_center_pip(svg, global_widget_size, global_widget_size, borders, params);
        wid_hor_text(svg, cv, 12, params.hor_label);
        wid_ver_text(svg, params.righthanded ?  global_widget_size - 12 : 12, ch, params.ver_label);
        if (!params.diapason.x[3]) wid_hor_axis(svg, params, global_widget_size, borders);
        if (!params.diapason.y[3]) wid_ver_axis(svg, params, global_widget_size, borders);
        svg.appendChild(pip);
        set_pip_position(params, { x: 0, y: 0 });
        return svg;
    },
    'Axis Button': function(container, params) {
        if (!params.diapason) params.diapason = { a: [-0.5, 0.5] };
        var borders = [global_border_pass, global_border_pass, global_border_pass, global_border_pass];
        var size = params.wide ? global_widget_size - global_border_pass - 5 : global_widget_size * 0.5 - 5;
        if (size < global_widget_deep) size = global_widget_deep;
        if (!params.width) params.width = 0;
        if (params.width > 20) size = params.width;
        var sizeh = global_widget_deep > size ? size : global_widget_deep;
        var svg = wid_frame(size, sizeh, borders, container);
        var text = wid_hor_text(svg, size / 2, sizeh / 2,
                params.wide ? params.label : String(params.label).substring(0, 4), true);
        params.button = { el: svg.getElementsByClassName('joywidframe')[0], text: text, pressed: false };
        return svg;
    },
    'Hat Switch': function(container, params) {
        var borders = [global_border_tab, global_border_pass, global_border_pass, global_border_pass];
        var size = global_widget_size * 0.5 - 5;
        if (size < global_widget_deep) size = global_widget_deep;
        var svg = wid_frame(size, size + 15, borders, container);
        var cv = size / 2 + (borders[3] - borders[1]) / 2;
        wid_arrow(svg, size, size + 15, borders, params);
        wid_hor_text(svg, cv, 12, params.label);
        return svg;
    },
    'Label': function(container, params) {
        var borders = [global_border_pass, global_border_pass, global_border_pass, global_border_pass];
        if (!params.fontsize) params.fontsize = button_font_size;
        if (!params.orientation) params.orientation = 0;
        var ruler = $t.id('ruler');
        ruler.style['font-family'] = label_font;
        ruler.style['font-size'] = params.fontsize + '%';
        ruler.innerHTML = params.label;
        var box = ruler.getBoundingClientRect();
        var w = Math.round(box.width / 10.0) * 10 + 10;
        var h = Math.round(box.height / 10.0) * 10 + 10;
        var svg = params.orientation == 0 ?
            wid_borderless_frame(w, h, container) : wid_borderless_frame(h, w, container);
        var oldf = label_font_size; label_font_size = params.fontsize;
        if (params.orientation == 0) wid_hor_text(svg, w / 2, h / 2, params.label);
        else wid_ver_text(svg, h / 2, w / 2, params.label);
        label_font_size = oldf;
        return svg;
    }
};

var edit_params = {
    'Button': { params: [['(text)Label', 'label'], ['(bool)Wide', 'wide'], ['(text)Custom width, <i>px</i>', 'width']], axis: [['button']] },
    'Horizontal Axis': { params: [['(text)Label', 'label']], axis: [['axis', 'x']] },
    'Vertical Axis': { params: [['(text)Label', 'label'], ['(bool)Right handed label', 'righthanded']], axis: [['axis', 'y']] },
    'Dual Axis': { params: [['(text)Horizontal label', 'hor_label'], ['(text)Vertical label', 'ver_label'], ['(bool)Right handed label', 'righthanded']], axis: [['axis', 'x'], ['axis', 'y']] },
    'Axis Button': { params: [['(text)Label', 'label'], ['(bool)Wide', 'wide'], ['(text)Custom width, <i>px</i>', 'width']], axis: [['axis_but', 'a']] },
    'Hat Switch': { params: [['(text)Label', 'label']], axis: [['axis_hat', 'hat']] },
    'Label': { params: [['(text)Label', 'label'], ['(number)Font size, <i>%</i>', 'fontsize'], ['(list:Horizontal;Vertical)Orientation', 'orientation']], axis: [] }
};

var animate_params = {
    'Button': set_button_value,
    'Horizontal Axis': set_pip_position,
    'Vertical Axis': set_pip_position,
    'Dual Axis': set_pip_position,
    'Axis Button': set_axis_button_value,
    'Hat Switch': set_hat_switch_value,
    'Label': undefined
};

function add_widget(container, widtype, params, x, y) {
    if (!params.link) params.link = {};
    var svg = widget_factory[widtype](container, params);
    var id = 'joywidget_' + ++global_wid_counter;
    widgets[id] = { id: id, widtype: widtype, params: params, pos: { x: x, y: y } };
    $t.set(svg, { id: id });
    svg.style.left = x + 'px';
    svg.style.top = y + 'px';
    $t.id('infohelp').style.display = 'none';
    return svg;
}

function rewrite_widget(widget, new_params) {
    var el = $t.id(widget.id);
    var container = el.parentNode;
    $t.remove($t.id(widget.id));
    var svg = widget_factory[widget.widtype](container, new_params);
    $t.set(svg, { id: widget.id });
    svg.style.left = widget.pos.x + 'px';
    svg.style.top = widget.pos.y + 'px';
}

function rewrite_all_widgets(widgets) {
    for (var i in widgets) {
        rewrite_widget(widgets[i], widgets[i].params);
    }
}

function del_widget(widget) {
    $t.remove($t.id(widget.id));
    delete widgets[widget.id];
    if (Object.keys(widgets).length == 0)
        $t.id('infohelp').style.display = 'inline-block';
}

function clear_widgets() {
    for (var i in widgets) del_widget(widgets[i]);
    $t.id('seria_name').innerHTML = '';
    $t.id('infohelp').style.display = 'inline-block';
}

var widget_serializator = {
    'Button': function(params) {
        return [params.label, params.wide, params.width, params.but];
    },
    'Horizontal Axis': function(params) {
        return [params.label, params.link.x, params.diapason.x];
    },
    'Vertical Axis': function(params) {
        return [params.label, params.righthanded, params.link.y, params.diapason.y];
    },
    'Dual Axis': function(params) {
        return [params.hor_label, params.ver_label, params.righthanded, params.link.x, params.link.y, params.diapason.x, params.diapason.y];
    },
    'Axis Button': function(params) {
        return [params.label, params.wide, params.width, params.link.a, params.diapason.a];
    },
    'Hat Switch': function(params) {
        return [params.label, params.link.hat];
    },
    'Label': function(params) {
        return [params.label, params.fontsize, params.orientation];
    }
};

var widget_deserializator = {
    'Button': function(d) {
        return { label: d[3], wide: d[4], width: d[5], but: d[6] };
    },
    'Horizontal Axis': function(d) {
        return { label: d[3], link: { x: d[4], y: [0, 0] }, diapason: { x: d[5], y: [0, 0] } };
    },
    'Vertical Axis': function(d) {
        return { label: d[3], righthanded: d[4], link: { y: d[5], x: [0, 0] }, diapason: { y: d[6], x: [0, 0] } };
    },
    'Dual Axis': function(d) {
        return { hor_label: d[3], ver_label: d[4], righthanded: d[5], link: { x: d[6], y: d[7] }, diapason: { x: d[8], y: d[9] } };
    },
    'Axis Button': function(d) {
        return { label: d[3], wide: d[4], width: d[5], link: { a: d[6] }, diapason: { a: d[7] } };
    },
    'Hat Switch': function(d) {
        return { label: d[3], link: { hat: d[4] } };
    },
    'Label': function(d) {
        return { label: d[3], fontsize: d[4], orientation: d[5] };
    }
};

function serialize_url(widgets) {
    var ws = [];
    for (var i in widgets) {
        var w = widgets[i];
        ws.push([Object.keys(widget_factory).indexOf(w.widtype), w.pos.x, w.pos.y].concat(widget_serializator[w.widtype](w.params)));
    }
    var ss = [main_color, back_color, use_shadows, shadow_color, thick_stroke, thin_stroke, label_font, global_widget_size, label_font_size, button_font_size, fade_at_axis_center, table_color, chromakey_color, fade_zone, global_widget_radius,];

    var res = JSON.stringify([ws, ss]);
    res = res.replace(/-/g, ';');
    res = res.replace(/,/g, '-');
    console.log(res);
    return res;
}
function deserialize_url(str, container) {
    clear_widgets();
        str = str.replace(/-/g, ',');
        str = str.replace(/;/g, '-');
        console.log(str);
        var res = JSON.parse(str);
        if (res[1][0] != undefined) main_color = res[1][0];
        if (res[1][1] != undefined) back_color = res[1][1];
        if (res[1][2] != undefined) use_shadows = res[1][2];
        if (res[1][3] != undefined) shadow_color = res[1][3];
        if (res[1][4] != undefined) thick_stroke = res[1][4];
        if (res[1][5] != undefined) thin_stroke = res[1][5];
        if (res[1][6] != undefined) label_font = res[1][6];
        if (res[1][7] != undefined) global_widget_size = res[1][7];
        if (res[1][8] != undefined) label_font_size = res[1][8];
        if (res[1][9] != undefined) button_font_size = res[1][9];
        if (res[1][10] != undefined) fade_at_axis_center = res[1][10];
        if (res[1][11] != undefined) table_color = res[1][11];
        if (res[1][12] != undefined) chromakey_color = res[1][12];
        if (res[1][13] != undefined) fade_zone = res[1][13];
        if (res[1][14] != undefined) global_widget_radius = res[1][14];
        document.body.style['background-color'] = table_color;
        for (var i in res[0]) {
            var w = res[0][i];
            var widtype = Object.keys(widget_factory)[w[0]];
            add_widget(container, widtype, widget_deserializator[widtype](w), w[1], w[2]);
        }
        $t.id('seria_name').innerHTML = 'preset: ' + saved_presets.last;
}

function serialize(widgets) {
    var res = { widgets: [], settings: {} };
    for (var i in widgets) {
        var w = widgets[i];
        var p = Object.assign({}, w.params);
        delete p.button;
        delete p.pip;
        res.widgets.push({ widtype: w.widtype, params: p, pos: w.pos });
    }
    res.settings.main_color = main_color;
    res.settings.back_color = back_color;
    res.settings.use_shadows = use_shadows;
    res.settings.shadow_color = shadow_color;
    res.settings.thick_stroke = thick_stroke;
    res.settings.thin_stroke = thin_stroke;
    res.settings.label_font = label_font;
    res.settings.global_widget_size = global_widget_size;
    res.settings.label_font_size = label_font_size;
    res.settings.button_font_size = button_font_size;
    res.settings.fade_at_axis_center = fade_at_axis_center;
    res.settings.table_color = table_color;
    res.settings.chromakey_color = chromakey_color;
    res.settings.fade_zone = fade_zone;
    res.settings.global_widget_radius = global_widget_radius;
    return JSON.stringify(res, undefined, '');
}

function deserialize(str, container) {
    clear_widgets();
    try {
        var res = JSON.parse(str);
        if (res.settings.main_color != undefined) main_color = res.settings.main_color;
        if (res.settings.back_color != undefined) back_color = res.settings.back_color;
        if (res.settings.use_shadows != undefined) use_shadows = res.settings.use_shadows;
        if (res.settings.shadow_color != undefined) shadow_color = res.settings.shadow_color;
        if (res.settings.thick_stroke != undefined) thick_stroke = res.settings.thick_stroke;
        if (res.settings.thin_stroke != undefined) thin_stroke = res.settings.thin_stroke;
        if (res.settings.label_font != undefined) label_font = res.settings.label_font;
        if (res.settings.global_widget_size != undefined) global_widget_size = res.settings.global_widget_size;
        if (res.settings.label_font_size != undefined) label_font_size = res.settings.label_font_size;
        if (res.settings.button_font_size != undefined) button_font_size = res.settings.button_font_size;
        if (res.settings.fade_at_axis_center != undefined) fade_at_axis_center = res.settings.fade_at_axis_center;
        if (res.settings.table_color != undefined) table_color = res.settings.table_color;
        if (res.settings.chromakey_color != undefined) chromakey_color = res.settings.chromakey_color;
        if (res.settings.fade_zone != undefined) fade_zone = res.settings.fade_zone;
        if (res.settings.global_widget_radius != undefined) global_widget_radius = res.settings.global_widget_radius;
        document.body.style['background-color'] = table_color;
        for (var i in res.widgets) {
            var w = res.widgets[i];
            add_widget(container, w.widtype, w.params, w.pos.x, w.pos.y);
        }
        $t.id('seria_name').innerHTML = 'preset: ' + saved_presets.last;
    } catch (e) {}
}

function auto_update() {
    var joys = navigator.getGamepads();

    function get_axis_data(addr) {
        try { return joys[addr[0] - 1].axes[addr[1] - 1]; }
        catch (e) { return undefined; }
    }

    function get_button_data(addr) {
        try { return joys[addr[0] - 1].buttons[addr[1] - 1].pressed; }
        catch (e) { return false; }
    }

    for (var i in widgets) {
        var widget = widgets[i];
        var link = widget.params.link;
        var res = {}, got = false;
        for (var l in link) {
            var data = get_axis_data(link[l]);
            if (data != undefined) { res[l] = data; got = true; }
        }
        if (got) animate_params[widget.widtype](widget.params, res);
        var but = widget.params.but;
        if (but) animate_params[widget.widtype](widget.params, get_button_data(but));
    }
    requestAnimationFrame(auto_update);
}

function joy_initialize(container, w, h) {
    $t.remove($t.id('loading_text'));

    clear_widgets();

    saved_presets = localStorage.getItem('saved_presets');
    if (!saved_presets) saved_presets = { series: {}, last: undefined };
    else saved_presets = JSON.parse(saved_presets);

    var params = $t.get_url_params(); 
    if (params.c) {
        saved_presets.last = undefined;
        var c = decodeURIComponent(params.c);
        deserialize_url(c, container);
        if (!params.norun) {
            global_run = true;
            switch_global_run();
        }
    }

    if (saved_presets.last) {
        deserialize(saved_presets.series[saved_presets.last], container);
    }

    $t.bind($t.id('btn_clear'), 'click', function(ev) {
        clear_widgets();
    });

    $t.bind($t.id('btn_joysticks'), 'click', function(ev) {
        show_joysticks_dialog();
    });

    $t.bind($t.id('btn_settings'), 'click', function(ev) {
        show_settings_dialog();
    });

    $t.bind($t.id('btn_save'), 'click', function(ev) {
        show_save_dialog();
    });

    $t.bind($t.id('btn_load'), 'click', function(ev) {
        show_load_dialog();
    });

    $t.bind($t.id('btn_run'), 'click', function(ev) {
        global_run = true;
        switch_global_run();
    });

    $t.bind(document.body, 'keydown', function(ev) {
        if (global_run) {
            if (ev.key == 'Escape') {
                global_run = false;
                switch_global_run();
            }
        }
    });

    $t.bind(document.body, 'mousemove', function(ev) {
        if (mouse) {
            var new_mouse = { x: ev.clientX, y: ev.clientY };
            mouse_move = mouse_move || (Math.abs(new_mouse.x - mouse.x) > 5 ||
                    Math.abs(new_mouse.y - mouse.y) > 5);
            if (mouse_move) {
                var dx = Math.round((new_mouse.x - mouse.x) / 5) * 5;
                var dy = Math.round((new_mouse.y - mouse.y) / 5) * 5;
                movable_el.style.left = initial_pos.x + dx + 'px';
                movable_el.style.top = initial_pos.y + dy + 'px';
                widgets[movable_el.getAttribute('id')].pos = { x: initial_pos.x + dx, y: initial_pos.y + dy};
            }
        }
    });

    $t.bind(document.body, 'dblclick', function(ev) {
        if (dialog_active) return;
        if (global_run) return;
        dialog_active = true;
        var mouse = { x: Math.round(ev.clientX / 5) * 5 - 30, y: Math.round(ev.clientY / 5) * 5 - 30 };
        var d = $t.gui.dialog_buttons("Add new widget", {
            'Cancel': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; },
            'OK': function(d) {
                var ii = d[1].getElementsByClassName('dialog-input');
                var val = $t.gui.input_value(ii[0]);
                $t.gui.dialog_remove(d[0]); dialog_active = false;
                add_widget(container, Object.keys(widget_factory)[val], {}, mouse.x, mouse.y);
            },
            'X': function(d) { $t.gui.dialog_remove(d[0]); dialog_active = false; }
        });
        d[1].innerHTML = 'Select the type of new widget. You may edit its content later<br/> by double-clicking on the widget.<br/><br/>';
        var params = {};
        params['(list:' + Object.keys(widget_factory).join(';') + ')Type'] = 0;
        $t.inner($t.gui.make_table_inputs(params), d[1]);
    }, false);

    requestAnimationFrame(auto_update);
}
