var $j = jQuery.noConflict();

window._ = Lazy;

/* 
 * A bunch of useful functions
 */

function fswitch(a, cases){ if (cases[a] != undefined) return cases[a](); } // Better switch
function safe(k){ return typeof k === "undefined" ? _.identity : k; }       // Undefined function protection

// pesudo async execution
function parmer(f, as, k){
    var fc = 0;
    var fl = as.length;
    var res = [];
    _(as)
        .each(function(q,i){
            f(q, function(x){
                res[i] = x;
                if (fc++ === fl - 1)
                    k(res);
            });
        });
}

function resizeIframe(obj) {
    $j(obj).animate({
        "opacity":"1",
        "height" : obj.contentWindow.document.body.scrollHeight + 'px'
    });
}

/*
 * Header only - Post-list alike
 */
function Header(pid, state, k){
    var cb = safe(k); // continuation - default empty

    var header      = state()["headers"][pid];
    var name        = header.title;
    var date        = header.date;
    var location    = header.location;
    var tags        = header.tags;

    $j("#post-holder").append(
        _([
            '<div class="post-list" id="pl', pid, '">',
                '<div class="pl-name">',
                    '<a href="http://nikolaydubina.github.io?t=post&v=', pid, '">',
                        name,
                    '</a>',
                '</div>',
                '<div class="pl-time-location">',
                    date,
                    (location != "" ? ' from ' + location : ''),
                '</div>',
                '<div class="pl-tags">',
                    '#&nbsp',
                    _(tags)
                        .map(function(x,i){
                            return '<a href="http://nikolaydubina.github.io/?t=tag&v='+ x +'">' + x + '</a>'
                                        + (i != tags.length - 1 ? ' / ' : '')
                            }),
                '</div>',
            '</div>'
        ])
        .flatten()
        .join(""));

    cb();
}

/*
 * Complete Post
 */
function Post(pid, state, k){
        var cb = safe(k); // continuation - default empty

        parmer( $j.getJSON,
                ["posts/" + pid + ".json"],
                post_main);

        function post_main(data){
            var name        = data[0].header.title;
            var date        = data[0].header.date;
            var location    = data[0].header.location;
            var tags        = data[0].header.tags;

            var fqueue = [];
            var fqueue_wr = function(x){ fqueue.push(x); };

            $j("#post-holder").append(
                _([
                    '<article class="post" id="p', pid, '">',
                        '<header>',
                            '<div class="p-name">',
                                '<a href="http://nikolaydubina.github.io?t=post&v=', pid, '">',
                                    name,
                                '</a>',
                            '</div>',
                            '<div class="p-tags">',
                                (tags.length === 0 ? "" : "#&nbsp"),
                                _(tags)
                                    .map(function(x,i){
                                        return '<a href="http://nikolaydubina.github.io/?t=tag&v='+ x +'">' + x + '</a>'
                                                    + (i != tags.length - 1 ? ' / ' : '')
                                        }),
                            '</div>',
                            '<div class="p-source-btn">',
                                '<a href="http://nikolaydubina.github.io/posts/', pid, '/post.txt">source</a>',
                            '</div>',
                            '<div class="p-time-location">',
                                date,
                                (location != "" ? ' from ' + location : ''),
                            '</div>',
                        '</header>',
                        _(data[0].content)
                            .map(function(x,i){
                                    return fswitch(Object.keys(x)[0],
                                    {
                                        "p"     : function() { return Objects["paragraph"].make(x.p, pid, fqueue_wr ); },
                                        "img"   : function() { return Objects["img"].make(x.img, pid, i, fqueue_wr ); },
                                        "code"  : function() { return Objects["code"].make(x.code, pid, fqueue_wr ); },
                                        "list"  : function() { return Objects["list"].make(x.list, pid, fqueue_wr ); },
                                        "raw"   : function() { return Objects["raw"].make(x.raw, pid, fqueue_wr ); }
                                    });
                                }),
                        '<div><p class="post-footer">~~~ + ~~~</p></div>',
                    '</article>'
                ])
                .flatten()
                .join(""));

            // after-rendering
            var i = 0;
            while(i < fqueue.length)
                fqueue[i++]();

            // continuation
            cb();
        }
}

/*
 * Constructors and Binders for content elements in post
 */
var Objects = {
    "paragraph" : {
        "make" : function(text, pid, fqueue){
                    return _(['<p>', text, '</p>']);
        }
    },
    "slider" : {
        "make" : function(sid, fqueue){
                    console.log('here');
                    fqueue(function(){
                        console.log("bang!");
                        Animations["range"].fadeOut('w'+sid);
                    });

                    return _([
                                '<div align="center" id="w', sid, '" style="height:0px;opacity:0;">',
                                '<input ',
                                    'class="range" ',
                                    'id="', sid, '" ',
                                    'type="range" ',
                                    'value="0" ',
                                    'name="points" ',
                                    'min="0" ',
                                    'max="100">',
                                '</div>'
                        ]);
        },
        "bind" : function(slider_id, binding_id, diff, attribute){
                    $j("#" + slider_id).on("input change",function(){
                        $j("#" + binding_id).css(
                            attribute , 0 - $j(this).val() / 100 * diff + 'px'
                        );
                    });
                }
    },
    "img" : {
        "make" : function(img_info, pid, img_count, fqueue){
            var img_id = pid  + 't' + img_count;
            var count = img_info.length;

            function add_slider(){
                var width_ou = $j('#post-holder').width();

                var t = [];
                $j('#' + img_id).children().each(function(i, x){ t.push($j(x).width()); });
                console.log(_(t).max());

                var width_in = _($j('#' + img_id).children().map(function(){ return $j(this).width(); }))
                                .sum();

                width_in -= 10; // MAGIC_NUMBER: Padding of image-boxes
               
                console.log(width_ou);
                console.log(width_in);
                if (width_in > width_ou) {
                    var diff = Math.abs(width_in - width_ou);
                    var sid = "slid" + img_id + "_" + pid;

                    // FIXME
                    console.log('here 1');
                    $j('#'+img_id).after(Objects["slider"].make(sid, fqueue).flatten().join(""));

                    Objects["slider"].bind(sid, img_id, diff, "left");
                }
            }

            fqueue(function(){
                var count_l = 0;

                $j("#" + img_id)
                    .children()
                    .each(function(){
                        $j($j(this).children('img')[0]).load(function(){
                            count_l++;
                            if (count_l === count)
                                add_slider();
                        });
                    });

                // updating sizes
                var h = _(Array($j("#" + img_id).find(".img-name-wr")))
                            .map(function(t){ return $j(t).height(); })
                            .max();

                $j("#" + img_id).parent().height(h + $j("#" + img_id).height());
            });

            return _([
                        '<div class="img-container-wr">',
                            '<div class="img-container" id="', img_id, '">',
                                _(img_info)
                                    .map(function(q, i){
                                        return _([  
                                                    '<div class="img-box ', (img_info.length === 1 ? 'img-box-s' : ''), '">',
                                                        '<img src="', q.file, '">',
                                                        '<div class="img-name-wr">',
                                                            '<p class="img-name">', q.name, '</p>',
                                                        '</div>',
                                                    '</div>']);
                                    }),
                            '</div>',
                        '</div>'
                    ]);
        }
    },
    "code": {
        "make" : function(code, pid, fqueue){
            fqueue(function(){
                _($j("#p" + pid).children("pre"))
                    .each(function(block){
                        hljs.highlightBlock(block);
                    });
            });

            return _(['<pre>', '<code>', code,'</code>', '</pre>']);
        }
    },
    "list": {
        "make" : function(alist, pid, fqueue){
                return _([
                            '<div class="list">',
                            '<ul>',
                            _(alist).map(function(x){ return '<li>' + x + '</li>'; }),
                            '</ul>',
                            '</div>'
                        ]);
        }
    },
    "raw": {
        "make" : function(raw, pid, fqueue){
            var fname = _(raw).find(function(x){
                                var tmp = x.split('.');
                                return tmp[tmp.length - 1] === 'html';
                            });

            return _([
                        '<div class="raw-content">',
                            '<iframe ',
                                'sandbox="allow-scripts allow-same-origin" ',
                                'scrolling="no" ',
                                'frameborder="0" ',
                                'style="opacity : 0" ',
                                'height=0px ',
                                'onload="javascript:resizeIframe(this);"',
                                'src="posts/'+ pid + '/'+ fname +'">',
                            '</iframe>',
                        '</div>'
                ]);
        }
    }
};

/*
 * Animation functions
 */
var Animations = {
    "onload" : function(k){
        Animations["tag-selector"].h = $j("#tag-selector").height();
        $j("#tag-selector").height(0);
        $j("#btn-more").css({"visibility":"hidden","height":"0px"});
        $j("#main-menu").animate({
            "margin-top":"10px",
            "opacity":"1"
        },"slow",function(){
            $j("#tag-selector").css("visibility","visible");
            k();
        }); 
    },
    "tag-selector" : {
        "h"   : 0,
        "fadeIn"    : function(k) { 
            $j("#tag-selector").stop().animate({
                "opacity":"0",
                "height":"0px"
                },400, safe(k)); 
        },
        "fadeOut"   :  function(k) { $j("#tag-selector").stop().animate({
            "opacity": "1",
            "height" : Animations["tag-selector"].h
            },400, safe(k)); 
        }
    },
    "btn-prevnext" : {
        "fadeIn": function(q, k) { 
            $j("#btn-" + q).css({"visibility":"hidden"});
            safe(k)();
        },
        "fadeOut" : function(q, k) {
            $j("#btn-" + q).css({"visibility":"visible"});
            safe(k)();
        }
    },
    "range" : {
        "h" : "40px",
        "fadeIn"   :  function(rid, k) {
            $j("#"+rid).stop().animate({
                "opacity":"0",
                "height":"0px"
                },400, safe(k)); 
        },
        "fadeOut"   :  function(rid, k) {
            console.log("animating");

            $j("#"+rid).stop().animate({
                "opacity": "1",
                "height" : Animations["range"].h
                },400, safe(k)); 
        }
    }
};

/*
 * Event Handlers
 */
var EventHandlers = {
    "onload" : function(state){
        $j(".menu-link").on('click', function(){ EventHandlers.click_menu(this, state); });
        $j(".tag-selector-tag").unbind('click');
    },
    "click_menu" : function(a, state){
        if (state().current.menu != "")
            $j("#" + state().current.menu)
                .attr("class","menu-link")
                .on('click', function(){ EventHandlers.click_menu(this, state); });

        $j(a).attr("class","menu-link-clicked").unbind('click');
        state().current.menu = $j(a).attr("id");

        EventHandlers["clear-tag"](state);

        Animations["btn-prevnext"].fadeIn('prev');
        Animations["btn-prevnext"].fadeIn('next');

        _(state().posts)
            .each(function(x,i){
                $j("#p" + x).remove();
                $j("#pl" + x).remove();
            });
        state().posts = [];

        // adding new posts
        var to = $j(a).attr("to");
        var from = state().current.menu_name;
        state().current.menu_name = to;
        
        fswitch(to,
        {
            "about" :   function() { Post(0, state, function(){ state().posts.push(0); }); },
            "newest":   function() { get_headers("newest","", 0, state); },
            "tags":     function() { 
                            Animations["tag-selector"].fadeOut(function(){
                                $j(".tag-selector-tag")
                                    .on('click', function(){
                                        EventHandlers["click-tag"](this, state); 
                                    });
                            });
                        }
        });

        if (from === "tags")
            Animations["tag-selector"].fadeIn(function(){
                $j(".tag-selector-tag").unbind('click');
            });
    },
    "clear-tag" : function(state){
        var prev = state().current.tag;
        if (prev != "")
            $j("#"+prev).attr("class","tag-selector-tag").on('click', function(){ EventHandlers["click-tag"](this, state); });
        state().current.tag = "";
    },
    "click-tag" : function (a, state){
        EventHandlers["clear-tag"](state);
        $j(a).attr("class","tag-selector-tag-selected").unbind('click');

        state().current.tag = $j(a).attr("id");

         get_headers("tag", $j(a).attr("tv"), 0, state);
    }
};


function get_headers(str_type, selected, from, state){
    generic_get(str_type, selected, from, state, Header, state().N_Headers);
}

function get_posts(str_type, selected, from, state){
    generic_get(str_type, selected, from, state, Post, state().N_Posts);  
}

/*
 *  Generic
 *  element_generator = Post | Header
 *  Loads posts of specified type and selection parameter.
 *  no more than N posts starting from "from"
 */ 
function generic_get(str_type, selected, from, state, element_generator, getN){
    // in "time_order" newest posts are last
    var N = getN;
    var time_order = state().posts_info.by_time;
    var batch = [];
    var more_left = false;

    fswitch(str_type,{
        "newest"    :   function(){
                            var l = time_order.length;
                            for(var i = l - 1 - from; (i > (l - 1 - (from + N))) && (i >= 0); --i)
                                batch.push(time_order[i]);
                            if ((from + N) < l)
                                more_left = true;
                        },
        "tag"       :   function(){
                            var tmp = state().posts_info.by_tags[selected];
                            var cnt = 0;

                            for(var i = 0; (i < time_order.length) && (cnt != tmp.length); i++)
                                if (tmp.indexOf(time_order[i]) != -1){
                                    batch.push(time_order[i]);
                                    cnt++;
                                }

                            var lst = batch.length - from;
                            var fst = (lst - N) >= 0 ? lst - N : 0;
                            batch = batch.slice(fst, lst).reverse();
                            
                            if (fst != 0)
                                more_left = true;
                        }
    });
 
    var t_pid = 0;
    var tmp = [];

    _(state().posts)
        .each(function(q){
            if(q != batch[t_pid]){
                $j("#p" + q).remove();
                $j("#pl" + q).remove();
            }
            else{
                tmp.push(q);
                t_pid++;
            }
        });

    _(batch)
        .slice(t_pid, batch.length)
        .each(function(q, index){
            element_generator(q, state, function(){ tmp.push(q); });
        });

    state().posts = tmp;

    // Next button
    if(more_left)
        Animations["btn-prevnext"].fadeOut('next',function(){
            $j("#btn-next")
                .unbind('click')
                .on('click', function(){
                    generic_get(str_type, selected, from + N, state, element_generator, getN);
                });
        });
    else
        Animations["btn-prevnext"].fadeIn('next');

    // Prev button
    if(from != 0)
        Animations["btn-prevnext"].fadeOut('prev',function(){
            $j("#btn-prev")
                .unbind('click')
                .on('click', function(){
                    generic_get(str_type, selected, (from - N) > 0 ? from - N : 0, state, element_generator, getN);
                });
        });
    else
        Animations["btn-prevnext"].fadeIn('prev');
}

function proceed_url(state){
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var type = getParameterByName("t");
    var val  = getParameterByName("v");

    if((type != null) && (val != null)){
        fswitch(type, {
            "post"  :   function(){
                            var nval = Number(val);
                            if((nval >= 0) && (state().posts_info.by_time.indexOf(nval) != -1))
                                Post(nval, state, function(){ state().posts.push(nval); });
                        },
            "tag"   :   function(){
                            if(state().tags.indexOf(val) != -1){
                                EventHandlers.click_menu($j("#ml1"), state);
                                EventHandlers["click-tag"]($j("#tag_"+ state().tags.indexOf(val)), state);
                            }
                        }
        });
    }
}

function load_tags(state){
    $j("#tag-selector").append(
        _(state().tags)
            .map(function(x,i){
                return _(['<div id="tag_', i, '" class="tag-selector-tag" tv="', x, '">', x, '</div>']);
            })
            .flatten()
            .join("")
    );
}

/*
 * Core
 */
(function(){ 
    $j(document).ready(function(){

        // loading resources
        parmer(  $j.getJSON,
                ["posts.json", "headers.json"],
                main);
        
        function main(data){
            var state = {
                "posts"             : [],
                "N_Headers"         : 20,
                "N_Posts"           : 2,
                "posts_info"        : data[0],
                "headers"           : data[1],
                "tags"              : Object.keys(data[0].by_tags),
                "current"           : {
                    "menu"          : "",
                    "menu_name"     : "",
                    "tag"           : ""
                }
            };

            var state_ref = function(){ return state; };

            load_tags(state_ref);

            EventHandlers.onload(state_ref);
            Animations.onload(function(){
                proceed_url(state_ref);
            });
        }
    });
})();
