/**
 * EZTV plugin for Movian Media Center
 *
 *  Copyright (C) 2015-2018 lprot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');

var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + "logo.png";

var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45';

function colorStr(str, color) {
    return '<font color="' + color + '"> (' + str + ')</font>';
}

function coloredStr(str, color) {
    return '<font color="' + color + '">' + str + '</font>';
}

function setPageHeader(page, title) {
    page.loading = true;
    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.logo = logo;
    }
    page.type = "directory";
    page.contents = "items";
}

service.create(plugin.title, plugin.id + ":start", "video", true, logo);

settings.globalSettings(plugin.title, logo, plugin.synopsis);
settings.createBool('enableMetadata', 'Enable metadata fetching', false, function(v) {
    service.enableMetadata = v;
});
	
settings.createString('baseURL', "Base URL without '/' at the end", 'https://eztv.ag', function(v) {
    service.baseUrl = v;
});

new page.Route(plugin.id + ":play:(.*):(.*):(.*):(.*):(.*)", function(page, url, title, imdb_id, season, episode) {
    page.loading = true;
    page.type = 'video';
    page.source = "videoparams:" + showtime.JSONEncode({
        title: unescape(title),
        canonicalUrl: plugin.id + ':play:' + url + ':' + title + ':' + imdb_id + ':' + season + ':' + episode,
        sources: [{
            url: 'torrent:video:' + unescape(url)
        }],
        imdbid: imdb_id ? 'tt' + imdb_id : 0,
        season: season,
        episode: episode,
        no_fs_scan: true
    });
    page.loading = false;
});

function browseItems(page, query) {
    var fromPage = 1, tryToSearch = true;
    page.entries = 0;

    function loader() {
        if (!tryToSearch) return false;
        page.loading = true;
        var url = service.baseUrl + '/api/get-torrents?limit=10&page=' + fromPage;
        var doc = http.request(url).toString();

        page.loading = false;
        var json = showtime.JSONDecode(doc);
        for (var i in json.torrents) {
             var item = page.appendItem(plugin.id + ':play:' + escape(json.torrents[i].torrent_url) + ':' + escape(json.torrents[i].title) + ':' + json.torrents[i].imdb_id + ':' + json.torrents[i].season + ':' + json.torrents[i].episode, "video", {
                 title: new showtime.RichText(json.torrents[i].title),
                 icon: json.torrents[i].small_screenshot ? 'https:' + json.torrents[i].small_screenshot : 'https://ezimg.ch/s/1/9/image-unavailable.jpg',
                 year: +json.torrents[i].date_released_unix,
                 description: new showtime.RichText(coloredStr('Season: ', orange) + json.torrents[i].season +
                     coloredStr(' Episode: ', orange) + json.torrents[i].episode +
                     coloredStr('<br>Seeds: ', orange) + coloredStr(json.torrents[i].seeds, green) +
                     coloredStr(' Peers: ', orange) + coloredStr(json.torrents[i].peers, red) +
                     (json.torrents[i].imdb_id ? coloredStr('<br>IMDb ID: ', orange) + 'tt' + json.torrents[i].imdb_id : '') +
                     coloredStr(' Size (bytes): ', orange) + json.torrents[i].size_bytes)
             });
             page.entries++;
             if (service.enableMetadata) {
                 item.bindVideoMetadata({
                     imdb: 'tt' + json.torrents[i].imdb_id
                 });
             }
        }
        fromPage++;
        return true;
    }
    loader();
    page.paginator = loader;
    page.loading = false;
}
	
new page.Route(plugin.id + ":start", function(page) {
    setPageHeader(page, plugin.synopsis);
    browseItems(page);
    page.loading = false;
});
