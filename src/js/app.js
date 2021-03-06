/*---------------------------------------
* Requires and variables
* ---------------------------------------*/

// electron
const request = require('request');
const electron = require('electron');
const shell = electron.shell;
const {ipcRenderer} = electron;
const {remote} = require('electron');
let win = remote.getCurrentWindow();
// application
const imgUrlSmall = '<img src="https://files.coinmarketcap.com/static/img/coins_legacy/16x16/';
const imgUrlMedium = '<img src="https://files.coinmarketcap.com/static/img/coins_legacy/32x32/';
const imgUrlLarge = '<img src="https://files.coinmarketcap.com/static/img/coins_legacy/64x64/';
const imgUrlEnd = '.png">';
const oSlider = $('#oSlider');
let popList, searchContainer = [];
let rank, id, name, symbol, price, priceBtc, volume, mcap, perChange, per1h, availSup, totalSup, check, selectedCoin, btcPrice, text;
let clickedValue = 'Bitcoin';
let currency = ' USD';
let currencyBtc = ' BTC';
let cMode = false;

/*---------------------------------------
* Start initial code/call funcs and reqs
* ---------------------------------------*/

// wait for an updateReady message
ipcRenderer.on('updateReady', function(event, text) {
    $('.update-btn').css('visibility', 'visible');
});

// when update ready and btn clicked, send a quitAndInstall message to main process
$('.update-btn').on('click', function() {
    ipcRenderer.send('quitAndInstall');
});

// force resziable option off
win.setResizable(false);

// minimize, close, refresh app
$('.fa-minus').on('click', function() {
    win.minimize();
});

$('.mClose').on('click', function() {
    win.close();
});

// open refresh overlay and disable icon
$('.fa-sync').on('click', function() {
    errReOverlay('.a4', 0);
    $('.fa-sync, .fa-cog, .fa-info-circle').css('display', 'none');
});

// toggle volume/supply on click
$('.row2 p, .row2 span').on('click', function() {
    toggleN('supply');
});

// toggle usd/btc on click 
$('.coin-price, .coin-price-btc, .currency-small, .currency-small-btc, .percent-change, .percent-time').on('click', function() {
    toggleN('btcprice');
});

// search on key up
$('#search-input').keyup(function() {
    searchList();
});

// remove input validation popup
$('#search-input').removeAttr('required');

// show/hide .search list
$('#search-input').focus(function() {
    $('.search, .search-close').show();
    $('.compact-btn').hide();
    $('.main-container').css('height', '626px');
    win.setSize(400, 626);
});

// check theme switch, toggle dark/light mode
$('#switch1').click(function() {
    if($('body').hasClass('dark-mode')) {
        $('body').removeClass('dark-mode');
        $('body').addClass('light-mode');
        resetOpacity('light');
    } else {
        $('body').removeClass('light-mode');
        $('body').addClass('dark-mode');
        resetOpacity('dark');
    }
});

// focus action for satoshi convert
$('#convert-input').focus(function() {
    $(this).css('border-bottom', 'solid 1px var(--colored-elements)');
    $(this).removeAttr('placeholder');
});

$('#convert-input').focusout(function() {
    $(this).css('border-bottom', 'solid 1px var(--main-text)');
    $(this).attr('placeholder');
});

// swap conversion
$('.fa-long-arrow-right').on('click', function() {
    toggleN('convert');
    $('#convert-input').val("");
    $('#convert-display').text("0.00000000");
    $('#convert-input').focus();
});

// clear search
$('.search-close').on('click', function() {
    clearSearch();
    $('.compact-btn').show();  
});

// compact mode
$('.compact-btn').on('click', function() {
    cMode = true;
    compactMode();
});

$('.expand-btn').on('click', function() {
    cMode = false;
    compactMode();
});

// open about links in users default browser
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

// call funcs
firstCall(); 
errReBtns();
showOverlays('.fa-cog', '.a2', 300);
showOverlays('.fa-info-circle', '.a3', 300);
donate();
satoshiUSD('sat');
opacity();
searchPlaceholder();
dynamicHover('a');
dynamicHover('.fa-sync');
dynamicHover('.expand-btn');
dynamicHover('.compact-btn');

/*---------------------------------------
* Functions
* ---------------------------------------*/

// make initial api call to fill out values
function firstCall() {
    request.get('https://api.coinmarketcap.com/v1/ticker/?limit=0', (error, response, body) => {
        if(!error && response.statusCode == 200) {
            popList = JSON.parse(body);
            populateData();
            mainInfo(popList);
            getListValue();
            btcPrice = price;
            secondCall();
        } else {
        // show error overlay
        cMode = false;
        compactMode();
        clearSearch();
        $('.fa-sync, .fa-cog, .fa-info-circle').css('display', 'none');
        $('.err-span').text(error);
        errReOverlay('.a1', 0);
        }
    });
}

// keep popList array updated every 3min
function secondCall() {
    setInterval(() => {
        request.get('https://api.coinmarketcap.com/v1/ticker/?limit=0', (error, response, body) => {
            if(!error && response.statusCode == 200) {
                popList.length = 0;
                try {
                    popList = JSON.parse(body);
                } catch(e) {
                    console.log('Caught: ' + e.message);
                }
                populateData();
                getListValue();
                refreshMain();
                console.log('Completed: [secondCall()]');
            } else {
                // show error overlay
                cMode = false;
                compactMode();
                clearSearch();
                $('.fa-sync, .fa-cog, .fa-info-circle').css('display', 'none');
                $('.err-span').text(error);
                errReOverlay('.a1', 0);
            }
        });
    }, 90000);
}

// compact mode 
function compactMode() {
    if(!cMode) {
        $('.row-menu, .row2, .row3').show();
        $('.expand-btn').hide();
        $('.logo-small, .cInfo-small').addClass('hide');
        $('.logo-large, .cInfo-large').removeClass('hide');
        $('.main-container').css({'width': '400', 'height': '200'});
        win.setSize(400,200);
        $('.main-container').removeClass('drag');
        $('.coin-picture').html(imgUrlLarge + id + imgUrlEnd);
        $('.coin-name').html(name + ' ' + '(' + symbol + ')'); 
    } else {
        $('.row-menu, .row2, .row3').hide();
        $('.expand-btn').show();
        $('.logo-large, .cInfo-large').addClass('hide');
        $('.logo-small, .cInfo-small').removeClass('hide');
        $('.logo-small').css('padding-left', '5px');
        $('.cInfo-small h2').css({'font-size': '1em', 'margin': '15px 0 0 0'});
        $('.main-container').css({'width': '320', 'height': '60' });
        win.setSize(320, 60);
        $('.main-container').addClass('drag');
        $('.coin-picture').html(imgUrlMedium + id + imgUrlEnd);
        $('.coin-name').html(symbol);
    }
}

// pull info for main screen
function mainInfo(arr) {
    assignCoinData(arr[0]);
    fillMain();
}

// assign data to coin variables
function assignCoinData(param) {
    [name, id, symbol, price, rank, volume, mcap, perChange, per1h, availSup, totalSup, priceBtc] = [
        param["name"], param["id"], param["symbol"], param["price_usd"],
        param["rank"], nFormat('$', param["24h_volume_usd"]), nFormat('$', param["market_cap_usd"]), 
        Math.sign(Number(param["percent_change_1h"])), param["percent_change_1h"], nFormat("", param["available_supply"]),
        nFormat("", param["total_supply"]), param["price_btc"]
    ];
}

// fill main screen
function fillMain() {
    $('.coin-picture, .coin-name, .coin-rank, .coin-volume, .coin-mcap, .currency-small, .currency-small-2').fadeOut('fast', function() {
        if(!cMode) {
            $('.coin-picture').html(imgUrlLarge + id + imgUrlEnd).fadeIn('fast');
            $('.coin-name').html(name + ' ' + '(' + symbol + ')').fadeIn('fast');
        } else {
            $('.coin-picture').html(imgUrlMedium + id + imgUrlEnd).fadeIn('fast');
            $('.coin-name').html(symbol).fadeIn('fast');
        } 
        $('.coin-rank').html(rank).fadeIn('fast');
        $('.coin-mcap').html(mcap).fadeIn('fast');
        $('.coin-volume').html(volume).fadeIn('fast');
        $('.currency-small').text(currency).fadeIn('fast');
        $('.currency-small-2').text(currency).fadeIn('fast');
        $('.currency-small-btc').text(currencyBtc).fadeIn('fast'); 
        $('.coin-asup').html(availSup).fadeIn('fast');
        $('.coin-tsup').html(totalSup).fadeIn('fast'); 
        $('.symbol-small').text(' ' + symbol).fadeIn('fast');
    });
    fillPricePercent(1, '#25DAA5');
    fillPricePercent(-1, 'rgb(245, 56, 103)'); 
    fillPricePercent(0, 'rgba(255, 255, 255, 0.75)');
}

// populate search list
function populateData() {
    $('.search-table').empty();
    for(var i = 0; i < popList.length; i++) {
        rank = popList[i]["rank"];
        id = popList[i]["id"];
        name = popList[i]["name"];
        symbol = popList[i]["symbol"];
        generateDiv();
    }
}

// generate div for search list
function generateDiv() {
    $('.search-table').append('<tr class="row"><td class="list-rank">' + rank + '</td><td class="list-image">' + imgUrlSmall + id + imgUrlEnd + '</td><td class="listDiv"><a href="#">' + 
    name + '</a> (' + symbol + ')</td></tr>');
}

// get clicked value from list and call refresh
function getListValue() {
    $(".search a").on("click", (el) => {
        clickedValue = $(el.target).text();
        console.log('Selected value: ' + '[' + clickedValue + ']');
        refreshMain();
        clearSearch();
        $('.compact-btn').show();           
    });
}

// update main screen from list click
function refreshMain() {
    let obj = searchArr(clickedValue, popList);
    assignCoinData(obj);
    fillMain();
}

// check 1h percent change and fill info/change color
function fillPricePercent(change, color) {
    if(perChange === change) {
        $('.coin-price, .coin-price-btc, .percent-change, .percent-time').fadeOut('fast', function() {
            $('.coin-price').text('$' + price).fadeIn('fast');
            $('.coin-price-btc').text(priceBtc).fadeIn('fast');
            $('.percent-change').text('(' + per1h + '%)').fadeIn('fast');
            $('.percent-time').text('1hr').fadeIn('fast');
            $('.coin-price, .coin-price-btc, .percent-change').css('color', color);
        });     
    }   
}

// handle overlays for settings/about
function showOverlays(icon, overlay, speed) {
    let x = false;
    $(icon).on('click', function() {
        if(!x) {
            $('.row1, .row2, .row3').toggleClass('hide-main');
            if(overlay === '.a2') {
                $('.fa-info-circle, .fa-sync').css('opacity', '0');
                $('.fa-info-circle, .fa-sync').css('z-index', '-1');
                $('#convert-input').focus();
            } else if(overlay === '.a3') {
                $('.fa-cog, .fa-sync').css('opacity', '0');
                $('.fa-cog, .fa-sync').css('z-index', '-1');              
            }
            $(overlay).stop().animate({
                left: 0
            }, speed, function() {
                $('.main-container').css('height', '200px');
                win.setSize(400, 200);
            });
            x = true;
        } else {
            $('.row1, .row2, .row3').toggleClass('hide-main');
            if(overlay === '.a2') {
                $('.fa-info-circle, .fa-sync').css('opacity', '1');
                $('.fa-info-circle, .fa-sync').css('z-index', '1');
                $('#convert-input').val("");
                $('#convert-display').text("0.00000000");
            } else if(overlay === '.a3') {
                $('.fa-cog, .fa-sync').css('opacity', '1');
                $('.fa-cog, .fa-sync').css('z-index', '1');
            }
            $(overlay).stop().animate({
                left: -401
            }, speed, function() {
                clearSearch();
            });
            x = false;
        }
    });
}

// show/hide error/refresh overlay
function errReOverlay(overlay, value, id) {
    $('.row1, .row2, .row3').toggleClass('hide');
    $(overlay).stop().animate({
        left: value
    }, 300, function() {
        $('.main-container').css('height', '200px');
        win.setSize(400, 200);
        clearSearch();
        if(overlay === '.a1' && value === -401) {
            $('.err-span').text("");
            $('.row1, .row2, .row3').hide();
            win.reload();
        } else if(overlay === '.a4' && value === -401 && id === 'refresh-btn') {
            win.reload();
        }
    });
}

// error/refresh overlay button action 
function errReBtns() {
    $('#err-btn, #refresh-btn, #back-btn').on('click', function() {
        if(this.id == 'err-btn') {
            $('.fa-sync, .fa-cog, .fa-info-circle').css('display', 'inline-block');
            errReOverlay('.a1', -401);
        } else if(this.id == 'refresh-btn') {
            let clicked = this.id;
            errReOverlay('.a4', -401, clicked);
            $('.fa-sync, .fa-cog, .fa-info-circle').css('display', 'inline-block');
        } else if(this.id == 'back-btn') {
            errReOverlay('.a4', -401);
            $('.fa-sync, .fa-cog, .fa-info-circle').css('display', 'inline-block');
        }
        
    });
}

// search coins based on clicked value and return coin obj
function searchArr(val, arr) {
    for(var i = 0; i < arr.length; i++) {
        if(arr[i].name === val) {
            return arr[i];
        }
    }
}

// format large numbers to easier to read format
function nFormat(curr, num) {
    if(Number(num) > 999999999) {
        return curr + (num/1000000000).toFixed(2) + 'B';
    } else if(Number(num) > 999999) {
        return curr + (num/1000000).toFixed(2) + 'M';
    } else if(Number(num) > 999) {
        return curr + (num/1000).toFixed(2) + 'K';
    } else {
        return num;
    }
}

// toggle bewtween displaying volume/marketcap or avail/total supply on main
function toggleN(param) {
    if(param === 'supply') {
        $('.div-volume, .div-mcap, .div-asup, .div-tsup').toggleClass('hide');
    } else if(param === 'btcprice') {
        $('.coin-price, .currency-small, .coin-price-btc, .currency-small-btc').toggleClass('hide');
    } else if(param === 'convert') {
        $('.satoshi h3').toggleClass('hide');
        if($('.conversion-title').hasClass('hide')) {
            satoshiUSD('usd');
        } else {
            satoshiUSD('sat');
        }
    }  
}

// filter search 
function searchList() {
    var search = $('#search-input').val().toUpperCase();
    $('.search .row').each(function() {
        text = $(this).text().toUpperCase();
        if(text.indexOf(search) > -1 || search == "") {
            $(this).css("display", "table-row");
        } else {
            $(this).css("display", "none");
        }
    });   
}

// convert satoshi -> usd & usd -> btc
function satoshiUSD(val) {
    $('#convert-input').bind('input', function() {
        x = $('#convert-input').val().toString().replace(/\,/g,'');
        if(x >= 1000) {
            y = x.toString().split(".");
            y[0] = y[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
            z = y.join('.');
            $('#convert-input').val(y);
        }
        if(isNaN(x * 2)) {
            $('#convert-display').text(0);
            console.log('nan error');
        } else {
            $.get("http://api.coindesk.com/v1/bpi/currentprice.json", function(data) {
                var body = JSON.parse(data);
                if(val === 'sat') {
                    var btcPrice = x * body.bpi.USD.rate.replace(/\,/g,'');
                    var satUSD = (btcPrice * .00000001);
                } else if(val === 'usd') {
                    var btcPrice = x / body.bpi.USD.rate.replace(/\,/g,'');
                    var satUSD = btcPrice;
                }
                a = (satUSD).toFixed(8);
                b = a.toString().split(".");
                b[0] = b[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
                c = b.join('.');
                $('#convert-display').text(c);
            });
        }
    });
}

// opacity slider
function opacity() {
    oSlider.on('input', function() {
        if($('body').hasClass('dark-mode')) {
            $('.main-container').css("background", "rgba(38, 44, 51, " + $(this).val() + ")");
        } else if($('body').hasClass('light-mode')) {
            $('.main-container').css("background", "rgba(206, 214, 224, " + $(this).val() + ")");
        }
    });
}

// reset opacity on theme change
function resetOpacity(theme) {
    if(theme === 'dark') {
        $('.main-container').css("background", "rgba(38, 44, 51, " + $('#oSlider').val() + ")");
    } else if(theme === 'light') {
        $('.main-container').css("background", "rgba(206, 214, 224, " + $('#oSlider').val() + ")");
    }   
}

// donate info
function donate() {
    $('.donate-list').change(function() {
        let value = $(this).val();
        if(value === "btc") {
            $('.qrcode').attr('src', 'src/img/btc-qr.png');
            $('.donate-address span').text('15As8L4n1Z2oyw9UfsTpfC4KR9Q7h8eUNL');
        } else if(value === "eth") {
            $('.qrcode').attr('src', 'src/img/eth-qr.png');
            $('.donate-address span').text('0x015f4ca16753e7De0d042dc4E0E06F8b09585834');
        } else if(value === "ltc") {
            $('.qrcode').attr('src', 'src/img/ltc-qr.png');
            $('.donate-address span').text('LbpJYgkeAme2ca2pGFuP1dF8AioSKKErTG');
        }
    });
}

// clear #search-input val
function clearSearch() {
    $('#search-input').val("");
    $('.search .row').each(function() {
        $(this).css("display", "table-row");
     });
     $('.search, .search-close').hide();
     $('.fa-compress').show();
     $('.main-container').css('height', '200px');
    // win.setSize(400, 200);
}

// show/hide placeholder text for search
function searchPlaceholder() {
    $('#search-input').data('holder', $('#search-input').attr('placeholder'));
        $('#search-input').focusin(function () {
            $(this).attr('placeholder', '');
        });
        $('#search-input').focusout(function () {
            $(this).attr('placeholder', $(this).data('holder'));
    });
}

// prevent hover getting stuck
function dynamicHover(param) {
    $(document).on('mouseenter', param, function() {
        $(this).css('font-weight', '600');
    });
    $(document).on('mouseleave', param, function() {
        $(this).css('font-weight', '200');
    });
}

