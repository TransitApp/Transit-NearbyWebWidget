var BASE_URL = '/api'
  , noLocationError = 'We weren\'t able to determine your current location';

var context = {}
  , $search, $loading, $routes, $suggestions, $locate, $error
  , delayer;

$(document).ready(function() {
  $search = $('input[name="search"]');
  $loading = $('#loading');
  $routes = $('#routes');
  $suggestions = $('.autocomplete');
  $locate = $('button[name="locate"]');
  $error = $('.error');

  context.filter = $routes.attr('data-filter');
  context.distance = $routes.attr('data-distance') || 500;
  context.latitude = $routes.attr('data-lat');
  context.longitude = $routes.attr('data-lng');
  context.sortByTime = $routes.attr('data-sortByTime');
  setupAutocomplete();

  $locate.on('click', locateClick);
  $routes.on('click', '.route', routeClick);
  $routes.on('mousewheel', catchScroll);

  $('form').submit(false);

  window.onhashchange = hashChanged;
  hashChanged();

  $routes.on('keydown', '[role="tab"]', function(e) {
    var $original = $(this);
    var $prev = $(this).prev();
    var $next = $(this).next();
    var $target;

    switch (e.keyCode) {
      case 37:
        $target = $prev;
        break;
      case 39:
        $target = $next;
        break;
      default:
        $target = false;
        break;
    }

    if ($target.length) {
        $original.attr({
          'tabindex' : '-1',
          'aria-selected' : null
        }).removeClass('active');
        $target.attr({
          'tabindex' : '0',
          'aria-selected' : true
        }).addClass('active').focus();

        $target.parent().find('.content:first').css('margin-left', (($target.index() - 2) * -100) + "%");
        $target.parent().find('> h1 em').html($target.find('h1 em').html());
        $($target.parent().find('.pagination i').removeClass('active').get($target.index() - 2)).addClass('active');
    }
  });
});

function locateClick() {
  if (navigator.geolocation) {
    clearTimeout(context.refresh);
    $locate.addClass('active');
    $loading.fadeIn(250).focus();
    $routes.find('.route').attr('aria-hidden', true);

    navigator.geolocation.getCurrentPosition(function(position) {
      if (position) {
        $search.val('Current location');

        var newHash = createHash(position.coords.latitude, position.coords.longitude);

        if (window.location.hash !== '#' + newHash) {
          window.location.hash = newHash;
        } else {
          $loading.fadeOut(250);
        }
      } else {
        $locate.removeClass('active');
        $loading.fadeOut(250);
      }
    }, function(err) {
      if (err && err.message) {
        $error.fadeIn(250).delay(3000).fadeOut(250).find('p').html(err.message);
      } else {
        $error.fadeIn(250).delay(3000).fadeOut(250).find('p').html(noLocationError);
      }

      $loading.fadeOut(250);
    });
  } else {
    $error.fadeIn(250).delay(3000).fadeOut(250).find('p').html(noLocationError);
  }
}

function routeClick() {
  var $this = $(this)
    , last = $this.find('.content.active')
    , el = last.removeClass('active').next();

  if (!el.length || el.index() <= 1) {
    el = $this.find('.content:first');
  }

  el.addClass('active');
  $this.find('.content:first').css('margin-left', ((el.index() - 2) * -100) + "%");
  $this.find('> h1 em').html(el.find('h1 em').html());
  $($this.find('.pagination i').removeClass('active').get(el.index() - 2)).addClass('active');

  return false;
}

function catchScroll(e) {
  var scroll = $routes.scrollTop()
    , d = e.originalEvent.wheelDeltaY;

  if (d > 0 && scroll === 0) {
    e.preventDefault();
  } else if (d < 0 && (scroll == $routes.get(0).scrollHeight - $routes.innerHeight())) {
    e.preventDefault();
  }
}

function hashChanged() {
  var reg = /(-?\d+\.\d+),(-?\d+\.\d+)\|?([^\|]*)(\|.+)?/g
    , parts;

  if (window.location.hash) {
    parts = reg.exec(unescape(window.location.hash));

    context.latitude = parts[1];
    context.longitude = parts[2];

    $search.val(parts[3]);

    context.autoScroll = 0;
    context.autoCarousel = 0;
    context.staticDirection = -1;

    if (parts.length > 3) {
      var paramReg = /\|([^=]+)=([^|]+)/gim,
        match;

      while ((match = paramReg.exec(parts[4]))) {
        switch (match[1]) {
          case 'distance':
          case 'autoScroll':
          case 'autoCarousel':
          case 'staticDirection':
          case 'sortByTime':
            context[match[1]] = parseInt(match[2]);
            break;
        }
      }
    }

    toggleScrolling(context);
    toggleCarousel(context);
  } else if (!context.latitude || !context.longitude) {
    context.latitude = 45.51485;
    context.longitude = -73.55965;
  }

  loadNearby(context.latitude, context.longitude);
}

function toggleScrolling(context) {
  if (context.autoScroll) {
    $routes.animate({
      scrollTop: $routes.get(0).scrollHeight
    }, context.autoScroll * 1000, function() {
      $routes.animate({
        scrollTop: 0
      }, context.autoScroll * 100, function() {
        toggleScrolling(context);
      });
    });
  }
}

function toggleCarousel(context) {
  if (context.carouselInterval) {
    clearInterval(context.carouselInterval);
    context.carouselInterval = null;
  }

  if (context.autoCarousel) {
    $('body').addClass('disable-anim');

    context.carouselInterval = setInterval(carousel, context.autoCarousel * 1000);
  }
}

function carousel() {
  $routes.find('.route').click()
}

function setupAutocomplete() {
  $search.on('keyup', function(e) {
    switch (e.keyCode) {
      case 38: // Up
      case 40: // Bottom
        selectSuggestion(e.keyCode - 39);
        return;

      case 13: // Enter
        return $suggestions.find('#selected').click().attr('id', '');

      case 27: // Escape
        $search.attr('aria-expanded', false);
        return $suggestions.hide();
    }

    var text = $search.val();
    clearTimeout(delayer);

    if (text) {
      delayer = setTimeout(function() { autocomplete(text); }, 300);
    } else {
      $search.attr('aria-expanded', false);
      $suggestions.hide();
    }
  }).on('blur', function() {
    setTimeout(function() { $search.attr('aria-expanded', false); $suggestions.hide(); }, 200);
  }).on('click', function() {
    $search.select();

    if (context.results && context.results.length) {
      $search.attr('aria-expanded', true);
      $suggestions.show();
    }
  });

  $suggestions.on('click', 'ul li', onItemClick);
}

function selectSuggestion(direction) {
  var $select = $suggestions.find('#selected').attr('id', '');

  if ($select.length) {
    if (direction > 0) {
      $select = $select.next();
    } else {
      $select = $select.prev();
    }
  }

  if (!$select.length) {
    if (direction > 0) {
      $select = $suggestions.find('li:first');
    } else {
      $select = $suggestions.find('li:last');
    }
  }

  $select.attr('id', 'selected');
}

function loadNearby(lat, lng, hideLoading) {
  var data = { lat: lat, lon: lng, filter: context.filter, distance: context.distance };

  clearInterval(context.update);
  clearTimeout(context.refresh);
  context.refresh = setTimeout(function() { loadNearby(lat, lng, true); }, 30000);

  if (!hideLoading) {
    $loading.fadeIn(250).focus();
    $routes.find('.route').attr('aria-hidden', true);
  }

  $.getJSON(BASE_URL + '/nearby', data, function(res) {
    var index = $('#routes :focus').parents('.route').index();

    res.routes.forEach(function(route) {
      route.current_itinerary_index = 0;
    });

    if (context.staticDirection != -1) {
      res.routes.forEach(function(route) {
        if (route.itineraries.length > context.staticDirection) {
          route.current_itinerary_index = context.staticDirection;
        }
      });
    }

    if (context.sortByTime) {
      var now = Date.now();

      res.routes.sort(function (a, b) {
        var timeA, timeB;

        a.itineraries[a.current_itinerary_index].schedule_items.forEach(function (item) {
          var time = item.departure_time * 1000;

          if (!timeA && time > now) {
            timeA = time;
            return false;
          }
        });

        b.itineraries[b.current_itinerary_index].schedule_items.forEach(function (item) {
          var time = item.departure_time * 1000;

          if (!timeB && time > now) {
            timeB = time;
            return false;
          }
        });

        if (timeA && timeB) {
          return timeA - timeB;
        } else {
          return 0;
        }
      });
    }

    $routes.html(tmpl.routes_tmpl(res));

    if (!hideLoading) {
      $routes.scrollTop(0);
      $loading.fadeOut(250);
    }

    if (index != -1) {
      $($('.route').get(index)).find('[role="tab"]:first').focus();
    }

    updateTime();
    context.update = setInterval(updateTime, 3000);
  });
}

function updateTime() {
  var now = Date.now();

  $('.route .content').each(function(i, route) {
    var $this = $(this)
      , $direction = $this.find('h3')
      , found = false
      , last = false
      , min = 9000
      , time;

    $this.find('.time h2').each(function(j, minutes) {
      time = parseInt($(this).attr('data-time')) * 1000;
      min = Math.round((time - now) / 60000);

      if (time > now && min <= 90) {
        if (!found) {
          found = true;
          last = $(this).find('small').hasClass('last');

          $(this).parent().find('> small').html(min == 1 ? 'minute' : 'minutes');
        }

        $(this).find('span').html(min);

        if (j === 0) {
          $(this).parent().attr('aria-label', 'next departure in ' + min + (min == 1 ? ' minute' : ' minutes'));
        }
      } else {
        $(this).parent().attr('aria-label', 'no departure for the next 90 minutes');
        $(this).remove();
      }
    });

    if (!found) {
      $this.find('.time > small').hide();
      $this.find('.inactive').css('display', 'block');
    } else if (last) {
      $this.find('.time > small').html('last').addClass('last');
    }
  });
}

function autocomplete(query) {
  var data = {
        lat: context.latitude
      , lon: context.longitude
      , filter: context.filter
      , query: query
      };

  context.results = [];

  $.getJSON(BASE_URL + '/stops', data, function(res) {
    $.each(res.results, function(i, p) {
      context.results.push(p);
    });

    showSuggestions();
  });
}

function showSuggestions() {
  context.results.sort(function(a, b) {
    return b.probability - a.probability;
  });

  $search.attr('aria-expanded', true);
  $suggestions.show().find('ul').html(tmpl.suggestions_tmpl(context.results));
}

function onItemClick() {
  var self = $(this)
    , lat = self.data('lat')
    , lng = self.data('lng');

  $search.val(self.find('span').text().replace('Stop Code', ' Stop Code'));
  $search.attr('aria-expanded', false);
  $suggestions.hide();

  clearTimeout(context.refresh);
  $locate.removeClass('active');

  if (lat && lng) {
    window.location.hash = createHash(lat, lng);
  }
}

function createHash(lat, lng) {
  return lat + "," + lng + "|" + $search.val();
}
