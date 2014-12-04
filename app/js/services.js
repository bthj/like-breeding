(function() {
   'use strict';

   /* Services */

   angular.module('myApp.services', [])

      // put your services here!
      // .service('serviceName', ['dependency', function(dependency) {}]);

      // social network name keys
      .constant('NETNAME', {TUMBLR:'Tumblr', WEHEARTIT:'WeHeartIt', SOUNDCLOUD:'SoundCloud'})

      .factory('networkUserHandles', function(){

        var savedNetworkHandles = [];

        function addNetworkUser( network, user ) {
          savedNetworkHandles.push( {'network': network, 'user': user} );
        }
        function getAllNetworkUserHandles() {
          return savedNetworkHandles;
        }
        function getUserHandlesForNetwork( network ) {
          var userHandles = [];
          savedNetworkHandles.forEach(function(element, index, array){
            if( element.network == network ) userHandles.push( element.user );
          });
          return userHandles;
        }
        function clear() {
          savedNetworkHandles = [];
        }

        return {
          addNetworkUser: addNetworkUser,
          getAllNetworkUserHandles: getAllNetworkUserHandles,
          getUserHandlesForNetwork: getUserHandlesForNetwork,
          clear: clear
        }
      })

      .factory('mediaItemHarvester',
          ['$http', 'localStorageManager',
          function($http, localStorageManager){
        // TODO: env config!
        var tumblrAPIkey = "Djl1CTqPhHhlCsDP9PKcvXptI4jSMmr6QbObhcDVRt4RhTTTdi"
        var tumblrBeforeUser = "http://api.tumblr.com/v2/blog/";
        var tumblrAfterUser = ".tumblr.com";
        var tumblrPosts = "/posts/photo";
        var tumblrLikes = "/likes";
        var tumblrBeforeLimit = "?limit=";
        var tumblrBeforeOffset = "&offset=";
        var tumblrBeforeApiKey = "&api_key="
        var tumblrAfterApiKey = "&callback=JSON_CALLBACK";

        var limit = 20;
        var waitTimeBetweenRequests = 1000;

        // how many posts do we want to encounter again, compared to what's already
        // in mediaItems, before determining that we have harvested all new posts:
        var maxPostReReads = 3;  // Why 3?  I don't know.  Double Tap should do it http://youtu.be/JmA2WYyw-_A


        function getMediaItemsFromTumblrAccount( handle, mediaItems ) {

          var startingFromEmpty = Object.keys(mediaItems).length == 0;

          var reEncounterCountStart = startingFromEmpty ? -Number.MAX_VALUE : 0;

          getPostsFromTumblrAccount( handle, mediaItems, 0, reEncounterCountStart );

          getLikesFromTumblrAccount( handle, mediaItems, 0, reEncounterCountStart );
        }

        function getLikesFromTumblrAccount( handle, mediaItems, offset, reEncounterCount ) {

          $http.jsonp(
            tumblrBeforeUser
            +handle.user
            +tumblrAfterUser
            +tumblrLikes
            +tumblrBeforeLimit
            +limit
            +tumblrBeforeOffset
            +offset
            +tumblrBeforeApiKey
            +tumblrAPIkey
            +tumblrAfterApiKey )
            .success(function(data) {

              console.log( data.response );
              data.response.liked_posts.forEach(function(post, index, array){

                if( post.type == "photo" && post.tags.length && !mediaItems[post.post_url] ) {

                  var oneMediaItem = {
                    "type": post.type,
                    "mediaUrl": post.photos[0].alt_sizes[0].url, //0 works alright as an index
                    "tags": post.tags,
                    "sourceUrl": post.post_url // won't really need this here, as it's now they key, but might be handy
                  };
                  mediaItems[post.post_url] = oneMediaItem;

                } else if( mediaItems[post.post_url] ) {
                  reEncounterCount++;
                }
              });
              if( reEncounterCount < maxPostReReads ) {
                initiateNextPageRequest(
                  data.response.liked_count,
                  offset,
                  reEncounterCount,
                  handle,
                  mediaItems,
                  getLikesFromTumblrAccount );
              }
          });
        }

        function getPostsFromTumblrAccount( handle, mediaItems, offset, reEncounterCount ) {

          $http.jsonp(
            tumblrBeforeUser
            +handle.user
            +tumblrAfterUser
            +tumblrPosts
            +tumblrBeforeLimit
            +limit
            +tumblrBeforeOffset
            +offset
            +tumblrBeforeApiKey
            +tumblrAPIkey
            +tumblrAfterApiKey )
            .success(function(data) {

              console.log( data.response );
              data.response.posts.forEach(function(post, index, array){

                if( post.type == "photo" && post.tags.length && !mediaItems[post.post_url] ) {

                  var oneMediaItem = {
                    "type": post.type,
                    "mediaUrl": post.photos[0].alt_sizes[0].url, //0 works alright as an index
                    "tags": post.tags,
                    "sourceUrl": post.post_url
                  };
                  mediaItems[post.post_url] = oneMediaItem;

                } else if( mediaItems[post.post_url] ) {
                  reEncounterCount++;
                }
              });
              if( reEncounterCount < maxPostReReads ) {
                initiateNextPageRequest(
                  data.response.total_posts,
                  offset,
                  reEncounterCount,
                  handle,
                  mediaItems,
                  getPostsFromTumblrAccount );
              }
          });

        }

        function initiateNextPageRequest(
          totalItems, currentOffset, reEncounterCount, handle, mediaItems, callback ) {

          var newOffset = currentOffset + limit;

          console.log("newOffset: " + newOffset + ", totalItems: " + totalItems + ", for: " + callback.name);

          if( newOffset < totalItems ) {

            setTimeout( function(){

              callback( handle, mediaItems, newOffset, reEncounterCount );

            }, waitTimeBetweenRequests);
          } else {
            console.log( "Finished paging through " + callback.name +
              " and the current total of harvested media items is: " + Object.keys(mediaItems).length );

            localStorageManager.saveMediaItems( mediaItems, handle );
          }
        }

        return {
          getMediaItemsFromTumblrAccount: getMediaItemsFromTumblrAccount
        }
      }])



      .factory('localStorageManager', [function(){
        var userHandlesStorageKey = "likeBreeder.userHandles";
        var mediaItemsStorageKey = "likeBreeder.mediaItems";
        try {
          var isLocalStorage = ('localStorage' in window && window['localStorage'] !== null);
        } catch (e) {
          var isLocalStorage = false;
        }

        function saveNetworkUserHandles( userHandles ) {
          if( isLocalStorage ) {
            localStorage[ userHandlesStorageKey ] = JSON.stringify( userHandles );
          }
        }

        function getSavedNeworkUserHandles() {
          if( isLocalStorage && localStorage[userHandlesStorageKey] ) {
            return JSON.parse( localStorage[userHandlesStorageKey] );
          } else {
            return null;
          }
        }

        function clearSavedNetworkUserHandles() {
          localStorage.removeItem( userHandlesStorageKey );
        }

        function saveMediaItems( mediaItems, handle ) {
          if( isLocalStorage ) {
            var mediaStorageKeyForUser = mediaItemsStorageKey + handle.network + handle.user;
            localStorage[ mediaStorageKeyForUser ] = JSON.stringify(
              mediaItems, function( key, val ) {
              // based on http://mutablethought.com/2013/04/25/angular-js-ng-repeat-no-longer-allowing-duplicates/
              if( key == '$$hashKey' ) {
                return undefined;
              }
              return val;
            } );
          }
        }

        function getSavedMediaItems( handle ) {
          var mediaStorageKeyForUser = mediaItemsStorageKey + handle.network + handle.user;
          if( isLocalStorage && localStorage[mediaStorageKeyForUser] ) {
            return JSON.parse( localStorage[mediaStorageKeyForUser] );
          } else {
            return null;
          }
        }

        function getAllSavedMediaItems() {
          var allMediaItems = {};
          getSavedNeworkUserHandles().forEach(function(oneHandle){
            var mediaItemsForOneHandle = getSavedMediaItems( oneHandle );
            if( mediaItemsForOneHandle ) {
              Object.keys(mediaItemsForOneHandle).forEach(function(oneMediaKey){
                allMediaItems[oneMediaKey] = mediaItemsForOneHandle[oneMediaKey];
              });
            }
          });
          return allMediaItems;
        }

        function clearSavedMediaItems( network, user ) {
          localStorage.removeItem( mediaItemsStorageKey + network + user );
        }

        function clearAllSavedMediaItems() {
          var networkHandles = getSavedNeworkUserHandles();
          if( networkHandles ) {
            getSavedNeworkUserHandles().forEach(function(oneHandle){
              clearSavedMediaItems( oneHandle.network, oneHandle.user );
            });
          }
        }

        return {
          saveNetworkUserHandles: saveNetworkUserHandles,
          getSavedNeworkUserHandles: getSavedNeworkUserHandles,
          clearSavedNetworkUserHandles: clearSavedNetworkUserHandles,
          saveMediaItems: saveMediaItems,
          getSavedMediaItems: getSavedMediaItems,
          getAllSavedMediaItems: getAllSavedMediaItems,
          clearAllSavedMediaItems: clearAllSavedMediaItems
        }
      }])



      .factory('similaritySearch', [function(){

        var distanceMeasure = {};

        function jaccard(itemset1,itemset2)
        {
          var union,intersection;
          union = unite(itemset1,itemset2);
          intersection = intersect(itemset1,itemset2);
          return intersection.length/union.length;
        }

        function unite(itemset1,itemset2)
        {
          var union = itemset1.slice(0);
          for( var item in itemset2) {
            if(union.indexOf(itemset2[item]) == -1)
              union.push(itemset2[item]);
          }
          return union;
        }

        function intersect(itemset1,itemset2)
        {
          var intersection = [];
          for( var item in itemset1) {
            if(itemset2.indexOf(itemset1[item]) != -1)
            {
              intersection.push(itemset1[item]);
            }
          }
          return intersection;
        }

        // mediaItems is an object with keys to two items
        function getKeyForItemsDistance( mediaItem1, mediaItem2 ) {

          return [mediaItem1.sourceUrl, mediaItem2.sourceUrl].sort().join("");
        }

        // mediaItems is an object with keys to *two* items
        function getDistanceBetweenTwoMediaItems( mediaItem1, mediaItem2 ) {
          var key = getKeyForItemsDistance( mediaItem1, mediaItem2 );

          if( ! distanceMeasure.hasOwnProperty(key) ) {
            // we haven't computed a distance between those two items before
            // so now we have to!
            var tagSet1 = mediaItem1.tags;
            var tagSet2 = mediaItem2.tags;
            distanceMeasure[key] = jaccard(tagSet1, tagSet2);
          }
          return distanceMeasure[ key ];
        }

        function getClosestMediaItemToOneMediaItem(
            oneItem, allItems, excludedItems, topCount ) {

          var bestMatches = [];

          Object.keys(allItems).forEach(function(oneOtherItemKey, index, array){
            var oneOtherItem = allItems[oneOtherItemKey];

            if( oneItem.sourceUrl !== oneOtherItem.sourceUrl &&
                  !excludedItems[oneOtherItem.sourceUrl] ) {

              var oneDistance = getDistanceBetweenTwoMediaItems( oneItem, oneOtherItem );

              if( bestMatches.length < topCount ) {
                bestMatches.push( {
                  "item": oneOtherItem,
                  "jccrdIdx": oneDistance
                });
                bestMatches.sort(function(a,b){
                  return a.jccrdIdx - b.jccrdIdx;
                });

              } else if( oneDistance > bestMatches[0].jccrdIdx ) {
                bestMatches[0] = {
                  "item": oneOtherItem,
                  "jccrdIdx": oneDistance
                };
                bestMatches.sort(function(a,b){
                  return a.jccrdIdx - b.jccrdIdx;
                });
              }

            }
          });
          return bestMatches;
        }

        return {
          getClosestMediaItemToOneMediaItem: getClosestMediaItemToOneMediaItem
        }
      }])


     .factory('messageList', ['fbutil', function(fbutil) {
       return fbutil.syncArray('messages', {limit: 10, endAt: null});
     }]);

})();
