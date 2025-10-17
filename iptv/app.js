var starttime = performance.now();

var ALERT_POSY = 20;
var ALERT_EXPIRES = 5000;
var ALERT_SLIDE_DURATION = 200;

function alertMsg(msg, type='success') {
	function slide(target, top1, top2, duration=300, callback) {
		var interval = 16.666;
		var steps = duration / interval;
		var direction = top1 < top2 ? 1 : -1;
		var increment = (Math.abs(top1 - top2) / steps) * direction;
		var top = top1;
		target.style.top = top + 'px';
		
		var fn = setInterval(function() {
			if ((direction === 1 && top >= top2) || (direction === -1 && top <= top2)) {
				clearInterval(fn);
				target.style.top = top2 + 'px';
				if (callback && typeof callback === 'function') {
					callback();
				}
			} else {
				top += increment;
				target.style.top = top + 'px';
			}
		}, interval);
	}
	
	var d = document.body.appendChild(document.createElement('div'));
	d.classList.add('alert', type);
	
	var s = d.appendChild(document.createElement('span'));
	s.innerText = msg;
	
	var d_initY = -1 * d.offsetHeight;
	
	var a = d.appendChild(document.createElement('a'));
	a.classList.add('alert-close');
	a.href = 'javascript:void(0)';
	a.innerHTML = '&times;';
	a.addEventListener('click', function() {
		slide(d, ALERT_POSY, d_initY, ALERT_SLIDE_DURATION, function() {
			d.remove();
		});
	});
	
	slide(d, d_initY, ALERT_POSY, ALERT_SLIDE_DURATION, function() {
		setTimeout(function() {
			slide(d, ALERT_POSY, d_initY, ALERT_SLIDE_DURATION, function() {
				d.remove();
			});
		}, ALERT_EXPIRES);
	});
}

var videoElement = document.getElementById('video');
var volumebtn = document.getElementById('volume_btn');

volumebtn.addEventListener('click', function(e) {
	if (false === videoElement.muted && videoElement.volume == 0) {
		videoElement.volume = 1;
	} else {
		videoElement.muted = !videoElement.muted;
	}
});

videoElement.addEventListener('volumechange', function(e) {
	volumebtn.classList.toggle('muted', e.target.muted || e.target.volume == 0);
});

var videoUnmuted = false;
videoElement.muted = true;
volumebtn.classList.toggle('muted', videoElement.muted);

var player = new shaka.Player();
player.attach(videoElement);
player.addEventListener('loading', function() { console.log('Loading stream...'); });
player.addEventListener('loaded', function() { console.log('Stream is loaded!'); });

var channels_menu = document.getElementById('channels_menu');

document.addEventListener('fullscreenchange', function(e) {
	if (![null, document.body].includes(document.fullscreenElement)) {
		document.exitFullscreen();
		return;
	}
	
	if (document.body.classList.toggle('fs', document.fullscreen)) {
		channels_menu.style.display = 'none';
		setTimeout(function() {
			channels_menu.removeAttribute('style');
		}, 200);
	}
});

function toggleFullscreen() {
	!document.fullscreen ? document.body.requestFullscreen() : document.exitFullscreen();	
}

function isFullscreen() {
	return document.body.classList.contains('fs');
}

function isSmallscreen() {
	return window.innerWidth <= 768;
}

var FLASH_CNTRL_TIME = 2500;
var opencontrolshndle = null;
var videocontrolslayer = document.getElementById('videocontrolslayer');

function flashcontrolsheader() {
	videocontrolslayer.classList.add('open');
	
	if (null !== opencontrolshndle) {
		clearTimeout(opencontrolshndle);
	}
	
	opencontrolshndle = setTimeout(function(e) {
		videocontrolslayer.classList.remove('open');
		opencontrolshndle = null;
	}, FLASH_CNTRL_TIME);
}

videocontrolslayer.addEventListener('mousemove', function(e) {
	if (!isFullscreen()) {
		return;
	}
	
	flashcontrolsheader();
});

function isMenuopen() {
	return document.body.classList.contains('menuopen');
}

function toggleMenu() {
	if (document.body.classList.toggle('menuopen')) {
		highlightChannel(current_channel);
	}
}

document.getElementById('fullscreen_btn').onclick = toggleFullscreen;
document.getElementById('togglemenu_btn').onclick = toggleMenu;

var channels = [];
var channel_items = document.getElementsByClassName('channelItem');
var current_channel = parseInt(localStorage.getItem('CurrentChannel')) || 0;
var highlight_channel = current_channel;

function highlightChannel(id=0, ignore=false) {
	if (!channels.length) {
		return;
	}
	
	if (ignore && (id < 0 || id > channels.length - 1)) {
		return;
	}
	
	if (id < 0) {
		id = channels.length - 1;
	} else if (id > channels.length - 1) {
		id = 0;
	}
	
	if (channel_items.item(highlight_channel)) {
		channel_items.item(highlight_channel).classList.remove('highlight');
	}
	
	channel_items.item(id).classList.add('highlight');
	channel_items.item(id).focus();
	highlight_channel = id;
}

var channel_name = document.getElementById('channel_name');
var playerloading = false;

function setChannel(id=0, ignore=false) {
	if (!channels.length) {
		return;
	}
	
	if (ignore && (id < 0 || id > channels.length - 1)) {
		return;
	}
	
	if (id < 0) {
		id = channels.length - 1;
	} else if (id > channels.length - 1) {
		id = 0;
	}
	
	channel_name.innerText = channels[id].title;
	
	if (channel_items.item(current_channel)) {
		channel_items.item(current_channel).classList.remove('active');
	}
	
	channel_items.item(id).classList.add('active');
	current_channel = id;
	highlightChannel(id);
	localStorage.setItem('CurrentChannel', id);
	
	if (!playerloading) {
		playerloading = true;
		videoElement.setAttribute('poster', channels[id].logo);
		player.configure(channels[id].config || {});
		player.load(channels[id].src)
			.then(function() { 
				videoElement.play();
				if (isSmallscreen()) {
					document.body.classList.remove('menuopen');
				}
			})
			.catch(function(error) { 
				switch (error.code) {
					case shaka.util.Error.Code.BAD_HTTP_STATUS:
						alertMsg('Error: Bad or unavailable URL.', 'fail');		
						break;
					case shaka.util.Error.Code.HTTP_ERROR:
						alertMsg('Error: Unable to play stream due to server error or CORS policy.', 'fail');
						break;
					case shaka.util.Error.Code.TIMEOUT:
						alertMsg('Error: Server took a long time to respond.', 'fail');
						break;
					default:
						alertMsg('Error: ' + (error.message || error.code), 'fail');
						console.error(error);
						break;
				}
				
			})
			.finally(function() { playerloading = false; });
	}
}

var listObserver = null;
var channels_list = document.getElementById('channels_list');
var channels_count = document.getElementById('channels_count');
var emptyMenuMsg = document.getElementById('emptyMenuMsg');

function displayChannels() {
	channels_list.innerHTML = '';
	channels_count.innerText = channels.length;
	
	if (listObserver && typeof listObserver.disconnect === 'function') {
		listObserver.disconnect();
	}
	
	var listObserverOptions = {
		root: null,
		rootMargin: '0px',
		threshold: 0.5
	};
	
	listObserver = new IntersectionObserver(function(entries, observer) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.onload = function(e) {
					e.target.classList.remove('hidden');	
				};
				entry.target.src = entry.target.dataset.src;
				observer.unobserve(entry.target);
			}
		});
	}, listObserverOptions);
	
	if (channels.length) {
		emptyMenuMsg.style.display = 'none';
	
		for (var i = 0; i < channels.length; ++i) {
			var li = channels_list.appendChild(document.createElement('li'));
			li.id = 'channel_item_' + i;
			
			var a = li.appendChild(document.createElement('a'));
			a.href = 'javascript:void(0);';
			a.classList.add('channelItem');
			a.dataset.id = i;
			a.title = channels[i].title;
			a.addEventListener('click', function(e) {
				if (e.pointerId !== -1) {
					setChannel(parseInt(e.target.dataset.id));
				}
				if (!videoUnmuted && videoElement.muted) {
					videoElement.muted = false;
					videoUnmuted = true;
				}
			});
			a.addEventListener('mouseover', function(e) {
				highlightChannel(parseInt(e.target.dataset.id));
			});
			
			var ch = a.appendChild(document.createElement('span'));
			ch.className = 'chnum';
			ch.innerText = i + 1;
			
			var ns = a.appendChild(document.createElement('span'));
			ns.className = 'chname';
			ns.innerText = channels[i].title;
			
			var ls = a.appendChild(document.createElement('span'));
			ls.classList.add('logo');
			if (channels[i].logo) {
				var img = ls.appendChild(document.createElement('img'));
				img.width = 60;
				img.height = 60;
				img.loading = 'lazy';
				img.dataset.src = channels[i].logo;
				img.alt = channels[i].tid + '_logo';
				img.title = channels[i].title;
				img.onerror = function(e) { e.target.remove(); }
				img.classList.add('hidden');
				listObserver.observe(img);
			}
		}
	} else {
		emptyMenuMsg.style.display = 'block';
	}
}

var isplayerfocused = true;
var dialogs = document.querySelectorAll('dialog');

for (var i = 0; i < dialogs.length; ++i) {
	dialogs[i].addEventListener('toggle', function(e) {
		isplayerfocused = !e.target.open;
	});
}

var dialogCloseButtons = document.getElementsByClassName('dialog-close');
for (var i = 0; i < dialogCloseButtons.length; ++i) {
	dialogCloseButtons[i].addEventListener('click', function(e) {
		var target = document.querySelector(e.target.dataset.target);
		if (target && target.tagName === 'DIALOG') {
			target.close();
		}
	});
}

var MAX_CHANNEL_DIGITS = 5;
var selectchannel = '';
var selectchannelhndle = null;
var selectchannellbl = document.getElementById('selectchannel');
var filteredchannelslist = document.getElementById('filteredchannelslist');

document.addEventListener("keydown", function(e) {
	if (!isplayerfocused)
		return;
		
	switch (e.key) {
		case 'ArrowUp':
			if (isFullscreen() && !isMenuopen()) {
				setChannel(current_channel + 1);
				flashcontrolsheader();
			} else {
				highlightChannel(highlight_channel - 1);
			}
			break;
		case 'ArrowDown':
			if (isFullscreen() && !isMenuopen()) {
				setChannel(current_channel - 1);
				flashcontrolsheader();
			} else {
				highlightChannel(highlight_channel + 1);
			}
			break;
		case 'ArrowRight':
			if (isFullscreen() && !isMenuopen()) {
				document.body.classList.add('menuopen');
				highlightChannel(current_channel);
			}
			break;
		case 'ArrowLeft':
			if (isFullscreen()) {
				document.body.classList.remove('menuopen');
			}
			break;
		case 'Enter':
			if ((!isFullscreen() || isMenuopen()) && highlight_channel !== current_channel) {
				setChannel(highlight_channel);
			}
			break;
		case 'f':
		case 'F':
			toggleFullscreen();
			break;
		case 'm':
		case 'M':
			videoElement.muted = !videoElement.muted;
			break;
		case '0':
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9':
			if (selectchannel.length === 0 && e.key === '0') {
				break;
			}
			
			if (selectchannel.length < MAX_CHANNEL_DIGITS){
				selectchannel += e.key;
			}
			
			highlightChannel(parseInt(selectchannel) - 1, true);
			
			var numofzeros = Math.max(0, MAX_CHANNEL_DIGITS - selectchannel.length);
			var zeros = Array(numofzeros + 1).join('0');
			selectchannellbl.innerText = zeros + selectchannel;
			selectchannellbl.style.display = 'block';
			
			if (selectchannelhndle) {
				clearTimeout(selectchannelhndle);
			}
			
			selectchannelhndle = setTimeout(function() {
				setChannel(parseInt(selectchannel) - 1, true);
				selectchannellbl.style.display = 'none';
				selectchannellbl.innerText = '';
				selectchannelhndle = null;
				selectchannel = '';
			}, 2000);
			break;
		default:
			//console.log(e.key);
			break;
	}
});

function strtoprop(str) {
	var properties = {};
	var j = 0;
	var iskey = true;
	var inquote = false;
	var key = '';
	var value = '';
	while (j < str.length) {
		var c = str[j];
		if (c == '=' && !inquote && iskey) {
			iskey = false;
		} else if (c == ' ' && !inquote) {
			if (iskey) {
				if (key.length) {
					properties[key] = 1;
				}
			} else {
				properties[key] = value;
			}
			key = '';
			value = '';
			iskey = true;
		} else if (c == '"') {
			inquote = !inquote;
		} else {
			if (iskey) {
				key += c;
			} else {
				value += c;
			}
		}
		j++;
	}
	if (iskey) {
		if (key.length) {
			properties[key] = 1;
		}
	} else {
		properties[key] = value;
	}
	
	return properties;
}

function parsem3u(str) {
	var lines = str.trim().split('\n');
	
	if (lines[0].trim() !== '#EXTM3U') {
		throw new Error('Invalid M3U header.');
	}
	
	var id = 1;
	var title = '';
	var runtime = '';
	var properties = {};
	var config = {};
	var license_type = '';
	var entries = [];
	var forceSSL = location.protocol === 'https:';
	
	for (var i = 1; i < lines.length; ++i) {
		var line = lines[i].trim();
		if (line.length === 0) 
			continue;
		if (line.charAt(0) === '#') {
			var endp = line.indexOf(':');
			if (endp === -1)
				continue;
			var directive = line.slice(0, endp);
			var input = line.slice(endp + 1);
			switch (directive) {
				case '#EXTINF':
					var titlep = input.lastIndexOf(',');
					if (titlep !== -1) {
						title = input.slice(titlep + 1);
						var info = input.slice(0, titlep);
					} else {
						title = '';
						var info = input;
					}
					var runtimep = info.indexOf(' ');
					if (runtimep !== -1) {
						runtime = parseInt(info.slice(0, runtimep));
						var propstr = info.slice(runtimep + 1);
						properties = strtoprop(propstr);
					} else {
						runtime = parseInt(info);
					}						
					break;
				case '#KODIPROP':
					var propp = input.indexOf('=');
					if (propp === -1) 
						break;
					var prop = input.slice(0, propp);
					var data = input.slice(propp + 1);
					switch (prop) {
						case 'inputstream.adaptive.license_type':
							license_type = data;
							break;
						case 'inputstream.adaptive.license_key':
							if (!license_type) 
								break;
							if (data.indexOf('http') === 0) {
								var key = data.split('|');
								var url = key.shift();
								config.drm = config.drm || {};
								config.drm.servers = config.drm.servers || {};
								config.drm.servers[license_type] = url;
								if (key.length) {
									config.drm.advanced = config.drm.advanced || {};
									config.drm.advanced[license_type] = config.drm.advanced[license_type] || {};
									config.drm.advanced[license_type].headers = {};
									for (var j = 0; j < key.length; ++j) {
										var h = key[j].split('=');
										config.drm.advanced[license_type].headers[h[0]] = h[1] || ''; 
									}
								}
							} else if (data.indexOf(':') !== -1 && license_type === 'org.w3.clearkey') {
								var key = data.split(':');
								config.drm = config.drm || {};
								config.drm.clearKeys = config.drm.clearKeys || {};
								config.drm.clearKeys[key[0]] = key[1] || '';
							}
							break;
					}
					break;
			}
		} else {
			var src = line;
			if (forceSSL) {
				src = src.replace(/^http:/, 'https:');
			}
			
			var entry = {
				id: id++,
				tid: properties['tvg-id'] || '',
				title: title,
				logo: properties['tvg-logo'] || '',
				group: (properties['group-title'] || '').split(';'),
				src: encodeURI(src),
				config: config
			};
			
			title = '';
			runtime = '';
			properties = {};
			config = {};
			license_type = '';
			entries.push(entry);
		}
	}
	
	return entries;
}

function loadm3u(loc, cb) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			cb(parsem3u(this.responseText));
		}
	};
	xhr.open('GET', loc, true);
	xhr.send();
}

function DBStoreChannels() {
	var DBOpenRequest = window.indexedDB.open('iptv-player', 1);

	DBOpenRequest.onsuccess = function(e) {
		db = e.target.result;
		var transaction = db.transaction('channels', 'readwrite');
		var objectStore = transaction.objectStore('channels');
		var objectStoreRequest = objectStore.clear();
	
		objectStoreRequest.onsuccess = function(e) {
			for (var i = 0; i < channels.length; ++i) {
				objectStore.put(channels[i]);
			}
		};
		
		transaction.oncomplete = function() {
			db.close();
		};
	}
	
	DBOpenRequest.onerror = function(e) {
		console.error('Failed to open database, Error: ', e.target.errorCode);
	};
}

document.settingsForm.addEventListener('submit', function(e) {
	e.preventDefault();
	//console.log(e);
	switch (e.submitter.name) {
		case 'loadUrl':
			var url = e.target['url'].value.trim();
			var upd = parseInt(e.target['update'].value);
			if (url == '') {
				console.error('Playlist\'s URL is empty.');
			} else if (upd < 0 || upd > 4) {
				console.error('Invalid update time.');
			} else {
				loadm3u(url, function(result) {
					console.log('fetching new playlist.');
					channels = result;
					displayChannels();
					setChannel();
					DBStoreChannels();				
					localStorage.setItem('PlaylistURL', url);
					localStorage.setItem('PlaylistUpdateInterval', upd);
					localStorage.setItem('PlaylistLastUpdateTime', (new Date()).toUTCString());
					document.getElementById('settings').close();
				});
			}
			break;
		case 'uploadFile':
			console.log('uploading file');
			var file = e.target['file'].files[0];
			
			if (file) {
				var fr = new FileReader();
				fr.onload = function(e) {
					channels = parsem3u(e.target.result);
					displayChannels();
					setChannel();
					DBStoreChannels();
					localStorage.removeItem('PlaylistURL');
					localStorage.removeItem('PlaylistUpdateInterval');
					localStorage.removeItem('PlaylistLastUpdateTime');
					document.getElementById('settings').close();
				};
				fr.readAsText(file);
			}
			break;
	}
});

if (!localStorage.getItem('FirstTimeRun')) {
	localStorage.setItem('FirstTimeRun', 1);
	document.getElementById('settings').showModal();
}

var db;

if (window.indexedDB) {
	var DBOpenRequest = window.indexedDB.open('iptv-player', 1);
	
	DBOpenRequest.onupgradeneeded = function(e) {
		var db = e.target.result;
		
		if (!db.objectStoreNames.contains('channels')) {
			var objectStore = db.createObjectStore('channels', { keyPath: 'id' });
			
			objectStore.createIndex('tid', 'tid', { unique: false });
			objectStore.createIndex('title', 'title', { unique: false });
			objectStore.createIndex('logo', 'logo', { unique: false });
			objectStore.createIndex('group', 'group', { unique: false });
			objectStore.createIndex('src', 'src', { unique: false });
			objectStore.createIndex('config', 'config', { unique: false });
		}
	};
	
	DBOpenRequest.onsuccess = function(e) {
		db = e.target.result;
		
		var currentTime = new Date();
		var playlistUrl = localStorage.getItem('PlaylistURL');
		var playlistUpdateInterval = parseInt(localStorage.getItem('PlaylistUpdateInterval')) || 0;
		var playlistLastUpdateTime = new Date(localStorage.getItem('PlaylistLastUpdateTime'));
		
		document.settingsForm.url.value = playlistUrl;
		document.settingsForm.update.options[playlistUpdateInterval].setAttribute('selected', true);
		
		var playlistUpdate = (function() {
			if (!playlistUpdateInterval || !playlistUrl || playlistUrl.length === 0 || isNaN(playlistLastUpdateTime.valueOf())) {	
				return false;
			}
			
			var playlistNextUpdateTime = playlistLastUpdateTime;
			switch (playlistUpdateInterval) {
				case 1:
					playlistNextUpdateTime.setDate(playlistLastUpdateTime.getDate() + 1);
					break;
				case 2:
					playlistNextUpdateTime.setDate(playlistLastUpdateTime.getDate() + 7);
					break;
				case 3:
					playlistNextUpdateTime.setMonth(playlistLastUpdateTime.getMonth() + 1);
					break;
				case 4:
					playlistNextUpdateTime.setFullYear(playlistLastUpdateTime.getFullYear() + 1);
					break;
				default:
					return false;
					break;
			}
			
			if (currentTime >= playlistNextUpdateTime) {
				return true;
			}
			
			return false;
		})();
		
		if (playlistUpdate) {
			loadm3u(playlistUrl, function(result) {
				console.log('updating database channels.');
				channels = result;
				displayChannels();
				setChannel(current_channel);
				
				var transaction = db.transaction('channels', 'readwrite');
				var objectStore = transaction.objectStore('channels');
				var objectStoreRequest = objectStore.clear();
				
				objectStoreRequest.onsuccess = function(e) {
					for (var i = 0; i < channels.length; ++i) {
						objectStore.put(channels[i]);
					}
				};
							
				transaction.oncomplete = function() {
					db.close();
				};

				localStorage.setItem('PlaylistLastUpdateTime', currentTime.toUTCString());
			});
		} else {
			console.log('fetching channels from database.');
			var transaction = db.transaction('channels', 'readonly');
			var objectStore = transaction.objectStore('channels');
			var objectStoreRequest = objectStore.getAll();

			objectStoreRequest.onsuccess = function(e) {
				channels = e.target.result;
				displayChannels();
				setChannel(current_channel);
			};
				
			transaction.oncomplete = function() {
				db.close();
			};
		}
	};
	
	DBOpenRequest.onerror = function(e) {
		console.error('Failed to open database, Error: ', e.target.errorCode);
	};
}

console.log('app.js took %f ms to complete.', (performance.now() - starttime).toFixed(3));
