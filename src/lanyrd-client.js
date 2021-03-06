(function() {
    "use strict";

    var Lanyrd = require('lanyrd'),
        Q = require("q"),
        SoftCache = require("soft-cache"),
        softCache = new SoftCache(); // cache is static for all instances

    function LanyrdClient() {

        function getProfileUrl( profile_links ) {
            for ( var i = 0; i < profile_links.length; i++ ) {
                if ( profile_links[i].url.indexOf("twitter.com") !== -1 ) {
                    return profile_links[i].url;
                }
            }
        }

        function getSpeakerInfo( speaker ) {
            return {
                name: speaker.title,
                link: getProfileUrl(speaker.profile_links) || "#",
                session: speaker.sessions[0].title
            }
        }

        function getSpeakersPromise( year, name ) {
            var speakersDeferer = Q.defer();                

            Lanyrd.speakers(name, year, function(err, resp, _speakers) {
                var i,
                    speakers = [];
                for ( i = 0; i < _speakers.length; i++ ) {
                    speakers.push( getSpeakerInfo( _speakers[i] ) );
                }
                speakersDeferer.resolve( speakers );                  
            });

            return speakersDeferer.promise;
        }

        function getEventPromise(year, name) {
            var eventDeferer = Q.defer(),
                event = {};

            Lanyrd.event(name, year, function(err, resp, _event) {
                event.title = _event.title;
                event.date = _event.start_date;
                event.starting_hour = _event.times;
                eventDeferer.resolve(event);
            });

            return eventDeferer.promise;
        }

        this.getEvent = function(year, name) {
            var fullEventDeferer = Q.defer(),
                cacheKey = year+"_"+name,
                event = softCache.get(cacheKey),
                eventPromise,
                speakersPromise;

            if ( event ) {
                fullEventDeferer.resolve(event);
            } else {
                eventPromise = getEventPromise(year,name),
                speakersPromise = getSpeakersPromise(year, name);

                // wanted to use Q.all but was having an issue. Feel free to re-write.
                eventPromise.then( function( eventData ) {
                     speakersPromise.then( function( speakers ) {
                        eventData.speakers = speakers;
                        softCache.put(cacheKey, eventData);
                        fullEventDeferer.resolve(eventData);
                     }).done();
                }).done();
            }                

            return fullEventDeferer.promise;
        };
        
    };

    module.exports = LanyrdClient;
}());