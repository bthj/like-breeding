'use strict';

/* Controllers */

angular.module('myApp.controllers', ['firebase.utils', 'simpleLogin'])

  .controller('SocialNetworkRegCtrl',
      ['$scope', '$http', '$location', 'networkUserHandles', 'NETNAME',
      function($scope, $http, $location, networkUserHandles, NETNAME){

    $scope.formData = {};  // as recommended in http://stackoverflow.com/a/22768720/169858
    $scope.saveUserHandles = function() {

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

      $location.path( "/breeding" );
    }
  }])

  .controller('LikeBreeding',
      ['$scope', '$http', 'networkUserHandles', 'mediaItemHarvester', 'NETNAME',
      function($scope, $http, networkUserHandles, mediaItemHarvester, NETNAME){
    $scope.allMediaItems = [];
    $scope.selectedMediaItems = [];

    var totalVisibleItems = 4;

    $scope.selectRandomItems = function( numberOfItems ) {
	  var combinedTags = {};
      $scope.selectedMediaItems = [];
      var usedIndexes = [];
      for( var i=0; i < numberOfItems; i++ ) {
        var oneItemIndex;
        do {
          oneItemIndex = randomFromInterval( 0, $scope.allMediaItems.length-1 );
        } while( usedIndexes.indexOf(oneItemIndex) > -1); // || $scope.allMediaItems[oneItemIndex].tags.length==0
        usedIndexes.push( oneItemIndex );

        $scope.selectedMediaItems.push( $scope.allMediaItems[oneItemIndex] );


    		for(var j=0; j < $scope.allMediaItems[oneItemIndex].tags.length; j++)
    		{
    			if(!combinedTags.hasOwnProperty($scope.allMediaItems[oneItemIndex].tags[j]))
    				combinedTags[$scope.allMediaItems[oneItemIndex].tags[j]]=1;
    			else
    				combinedTags[$scope.allMediaItems[oneItemIndex].tags[j]]+=1;
    		}
      }
      console.log(combinedTags);
    }

    networkUserHandles.getAllNetworkUserHandles().forEach(function(handle, index, array){
      // console.log( handle.network + ': ' + handle.user );

      if( handle.network == NETNAME.TUMBLR ) {

        mediaItemHarvester.getMediaItemsFromTumblrAccount(handle.user, $scope.allMediaItems);
      }
    });

    // when items come in from an api call, we want to make selection to display
    $scope.$watchCollection( "allMediaItems", function( newValue, oldValue ){

      if( newValue.length > totalVisibleItems && $scope.selectedMediaItems.length < totalVisibleItems ) {
        // from this $watchCollection thing, we'll only once call selectRandomItems
        // when the above critera is met.
        $scope.selectRandomItems(
          newValue.length >= totalVisibleItems ? totalVisibleItems : newValue.length );
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
