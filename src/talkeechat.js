require('./vendors.js');

import $ from 'jquery';
window.jQuery = $;
window.$ = $;

(function ($) {
    "use strict";

    function TalkeeIM(firebaseRef, options) {
        this.DbRef = firebaseRef;
        this._options = options || {};
        this._currentUser = null;
        this._currentPortal = null;
        this._currentChannel = null;
        this.attachEventHandlers();
        this.initFirebaseAuth();
    }

    TalkeeIM.prototype.seCurrentUser = function(userData) {
        var self = this;
        self._currentUser = userData;        
    }

    TalkeeIM.prototype.signIn = function() {
        // Sign in Firebase using popup auth and Google as the identity provider.
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider);
    }

    TalkeeIM.prototype.signOut = function() {
        // Sign out of Firebase.    
        firebase.auth().signOut();
    }

    TalkeeIM.prototype.initFirebaseAuth = function() {
        var self = this;
        // Listen to auth state changes.
        firebase.auth().onAuthStateChanged(self.authStateObserver);
    }

    TalkeeIM.prototype.authStateObserver = function(user) {
        if (user) { // User is signed in!      
            console.log('user just signed in',user)      
            //onUserUpdate();
            // register users if not 
            /* saveUserInfo(function(usertype){
              if(usertype == 'newuser'){
              var userInfo = firebase.auth().currentUser;
              // console.log(userInfo);   
              // console.log(userInfo.displayName);   
              // console.log(userInfo.uid);   
              var userId = userInfo.uid;   
              console.log('new user data adding...')
              var data = {
                name: userInfo.displayName,
                avatar: userInfo.photoURL,
                status: 'online',
                onPage: 2, // on join portal page
                activePortalId: '',
                createdAt: Date.now()
              };
              firebase.database().ref('/users/' + userId).set(data).then(function(){
                showPage();
              }).catch(function(error) {
                console.error('Error writing new message to Firebase Database', error);  
                // 
              });
              }
              else{
                showPage();
              }
    
            }); */
    
        } else { // User is signed out!    
            //$('#page-portal_select').hide();
            console.log('user not signed in');

            $('.page-dahsboard').hide();        
            $('#regsteps').show();
            $('.page').hide();
            $('#page-login').show();
        }
    }

    TalkeeIM.prototype.attachEventHandlers = function() {
        var self = this;
        $(document).on('click', '#sign-out', function(event){
            resetActivePortal(function(){
              signOut();
              console.log('sign out ')
            })            
        });

        $(document).on('click', '#sign-in-withgoogle', function(event){
            self.signIn();           
        });
    }





    var config = {
        apiKey: "AIzaSyBneVFGGxyB8oo_sdYDOdEgLsyxAzgX9Nk",
        authDomain: "talkee-d4100.firebaseapp.com",
        databaseURL: "https://talkee-d4100.firebaseio.com",
        projectId: "talkee-d4100",
        storageBucket: "talkee-d4100.appspot.com",
        messagingSenderId: "708610098712"
      };
    firebase.initializeApp(config);
    
    var fireBaseRef = firebase.database().ref(); 

    talkeeApp = new TalkeeIM(fireBaseRef,{});

})();