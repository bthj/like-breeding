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

        return {
          addNetworkUser: addNetworkUser,
          getAllNetworkUserHandles: getAllNetworkUserHandles,
          getUserHandlesForNetwork: getUserHandlesForNetwork
        }
      })

      .factory('mediaItemHarvester', ['$http', function($http){
        // TODO: env config!
        var tumblrAPIkey = "Djl1CTqPhHhlCsDP9PKcvXptI4jSMmr6QbObhcDVRt4RhTTTdi"
        var tumblrBeforeUser = "http://api.tumblr.com/v2/blog/";
        var tumblrAfterUser = ".tumblr.com";
        var tumblrPosts = "/posts/photo";
        var tumblrLikes = "/likes";
        var tumblrBeforeApiKey = "?api_key="
        var tumblrAfterApiKey = "&callback=JSON_CALLBACK";

        var limit = 20;
        var waitTimeBetweenRequests = 1000;


        function getMediaItemsFromTumblrAccount( username, mediaItems ) {

          getPostsFromTumblrAccount( username, mediaItems, 0 );

          getLikesFromTumblrAccount( username, mediaItems, 0 )
        }

        function getLikesFromTumblrAccount( username, mediaItems, offset ) {

          $http.jsonp(
            tumblrBeforeUser
            +username
            +tumblrAfterUser
            +tumblrLikes
            +tumblrBeforeApiKey
            +tumblrAPIkey
            +tumblrAfterApiKey )
            .success(function(data) {

              console.log( data.response );
              data.response.liked_posts.forEach(function(post, index, array){

                if( post.type == "photo" && post.tags.length ) {

                  var oneMediaItem = {
                    "type": post.type,
                    "mediaUrl": post.photos[0].alt_sizes[0].url, //0 works alright as an index
                    "tags": post.tags,
                    "sourceUrl": post.post_url
                  };
                  mediaItems.push( oneMediaItem );
                }
              });
              initiateNextPageRequest(
                data.response.liked_count, offset, username, mediaItems, getLikesFromTumblrAccount );
          });
        }

        function getPostsFromTumblrAccount( username, mediaItems, offset ) {

          $http.jsonp(
            tumblrBeforeUser
            +username
            +tumblrAfterUser
            +tumblrPosts
            +tumblrBeforeApiKey
            +tumblrAPIkey
            +tumblrAfterApiKey )
            .success(function(data) {

              console.log( data.response );
              data.response.posts.forEach(function(post, index, array){

                if( post.type == "photo" && post.tags.length ) {

                  var oneMediaItem = {
                    "type": post.type,
                    "mediaUrl": post.photos[0].alt_sizes[0].url, //0 works alright as an index
                    "tags": post.tags,
                    "sourceUrl": post.post_url
                  };
                  mediaItems.push( oneMediaItem );
                }
              });
              initiateNextPageRequest(
                data.response.total_posts, offset, username, mediaItems, getPostsFromTumblrAccount );
          });

        }

        function initiateNextPageRequest(
          totalItems, currentOffset, username, mediaItems, callback ) {

          var newOffset = currentOffset + limit;

          console.log("newOffset: " + newOffset + ", totalItems: " + totalItems + ", for: " + callback.name);

          if( newOffset < totalItems ) {

            setTimeout( function(){

              callback( username, mediaItems, newOffset );

            }, waitTimeBetweenRequests);
          } else {
            console.log( "Finished paging through " + callback.name +
              " and the current total of harvested media items is: " + mediaItems.length );
          }
        }

        return {
          getMediaItemsFromTumblrAccount: getMediaItemsFromTumblrAccount
        }
      }])

     .factory('messageList', ['fbutil', function(fbutil) {
       return fbutil.syncArray('messages', {limit: 10, endAt: null});
     }]);

})();
