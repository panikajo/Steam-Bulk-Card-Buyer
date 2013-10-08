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
			cards = $('.unowned badge_card_set_text');
			increment = 2; // skip every other one since it's a series number
		}
		
		var parts = window.location.href.split('/');
		appid = parts[parts.length - 1];
		if(appid == '') {
			appid = parts[parts.length - 2];
		}
		
		for(var i = 0; i < cards.length; i += increment) { // skip every other one since it's a series number
			var card = $(cards[i]);
			var name = $.trim(card.html().replace('<div style="clear: right"></div>', ''));
			$('#buycardspanel').append('<span class="cardname"><b>' + name + '</b></span> - <span class="cardprice" id="Price-' + name.replace(/"/g, '&quot;').replace(/ /g, '') + '" data-name="' + name.replace(/"/g, '&quot;') + '">Loading...</span>' + '<br />');
			$.get('/market/listings/753/' + appid + '-' + name, onCardPriceLoaded);
		}
		
		$('#buycardspanel').show('blind');
	});
}

function onCardPriceLoaded(data, textStatus) {
	var html = $('<div></div>');
	html.append($(data));
	
	var title = html.find('title').text();
	var name = title.substring(title.indexOf('-') + 1);
	
	if(data.indexOf('There are no listings for this item.') != -1 && name.indexOf('(Trading Card)') == -1) {
		$.get('/market/listings/753/' + title.substring(title.indexOf('Listings for') + 13, title.indexOf('-')) + '-' + name + ' (Trading Card)', onCardPriceLoaded);
		return;
	}
	
	name = name.replace(' (Trading Card)', '');
	
	var item = findElementByClass(html, 'div', 'market_listing_row');
	var price = findElementByClass($(item), 'span', 'market_listing_price_with_fee');
	var pricenofee = findElementByClass($(item), 'span', 'market_listing_price_without_fee');
	
	if(textStatus != 'success' || !item || !price || !pricenofee) {
		$('#Price-' + name.replace(/ /g, '')).html('Error');
	} else {
		var pos = data.indexOf('g_sessionID = "') + 15;
		var pos2 = data.indexOf('"', pos);
		var sessionID = data.substring(pos, pos2);
		
		var listingID = $(item).attr('id').split('_')[1];
		
		var totalPrice = $.trim($(price).html()).replace('$', '');
		var theirPrice = $.trim($(pricenofee).html()).replace('$', '');
		
		if(totalPrice == 'Sold!') {
			$.get('/market/listings/753/' + title.substring(title.indexOf('Listings for') + 13), onCardPriceLoaded);
			return;
		}
		
		cards.push({session: sessionID, listing: listingID, total: totalPrice, theirs: theirPrice, element: '#Price-' + name.replace(/ /g, '')});
		
		$('#Price-' + name.replace(/ /g, '')).html('$' + totalPrice);
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
			$(item.element).html('Error');
		} else {
			$(item.element).html('Purchased');
		}
		
		cards.splice(0, 1);
		if(cards.length > 0) {
			buyCard();
		}
	});
}