/*
 * $.presentation
 *
 * version 0.1.0 (2010/05/23)
 * Copyright (c) 2010 Takeshi Takatsudo (takazudo[at]gmail.com)
 * MIT license
 * http://code.google.com/p/jquery-presentation/
 *
=============================================================================
 depends on
-----------------------------------------------------------------------------
 * jQuery 1.4.2
 */

(function($){ // start $=jQuery encapsulation

/**
 * $.presentation
 */

// namespace
$.presentation = {};

// setup
$(function(){
	$.presentation.pageNum =
		new $.presentation.PageNum;
	$.presentation.slideManager = 
		new $.presentation.SlideManager;
	$.presentation.hook =
		new $.presentation.Hook;
});

/**
 * $.presentation.SlideManager
 */
$.presentation.SlideManager = function(){
	this._current = null;
	this._items = [];
	this._createItems();
	this._initPosClass();
	this._eventify();
	this._transitionize();
};
$.presentation.SlideManager.prototype = {
	_createItems: function(){
		var self = this;
		$('.mod-page').each(function(){
			var item = self.add(this);
			if(item.element.hasClass('first')){
				self._current = item;
			}
		});
		if(!self._current){
			self._current = self._items[0];
		}
	},
	_initPosClass: function(){
		var found = false;
		var self = this;
		var num = 0;
		var items = self._items;
		$.each(items, function(i,item){
			if(item===self._current){
				item.center();
				found = true;
				num = i;
			}else{
				found ? item.right() : item.left();
			}
		});
		$.presentation.pageNum.current(num+1);
	},
	_eventify: function(){
		var self = this;
		$('#pager-L').click(function(e){
			e.preventDefault();
			self.prev();
		});
		$('#pager-R').click(function(e){
			e.preventDefault();
			self.next();
		});
		/* Home - to the first page */
		$.keyDownObserver.observe({ key: 36, fn: $.proxy(self.first, self) });
		/* End - to the last page */
		$.keyDownObserver.observe({ key: 35, fn: $.proxy(self.last, self) });
		/* up/left arrow, PgUp - to the previous page */
//		$.keyDownObserver.observe({ key: 33, fn: $.proxy(self.prev, self) });
		$.keyDownObserver.observe({ key: 90, fn: $.proxy(self.prev_1, self) });
		$.keyDownObserver.observe({ key: 37, fn: $.proxy(self.prev_1, self) });
		$.keyDownObserver.observe({ key: 38, fn: $.proxy(self.prev_10, self) });
		/* down/right arrow, PgDn - to the next page */
//		$.keyDownObserver.observe({ key: 34, fn: $.proxy(self.next, self) });
		$.keyDownObserver.observe({ key: 88, fn: $.proxy(self.next_1, self) });
		$.keyDownObserver.observe({ key: 39, fn: $.proxy(self.next_1, self) });
		$.keyDownObserver.observe({ key: 40, fn: $.proxy(self.next_10, self) });
		$.keyDownObserver.start();
	},
	_transitionize: function(){
		// don't allow first transition animation
		var items = this._items;
		setTimeout(function(){
			$.each(items, function(){
				this.transitionize();
			});
		},10);
	},
	_findNextOf: function(item){
		var res = null;
		var items = this._items;
		$.each(this._items, function(i,current){
			if(item===current){
				res = items[i+1] || null;
				return false;
			}
		});
		return res;
	},
	_findPrevOf: function(item){
		var res = null;
		var items = this._items;
		$.each(this._items, function(i,current){
			if(item===current){
				res = items[i-1] || null;
				return false;
			}
		});
		return res;
	},
	add: function(element){
		var item = new $.presentation.SlideManager.Item(element);
		this._items.push(item);
		$.presentation.pageNum.increaseTotal();
		return item;
	},
	next: function(){
		var current = this._current;
		var next = this._findNextOf(current);
		if(!next){
			return null;
		}
		current.left();
		next.center();
		this._current = next;
		$.presentation.pageNum.increase();
		return next;
	},
	next_1: function(){
		var next = this.next();
		$.presentation.hook.page(next, $.presentation.pageNum._currentNum);
	},
	next_10: function(){
		var res = true;
		var cnt = 0;
		while(cnt++ < 10 && res){ res = this.next(); }
		$.presentation.hook.page(res, $.presentation.pageNum._currentNum);
	},
	prev: function(){
		var current = this._current;
		var prev = this._findPrevOf(current);
		if(!prev){
			return null;
		}
		current.right();
		prev.center();
		this._current = prev;
		$.presentation.pageNum.decrease();
		return prev;
	},
	prev_1: function(){
		var prev = this.prev();
		$.presentation.hook.page(prev, $.presentation.pageNum._currentNum);
	},
	prev_10: function(){
		var res = true;
		var cnt = 0;
		while(cnt++ < 10 && res){ res = this.prev(); }
		$.presentation.hook.page(res, $.presentation.pageNum._currentNum);
	},
	first: function(){
		var res = true;
		while(res){ res = this.prev(); }
		$.presentation.hook.page(res, $.presentation.pageNum._currentNum);
	},
	last: function(){
		var res = true;
		while(res){ res = this.next(); }
		$.presentation.hook.page(res, $.presentation.pageNum._currentNum);
	}
};

/**
 * $.presentation.SlideManager.Item
 */
$.presentation.SlideManager.Item = function(element){
	this.element = $(element);
};
$.presentation.SlideManager.Item.prototype = {
	transitionize: function(){
		this.element.
			addClass('transition');
	},
	left: function(){
		this.element.
			removeClass('center onView right').
			addClass('left');
	},
	center: function(){
		this.element.
			removeClass('left right').
			addClass('center onView');
	},
	right: function(){
		this.element.
			removeClass('center onView left').
			addClass('right');
	}
};

/**
 * $.keyDownObserver
 */
$.keyDownObserver = new function(){
	this._started = false;
	this._lastKey = null;
	this._items = [];
	this._find = function(key){
		var res = $.noop;
		$.each(this._items, function(){
			if(this.key === key){
				res = this.fn;
			}
		});
		return res;
	}
	this.start = function(){
		var self = this;
		if(this._started){
			return;
		}
		$($.browser.msie ? 'body' : window).keydown(function(e){
			self._find(e.keyCode)();
		});
	};
	this.observe = function(options){
		var item = {
			key: options.key,
			fn: options.fn
		};
		this._items.push(item);
		return item;
	};
};

/**
 * $.presentation.PageNum
 */
$.presentation.PageNum = function(){
	this.elements = {
		current: $('#pageNum-current'),
		total: $('#pageNum-total')
	};
	this._currentNum = 0;
	this._totalNum = 0;
};
$.presentation.PageNum.prototype = {
	increaseTotal: function(){
		this._totalNum++;
		this.elements.total.text(this._totalNum);
	},
	current: function(num){
		this._currentNum = num;
		this.elements.current.text(num);
	},
	increase: function(){
		this._currentNum++;
		this.elements.current.text(this._currentNum);
	},
	decrease: function(num){
		this._currentNum--;
		this.elements.current.text(this._currentNum);
	}
};

$.presentation.Hook = function(){
	this._browse_width;
	this._browse_height;
	this._keep = {};
};
$.presentation.Hook.prototype = {
	_init: function(){
		this._browse_width = $(window).width();
		this._browse_height = $(window).height();
	},
	page: function(object, page_num){
		object.element.parent().find('div.mod-page > div > img').each(function(){
			console.log($(this).remove());
		});
		var div = object.element.children('div');
		var _this = this;
		var _img = document.createElement('img');
		_img.src = image[page_num - 1].p;
		if (0 < image[page_num - 1].w && 0 < image[page_num - 1].h) {
			if ($.presentation.hook._browse_width / $.presentation.hook._browse_height > image[page_num - 1].w / image[page_num - 1].h) {
				_img.height = _this._browse_height;
				_img.width = (_this._browse_height * image[page_num - 1].w / image[page_num - 1].h);
			} else {
				_img.width = _this._browse_width;
				_img.height = (_this._browse_width * image[page_num - 1].h / image[page_num - 1].w);
			}
		}
		div.append(_img);
	},
};

})(jQuery); // end $=jQuery encapsulation
