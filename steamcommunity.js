var links = $('.gamecards_inventorylink');
var cards = [];
var appid = 0;

if(links && $('.unowned').length > 0) {
	links.append('<button type="button" class="btn_grey_grey btn_small_thin" id="buycards"><span>Buy remaining cards from Market</span></button');
	$('#buycards').click(function() {
		$('#buycards').hide();
		$('.gamecards_inventorylink').append('<div id="buycardspanel" style="display: none; margin-top: 5px"></div>');
		
		var cards = $('.unowned a');
		var increment = 1;
		if(cards.length == 0) {
			cards = $('.unowned .badge_card_set_text');
			increment = 2; // skip every other one since it's a series number
		}
		
		var parts = window.location.href.split('/');
		appid = parts[parts.length - 1];
		if(appid == '' || appid.indexOf('?border=') != -1) {
			appid = parts[parts.length - 2];
		}
		
		for(var i = 0; i < cards.length; i += increment) { // skip every other one since it's a series number
			var card = $(cards[i]);
			var name = $.trim(card.html().replace('<div style="clear: right"></div>', ''));
			$('#buycardspanel').append('<span class="cardname"><b>' + name + '</b></span> - <span class="cardprice" id="Price-' + name2id(name).replace(/"/g, '&quot;') + '">Loading...</span>' + '<br />');
			console.log('Loading: ' + '/market/listings/753/' + appid + '-' + encodeURIComponent(name + ((window.location.href.indexOf('?border=1') != -1) ? ' (Foil)' : '')));
			$.get('/market/listings/753/' + appid + '-' + encodeURIComponent(name + ((window.location.href.indexOf('?border=1') != -1) ? ' (Foil)' : '')), onCardPriceLoaded)
				.fail(function() {
					$("#Price-" + name2id(name)).html('Error');
				});
		}
		
		$('#buycardspanel').show('blind');
	});
}

function onCardPriceLoaded(data, textStatus) {
	var html = $('<div></div>');
	html.append($(data));
	
	var title = html.find('title').text();
	var name = title.substring(title.indexOf('-') + 1);
	
	if(data.indexOf('There are no listings for this item.') != -1 && name.indexOf('(Trading Card)') == -1 && name.indexOf('(Foil Trading Card)') == -1) {
		$.get('/market/listings/753/' + title.substring(title.indexOf('Listings for') + 13, title.indexOf('-')) + '-' + name + ' (' + ((window.location.href.indexOf('?border=1') != -1) ? 'Foil ' : '') + 'Trading Card)', onCardPriceLoaded)
			.fail(function() {
				$("#Price-" + name2id(name)).html('Error');
			});
		return;
	}
	
	name = name.replace(' (Trading Card)', '').replace(' (Foil Trading Card)', '').replace(' (Foil)', '');
	
	var item = findElementByClass(html, 'div', 'market_listing_row');
	var price = findElementByClass($(item), 'span', 'market_listing_price_with_fee');
	var pricenofee = findElementByClass($(item), 'span', 'market_listing_price_without_fee');
	
	if(textStatus != 'success' || !item || !price || !pricenofee) {
		$('#Price-' + name2id(name)).html('Error');
	} else {
		var pos = data.indexOf('g_sessionID = "') + 15;
		var pos2 = data.indexOf('"', pos);
		var sessionID = data.substring(pos, pos2);
		
		var listingID = $(item).attr('id').split('_')[1];
		
		var totalPrice = $.trim($(price).html()).replace('$', '');
		var theirPrice = $.trim($(pricenofee).html()).replace('$', '');
		
		if(totalPrice == 'Sold!') {
			$.get('/market/listings/753/' + title.substring(title.indexOf('Listings for') + 13), onCardPriceLoaded)
				.fail(function() {
					$("#Price-" + name2id(name)).html('Error');
				});
			return;
		}
		
		cards.push({session: sessionID, listing: listingID, total: totalPrice, theirs: theirPrice, element: '#Price-' + name2id(name)});
		
		$('#Price-' + name2id(name)).html('$' + totalPrice);
	}
	
	if(cards.length == $('.cardprice').length) {
		var total = 0;
		for(var i = 0; i < cards.length; i++) {
			total += parseFloat(cards[i].total);
		}
		
		$('#buycardspanel').append('<br /><b>Total: $' + total.toFixed(2) + '</b><br /><br /><button type="button" id="buycardsbutton" class="btn_green_white_innerfade btn_medium_wide" style="padding: 10px 20px 10px 20px">PURCHASE</button>');
		$('#buycardsbutton').click(function() {
			$('#buycardsbutton').hide();
			buyCard();
		});
	}
}

function findElementByClass(dom, element, classname) {
	var items = dom.find(element);
	for(var i = 0; i < items.length; i++) {
		var classes = items[i].className.split(' ');
		for(var j = 0; j < classes.length; j++) {
			if(classes[j] == classname) {
				if((element == 'div' && $(findElementByClass($(items[i]), 'span', 'market_listing_price_with_fee')).html().indexOf('Sold!') == -1) || element != 'div') {
					return items[i];
				}
			}
		}
	}
}

function buyCard() {
	var item = cards[0];
	if(!item) {
		return;
	}
	
	$(item.element)[0].innerHTML += ' - Purchasing...';
	$.post('https://steamcommunity.com/market/buylisting/' + item.listing, {sessionid: item.session, currency: 1, subtotal: Math.round(item.theirs * 100), fee: Math.round((item.total * 100) - (item.theirs * 100)), total: Math.round(item.total * 100)}, function(data, textStatus) {
		if(textStatus != 'success' || !data.wallet_info.success) {
			$(item.element).html('Failure');
		} else {
			$(item.element).html('Purchased');
		}
		
		cards.splice(0, 1);
		if(cards.length > 0) {
			buyCard();
		}
	}).fail(function() {
		$(item.element).html('Failure');
	});
}

function name2id(name) {
	return htmlspecialchars(name.replace(/ /g, '').replace(/:/g, '').replace(/;/g, '').replace(/\./g, '').replace(/'/g, '').replace(/#/g, ''));
}

function htmlspecialchars(string, quote_style, charset, double_encode) {
  // http://kevin.vanzonneveld.net
  // +   original by: Mirek Slugen
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Nathan
  // +   bugfixed by: Arno
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +    bugfixed by: Brett Zamir (http://brett-zamir.me)
  // +      input by: Ratheous
  // +      input by: Mailfaker (http://www.weedem.fr/)
  // +      reimplemented by: Brett Zamir (http://brett-zamir.me)
  // +      input by: felix
  // +    bugfixed by: Brett Zamir (http://brett-zamir.me)
  // %        note 1: charset argument not supported
  // *     example 1: htmlspecialchars("<a href='test'>Test</a>", 'ENT_QUOTES');
  // *     returns 1: '&lt;a href=&#039;test&#039;&gt;Test&lt;/a&gt;'
  // *     example 2: htmlspecialchars("ab\"c'd", ['ENT_NOQUOTES', 'ENT_QUOTES']);
  // *     returns 2: 'ab"c&#039;d'
  // *     example 3: htmlspecialchars("my "&entity;" is still here", null, null, false);
  // *     returns 3: 'my &quot;&entity;&quot; is still here'
  var optTemp = 0,
    i = 0,
    noquotes = false;
  if (typeof quote_style === 'undefined' || quote_style === null) {
    quote_style = 2;
  }
  string = string.toString();
  if (double_encode !== false) { // Put this first to avoid double-encoding
    string = string.replace(/&/g, '&amp;');
  }
  string = string.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  var OPTS = {
    'ENT_NOQUOTES': 0,
    'ENT_HTML_QUOTE_SINGLE': 1,
    'ENT_HTML_QUOTE_DOUBLE': 2,
    'ENT_COMPAT': 2,
    'ENT_QUOTES': 3,
    'ENT_IGNORE': 4
  };
  if (quote_style === 0) {
    noquotes = true;
  }
  if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
    quote_style = [].concat(quote_style);
    for (i = 0; i < quote_style.length; i++) {
      // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
      if (OPTS[quote_style[i]] === 0) {
        noquotes = true;
      }
      else if (OPTS[quote_style[i]]) {
        optTemp = optTemp | OPTS[quote_style[i]];
      }
    }
    quote_style = optTemp;
  }
  if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
    string = string.replace(/'/g, '&#039;');
  }
  if (!noquotes) {
    string = string.replace(/"/g, '&quot;');
  }

  return string;
}