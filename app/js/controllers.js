'use strict';

/* Controllers */

angular.module('myApp.controllers', ['firebase.utils', 'simpleLogin'])

  .controller('SocialNetworkRegCtrl',
      ['$scope', '$http', '$location', 'networkUserHandles', 'localStorageManager', 'NETNAME',
      function($scope, $http, $location, networkUserHandles, localStorageManager, NETNAME){


    $scope.formData = {};  // as recommended in http://stackoverflow.com/a/22768720/169858
    populateUserHandlesFormData();


    function getUserHandleArraysFromSets( userHandles ) {
      var tumblrHandles = [];
      var weHeartItHandles = [];
      var soundCloudHandles = [];
      userHandles.forEach(function( oneHandleEntry, index, array ){
        switch( oneHandleEntry.network ) {
          case NETNAME.TUMBLR:
            tumblrHandles.push( oneHandleEntry.user );
            break;
          case NETNAME.WEHEARTIT:
            weHeartItHandles.push( oneHandleEntry.user );
            break;
          case NETNAME.SOUNDCLOUD:
            soundCloudHandles.push( oneHandleEntry.user );
            break;
        }
      });
      return {
        "tumblr": tumblrHandles,
        "weHeartIt": weHeartItHandles,
        "soundCloud": soundCloudHandles
      }
    }

    function populateUserHandlesFormData() {
      var userHandles = localStorageManager.getSavedNeworkUserHandles();
      // var userHandles = networkUserHandles.getAllNetworkUserHandles();

      if( userHandles && userHandles.length ) {

        var handles = getUserHandleArraysFromSets( userHandles );

        $scope.formData.tumblr = handles["tumblr"].join( ", " );
        $scope.formData.weheartit = handles["weHeartIt"].join( ", " );
        $scope.formData.soundcloud = handles["soundCloud"].join( ", " );
      } else {
        $scope.formData.tumblr = "";
        $scope.formData.weheartit = "";
        $scope.formData.soundcloud = "";
      }
    }

    function areNetworkHandleSetsEqual( handleSet1, handleSet2 ) {
      if( handleSet1 && handleSet2 ) {
        var handles1 = getUserHandleArraysFromSets( handleSet1 );
        var handles2 = getUserHandleArraysFromSets( handleSet2 );
        return areScalarValueArraysEqual( handles1["tumblr"], handles2["tumblr"] )
                && areScalarValueArraysEqual( handles1["weHeartIt"], handles2["weHeartIt"] )
                && areScalarValueArraysEqual( handles1["soundCloud"], handles2["soundCloud"] );
      } else {
        // returning false here is strictly not correct, both could be undefined,
        // but then we want to start from scratch anyway.
        return false;
      }

    }

    function areScalarValueArraysEqual( a1, a2 ) {
      // based on http://stackoverflow.com/a/19746771/169858
      // (http://stackoverflow.com/a/22395463/169858)
      a1.sort();
      a2.sort();
      return a1.length==a2.length && a1.every(function(v,i) { return v === a2[i]});
    }


    $scope.saveUserHandles = function() {

      networkUserHandles.clear();

      if( $scope.formData.tumblr ) {
        $scope.formData.tumblr.split(",").forEach(function(name, index, array){
          networkUserHandles.addNetworkUser( NETNAME.TUMBLR, name.trim() );
        });
      }

      if( $scope.formData.weheartit ) {
        $scope.formData.weheartit.split(",").forEach(function(name, index, array){
          networkUserHandles.addNetworkUser( NETNAME.WEHEARTIT, name.trim() );
        });
      }

      if( $scope.formData.soundcloud ) {
        $scope.formData.soundcloud.split(",").forEach(function(name, index, array){
          networkUserHandles.addNetworkUser( NETNAME.SOUNDCLOUD, name.trim() );
        });
      }

      if( ! areNetworkHandleSetsEqual(
            networkUserHandles.getAllNetworkUserHandles(),
            localStorageManager.getSavedNeworkUserHandles() ) ) {

        // localStorageManager.clearAllSavedMediaItems();
      }

      localStorageManager.saveNetworkUserHandles(
        networkUserHandles.getAllNetworkUserHandles() );

      $location.path( "/breeding" );
    }

    $scope.clearSavedData = function() {
      localStorageManager.clearAllSavedMediaItems();
      localStorageManager.clearSavedNetworkUserHandles();
      populateUserHandlesFormData();
    }

  }])



  .controller('LikeBreeding',
      ['$scope', '$http', 'networkUserHandles', 'mediaItemHarvester', 'localStorageManager', 'similaritySearch', 'NETNAME',
      function($scope, $http, networkUserHandles, mediaItemHarvester, localStorageManager, similaritySearch, NETNAME){

    $scope.allMediaItems = Object.keys(localStorageManager.getAllSavedMediaItems()).length > 0 ?
                            localStorageManager.getAllSavedMediaItems() : {};
    $scope.selectedMediaItems = [];
    $scope.totalVisibleItems = 4;

    $scope.rollDisabled = true;
    $scope.saveDisabled = true;

    var usedIndexes = [];

    $scope.selectRandomItems = function( numberOfItems ) {
	    var combinedTags = {};
      // TODO: DELETE $scope.selectedMediaItems = [];
      // console.log("Object.keys($scope.allMediaItems).length: " + Object.keys($scope.allMediaItems).length);

      // let's set indexes (into allMediaItems) to -1 for all items that are not held
      for( var i=0; i < numberOfItems; i++ ) {
        if( usedIndexes[i] !== undefined ) {
          if( $scope.selectedMediaItems[i] &&
            (!$scope.selectedMediaItems[i].held && !$scope.selectedMediaItems[i].similar) ) {
              usedIndexes[i] = -1;
          }
        } else {
          usedIndexes.push( -1 );
        }
      }

      // collect those indexes (into allMediaItems) that are held, for use in Explore / Exploit
      var heldIndexes = [];
      usedIndexes.forEach( function(idxValue){
        if( idxValue > -1 ) heldIndexes.push( idxValue );
      });
      console.log( "heldIndexes" );
      console.log( heldIndexes );

      $scope.selectedMediaItems = [];
      for( var i=0; i < numberOfItems; i++ ) {

        if( usedIndexes[i] > -1 ) {

          $scope.selectedMediaItems.push(
            $scope.allMediaItems[ Object.keys($scope.allMediaItems)[usedIndexes[i]] ] );

            if( $scope.selectedMediaItems[i].similar ) {
              // so, we want to replace the semi-held item we have, with something similar:

              var bestSimilarMatches = similaritySearch.getClosestMediaItemToOneMediaItem(
                $scope.selectedMediaItems[i],
                $scope.allMediaItems,
                {},
                5
              );

              console.log( bestSimilarMatches );

              delete $scope.selectedMediaItems[i].similar;

              var bestSimilarIndex;
              var oneSimilarItem;
              // check for duplicates
              do {
                bestSimilarIndex = randomFromInterval(0, bestSimilarMatches.length-1);
                oneSimilarItem = bestSimilarMatches[bestSimilarIndex].item;
              } while( $scope.selectedMediaItems.indexOf(oneSimilarItem) > -1 );

              // let's do the deed of replacing the semi-held item, with one (hopefully) similar
              $scope.selectedMediaItems[i] = oneSimilarItem;
              usedIndexes[i] = Object.keys($scope.allMediaItems).indexOf(oneSimilarItem.sourceUrl);
            }

        } else if( usedIndexes[i] == -1 ) {

          // Explore / Exploit

          /*
          50% chance of doing random (if nothing is held, 100% chance)
          50% chance of:
            similaritySearch.getClosestMediaItemToOneMediaItem
              for each held image, get an array of similar images,
                combine those arrays and choose the closest (highest) Jaccard index
                or select semi-randomly (weighted) from the elements in the arrays.
          */

          if( heldIndexes.length === 0 || Math.random() > 0.5 ) {
            console.log( "DOING RANDOM THINGS" );

            // let's pick something randomly
            var oneItemIndex;
            do {
              oneItemIndex = randomFromInterval( 0, Object.keys($scope.allMediaItems).length-1 );
            } while( usedIndexes.indexOf(oneItemIndex) > -1);

            usedIndexes[i] = oneItemIndex;

            var oneItem = $scope.allMediaItems[Object.keys($scope.allMediaItems)[oneItemIndex]];

            $scope.selectedMediaItems.push( oneItem );


          } else {
            // let's get closest media items to those held, and pick one of those
            console.log( "DOING A SIMILARITY SEARCH" );

            var bestSimilarMatchesCollection = [];
            heldIndexes.forEach(function( oneHeldIndex ) {
              var oneHeldItem = $scope.allMediaItems[ Object.keys($scope.allMediaItems)[oneHeldIndex] ];

              // let's exclude other held items from coming in as similar matches
              var otherHeldItems = {};
              heldIndexes.forEach(function( oneOtherHeldIndex ) {
                if( oneHeldIndex !== oneOtherHeldIndex ) {
                  var oneOtherHeldItemKey = Object.keys($scope.allMediaItems)[oneOtherHeldIndex];
                  var oneOtherHeldItem = $scope.allMediaItems[ oneOtherHeldItemKey ];
                  otherHeldItems[ oneOtherHeldItemKey ] = oneOtherHeldItem;
                }
              });
              // and now get similar matches for the held item considered in this iteration
              var bestSimilarMatchesForOneItem = similaritySearch.getClosestMediaItemToOneMediaItem(
                oneHeldItem,
                $scope.allMediaItems,
                otherHeldItems,
                5
              );
              bestSimilarMatchesCollection.push( bestSimilarMatchesForOneItem );
            });

            // assemble all similar items found for all held items
            var bestSimilarMatches;
            if( bestSimilarMatchesCollection.length > 1 ) {

              bestSimilarMatches = [].concat.apply([], bestSimilarMatchesCollection);

            } else { // we should have exactly one array item (which is an array btw)

              bestSimilarMatches = bestSimilarMatchesCollection[0];
            }
            bestSimilarMatches.sort(function(a,b){
              return a.jccrdIdx - b.jccrdIdx;
            });


            // let's just select the closest match for now...
            // ...that is, the closest match that is not already in $scope.selectedMediaItems
            // TODO: we might want to do something more stochastic,
            //  maybe weighted towards the closer matches.

            var bestSimilarIndex = bestSimilarMatches.length;
            var oneSimilarItem;
            // check for duplicates
            do {
              bestSimilarIndex -= 1;
              oneSimilarItem = bestSimilarMatches[bestSimilarIndex].item;
            } while( $scope.selectedMediaItems.indexOf(oneSimilarItem) > -1 );

            $scope.selectedMediaItems.push( oneSimilarItem );
          }

          if( $scope.selectedMediaItems.length == $scope.totalVisibleItems ) {
            $scope.rollDisabled = false;
            $scope.saveDisabled = false;
          }

        }

    		// for(var j=0; j < oneItem.tags.length; j++)
    		// {
    		// 	if(!combinedTags.hasOwnProperty(oneItem.tags[j]))
    		// 		combinedTags[oneItem.tags[j]]=1;
    		// 	else
    		// 		combinedTags[oneItem.tags[j]]+=1;
    		// }
      }
//      console.log(combinedTags);
    }

    networkUserHandles.getAllNetworkUserHandles().forEach(function(handle, index, array){
      // console.log( handle.network + ': ' + handle.user );

      if( handle.network == NETNAME.TUMBLR ) {

        mediaItemHarvester.getMediaItemsFromTumblrAccount(handle, $scope.allMediaItems);
      }
    });

    // when items come in from an api call, we want to make selection to display
    $scope.$watchCollection( "allMediaItems", function( newValue, oldValue ) {
      var newValuePropCount = Object.keys(newValue).length;

      if( newValuePropCount > $scope.totalVisibleItems &&
            $scope.selectedMediaItems.length < $scope.totalVisibleItems ) {
        // from this $watchCollection thing, we'll only *once* call selectRandomItems
        // when the above critera is met.
        $scope.selectRandomItems(
          newValuePropCount >= $scope.totalVisibleItems ? $scope.totalVisibleItems : newValuePropCount );
      }
    });

    // TODO: in a utility service?
    function randomFromInterval(from,to) {
        return Math.floor(Math.random()*(to-from+1)+from);
    }
  }])



  // Defualt example controllers - ToDelete :P

  .controller('HomeCtrl', ['$scope', 'fbutil', 'user', 'FBURL', function($scope, fbutil, user, FBURL) {
    $scope.syncedValue = fbutil.syncObject('syncedValue');
    $scope.user = user;
    $scope.FBURL = FBURL;
  }])

  .controller('ChatCtrl', ['$scope', 'messageList', function($scope, messageList) {
    $scope.messages = messageList;
    $scope.addMessage = function(newMessage) {
      if( newMessage ) {
        $scope.messages.$add({text: newMessage});
      }
    };
  }])

  .controller('LoginCtrl', ['$scope', 'simpleLogin', '$location', function($scope, simpleLogin, $location) {
    $scope.email = null;
    $scope.pass = null;
    $scope.confirm = null;
    $scope.createMode = false;

    $scope.login = function(email, pass) {
      $scope.err = null;
      simpleLogin.login(email, pass)
        .then(function(/* user */) {
          $location.path('/account');
        }, function(err) {
          $scope.err = errMessage(err);
        });
    };

    $scope.createAccount = function() {
      $scope.err = null;
      if( assertValidAccountProps() ) {
        simpleLogin.createAccount($scope.email, $scope.pass)
          .then(function(/* user */) {
            $location.path('/account');
          }, function(err) {
            $scope.err = errMessage(err);
          });
      }
    };

    function assertValidAccountProps() {
      if( !$scope.email ) {
        $scope.err = 'Please enter an email address';
      }
      else if( !$scope.pass || !$scope.confirm ) {
        $scope.err = 'Please enter a password';
      }
      else if( $scope.createMode && $scope.pass !== $scope.confirm ) {
        $scope.err = 'Passwords do not match';
      }
      return !$scope.err;
    }

    function errMessage(err) {
      return angular.isObject(err) && err.code? err.code : err + '';
    }
  }])

  .controller('AccountCtrl', ['$scope', 'simpleLogin', 'fbutil', 'user', '$location',
    function($scope, simpleLogin, fbutil, user, $location) {
      // create a 3-way binding with the user profile object in Firebase
      var profile = fbutil.syncObject(['users', user.uid]);
      profile.$bindTo($scope, 'profile');

      // expose logout function to scope
      $scope.logout = function() {
        profile.$destroy();
        simpleLogin.logout();
        $location.path('/login');
      };

      $scope.changePassword = function(pass, confirm, newPass) {
        resetMessages();
        if( !pass || !confirm || !newPass ) {
          $scope.err = 'Please fill in all password fields';
        }
        else if( newPass !== confirm ) {
          $scope.err = 'New pass and confirm do not match';
        }
        else {
          simpleLogin.changePassword(profile.email, pass, newPass)
            .then(function() {
              $scope.msg = 'Password changed';
            }, function(err) {
              $scope.err = err;
            })
        }
      };

      $scope.clear = resetMessages;

      $scope.changeEmail = function(pass, newEmail) {
        resetMessages();
        profile.$destroy();
        simpleLogin.changeEmail(pass, newEmail)
          .then(function(user) {
            profile = fbutil.syncObject(['users', user.uid]);
            profile.$bindTo($scope, 'profile');
            $scope.emailmsg = 'Email changed';
          }, function(err) {
            $scope.emailerr = err;
          });
      };

      function resetMessages() {
        $scope.err = null;
        $scope.msg = null;
        $scope.emailerr = null;
        $scope.emailmsg = null;
      }
    }
  ]);
