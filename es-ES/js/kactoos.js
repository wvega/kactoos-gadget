/**
 * Kactoos Gadget
 *
 * Copyright 2010 Willington Vega Cardona - wvega@wvega.com
 * 
 * */

(function($){
    var kactoos = null;
    var appname = 'wvega';
    var apikey = 'hjlll23w24edjj34rdw4eds';
    
    /**
     * Kactoos - Kactoos Gadget controller */
    Kactoos = function(element) {
        this.element = $(element);
        this.widgets = {};
        this.init();
    };

    Kactoos.prototype = {
        init: function() {
            this.products = this.load();

            // setup background image
            $('#background').get(0).src = 'url(images/gadget-bg.png)';
            
            // initialize other widgets
            this.widgets.search = $('#kactoos-search').KactoosSearch();
            this.widgets.explorer = $('#kactoos-explorer').KactoosExplorer();

            var widget = this;

            // navigation
            this.label = this.element.find('.navigation span');
            this.previous = this.element.find('.navigation a.previous');
            this.next = this.element.find('.navigation a.next');

            this.element.find('.navigation a.products').click(function(event) {
                event.preventDefault();
                if (widget.products.length > 0) {
                    widget.list(widget.products, true);
                }
                $(event.target).blur();
            });

            this.element.find('.navigation a.search').click(function(event) {
                event.preventDefault(); widget.search(); $(event.target).blur();
            });

            // the thing
            var timeout = 600000;
            setTimeout(function(){
                widget.update(); setTimeout(arguments.callee, timeout);
            }, timeout);
        },

        expose: function(widget) {
            for (var i in this.widgets) {
                if (this.widgets.hasOwnProperty(i)) {
                    this.widgets[i].element.hide();
                }
            }
            widget.show();
        },

        search: function() {
            this.expose(this.widgets.search);
        },

        list: function(products, home) {
            this.expose(this.widgets.explorer);
            this.widgets.explorer.products(products, home);
        },

        parse: function(response) {
            var products = [];
            $.each(response.products, function(i, p) {
                var product = {name: p.nombre_producto, id: p.id_producto};
                product.price = p.precio_actual ? p.precio_actual : p.precio_msrp;
                product.active = p.activo;
                products.push(product);
            });
            return products;
        },

        load: function() {
            var total = System.Gadget.Settings.read('products'), products = [];
            for (var i = 1; i <= total; i++) {
                products.push(JSON.parse(System.Gadget.Settings.read('product-' + i)));
            }
            return products;
        },

        save: function() {
            var total = this.products.length;
            for (var i = 1; i <= total; i++) {
                System.Gadget.Settings.write('product-' + i, JSON.stringify(this.products[i-1]));
            }
            System.Gadget.Settings.write('products', total);
        },

        add: function(product) {
            product.index = this.products.length + 1;
            this.products.push(product);
            this.save();
        },

        remove: function(product) {
            this.products.splice(product.index-1, 1);
            this.save();
        },

        replace: function(o, n) {
            n.index = o.index;
            this.products.splice(o.index-1, 1, n);
            this.widgets.explorer.replace(n);
            this.save();
        },

        update: function() {
            var widget = this, total = this.products.length, info;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    widget.fetch(this.products[i], i);
                }
            }
        },

        fetch: function(product, i) {
            var widget = this;
            setTimeout(function(){
                $.ajax({
                    url: 'http://www.kactoos.com/api/products/get-product-list/format/json/',
                    data: {
                        appName: appname,
                        apiKey: apikey,
                        idProduct: product.id
                    },
                    success: function(response) {
                        var list, updated;
                        if (typeof response.products !== 'undefined') {
                            list = kactoos.parse(response);
                            if (list.length > 0) {
                                updated = list[0];
                                if (product.price != updated.price) {
                                    widget.replace(product, updated);
                                }
                            }
                        }
                    }
                });
            }, i*2000);
        }
    };

    $.fn.Kactoos = function() {
        return new Kactoos(this);
    }


    /**
     * Kactoos Search - A widget to search Kactoos products */
    KactoosSearch = function(element) {
        this.element = $(element);
        this.init();
    };

    KactoosSearch.prototype = {
        active: false,
        init: function() {
            this.form = this.element.find('form');
            this.field = this.element.find('input').val('');

            var widget = this;

            this.form.submit(function(event) {
                event.preventDefault();
                var value = widget.field.val();

                if (value.length == 0) {return;}

                $.ajax({
                    url: 'http://www.kactoos.com/api/products/get-product-list/format/json/',
                    data: {
                        appName: 'wvega',
                        apiKey: 'hjlll23w24edjj34rdw4eds',
                        search: value
                    },
                    success: function(response) {
                        if (typeof response.products !== 'undefined') {
                            kactoos.list(kactoos.parse(response), false);
                        }
                    }
                });
            });
        }, 
        
        show: function() {
            kactoos.previous.addClass('next-disabled');
            kactoos.next.addClass('next-disabled');
            this.element.fadeIn();
            this.active = true;
        },

        hide: function() {
            this.element.hide();
            this.active = false;
        }
    }

    $.fn.KactoosSearch = function() {
        return new KactoosSearch(this);
    };



    /**
     * Kactoos Explorer - A widget to navigate through a list of products */
    KactoosExplorer = function(element) {
        this.element = $(element);
        this.init();
    };

    KactoosExplorer.prototype = {
        active: false,
        home: false,
        size: 148,
        init: function() {
            this.list = this.element.find('ul.products-list');
            this.blueprint = this.list.find('li.blueprint').removeClass('blueprint').remove();
            this.page = 1;
            
            var widget = this;

            this.element.delegate('ul.products-list li', 'hover', function(event) {
               $(this).toggleClass('hover');
            }).delegate('ul.products-list li a.star', 'click', function(event) {
                event.preventDefault();
                var link = $(this), li = link.closest('li');
                if (li.hasClass('starred')) {
                    kactoos.remove(li.data('product'));
                    li.remove();
                } else {
                    kactoos.add(li.data('product'));
                    li.addClass('starred-in-search');
                }
            });

            this.element.find('.navigation').delegate('a', 'click', function(event) {
                event.preventDefault();
                var link = $(event.target);
                if (link.hasClass('previous')) {
                    widget.move('previous');
                    link.blur();
                } else if (link.hasClass('next')) {
                    widget.move('next');
                    link.blur();
                }
            });
        },
        
        show: function() {
            kactoos.previous.removeClass('next-disabled');
            kactoos.next.removeClass('next-disabled');
            this.element.fadeIn();
            this.active = true;
        },

        hide: function() {
            this.element.hide();
            this.active = false;
        },

        products: function(products, home) {
            var widget = this, list = this.list.empty(), item;

            // set up navigation
            this.pages = Math.ceil(products.length / 4);
            //kactoos.label.text('' + (((this.page - 1) * 4) + 1) + ' al ' + (this.page * 4) + ' de ' + products.length);
            kactoos.label.text(' ' + this.page + ' de ' + this.pages + ' ');

            if (this.pages == 1) {
                kactoos.previous.addClass('previous-disabled');
                kactoos.next.addClass('next-disabled');
            } else {
                kactoos.previous.removeClass('previous-disabled');
                kactoos.next.removeClass('next-disabled');
            }

            // create products list
            $.each(products, function(i, product){
                item = widget.blueprint.clone();
                item.addClass(product.active ? 'active' : 'inactive');
                item.addClass(product.index ? 'starred' : 'x');
                item.find('span.name').text(widget.trim(product.name));
                item.find('span.price').text(widget.format(product.price));
                item.find('a.star').attr('title', product.index ? 'Dejar de observar este producto' : 'Observar este producto');
                item.data('product', product);
                list.append(item);
            });

            this.home = home; this.page = 1;
        },

        categories: function(categories) {},

        replace: function(product) {
            // only replace items when viewing wathced products
            if (!this.home) { return; }
            
            var widget = this, list = this.list, p, item, li;
            this.list.find('li').each(function(i, element) {
                li = $(element); p = li.data('product');
                if (p.id == product.id) {
                    item = widget.blueprint.clone();
                    item.addClass('highlight');
                    item.addClass(product.active ? 'active' : 'inactive');
                    item.addClass(product.index ? 'starred' : 'x');
                    item.find('span.name').text(widget.trim(product.name));
                    item.find('span.price').text(widget.format(product.price));
                    item.find('a.star').attr('title', product.index ? 'Dejar de observar este producto' : 'Observar este producto');
                    item.data('product', product);
                    // un-highlight
                    item.one('mouseover', function() { item.removeClass('highlight'); });
                    li.replaceWith(item);
                }
            });
        },

        move: function(direction) {
            if (direction == 'previous') {
                this.page = this.page > 1 ? this.page - 1 : this.pages;
            } else {
                this.page = this.page == this.pages ? 1 : this.page + 1;
            }
            this.list.animate({top: (-1 * this.size * (this.page - 1)) + 'px'}, 0);
            kactoos.label.text(' ' + this.page + ' de ' + this.pages + ' ');
        },

        trim: function(text) {
            var trim = text;
            if (text.length > 47) {
                trim = $.trim(text.substr(0, 40)) + '...';
            }
            return trim;
        },

        regexp: /([0-9])([0-9][0-9][0-9](\.|$))/,
        format: function(price) {
            var p = (""+price+""), pos = p.search(this.regexp);
            while (pos != -1) {
                p = p.substring(0, pos + 1) + '.' + p.substring(pos + 1);
                pos = p.search(this.regexp);
            }
            return '$ ' + p;
        }
    };

    $.fn.KactoosExplorer = function() {
        return new KactoosExplorer(this);
    }

    // Let the show begin!
    $(function(){ kactoos = $('#content').Kactoos(); kactoos.search(); });
    
})(jQuery);